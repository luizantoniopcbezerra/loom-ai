<script setup>
import { computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import LoomLogo from './LoomLogo.vue'

const props = defineProps({
  screen: { type: String, default: 'workspace' },
  expanded: { type: Boolean, default: true },
  theme: { type: String, default: 'dark' },
  user: { type: Object, default: null },
  workspacePath: { type: String, default: '' },
})

const emit = defineEmits(['screen-change', 'toggle', 'palette', 'toggle-theme', 'open-profile', 'workspace-change'])

const editingWorkspace = ref(false)
const workspaceInput = ref('')

function startEditing() {
  workspaceInput.value = props.workspacePath || ''
  editingWorkspace.value = true
}

function commitWorkspace() {
  editingWorkspace.value = false
  const path = workspaceInput.value.trim()
  if (path !== props.workspacePath) emit('workspace-change', path)
}

function cancelWorkspace(e) {
  if (e.key === 'Escape') {
    editingWorkspace.value = false
  }
}

const workspaceName = computed(() => {
  if (!props.workspacePath) return null
  const parts = props.workspacePath.replace(/\/+$/, '').split('/')
  return parts[parts.length - 1] || props.workspacePath
})

const NAV_ITEMS = [
  { id: 'workspace',   icon: 'chat',     label: 'Chats' },
  { id: 'agents',      icon: 'agent',    label: 'Agents' },
  { id: 'workflow',    icon: 'workflow', label: 'Workflows' },
  { id: 'terminal',    icon: 'terminal', label: 'Terminal' },
  { id: 'multiagent',  icon: 'users',    label: 'Multi-Agent' },
]

const sidebarStyle = computed(() => ({
  width: props.expanded ? 'var(--sidebar-w)' : '56px',
  minWidth: props.expanded ? 'var(--sidebar-w)' : '56px',
  overflow: 'hidden',
  transition: 'width 0.22s ease, min-width 0.22s ease',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: 'var(--surface)',
  borderRight: '1px solid var(--border)',
  flexShrink: 0,
}))

function navBtnStyle(isActive) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: props.expanded ? '10px' : '0',
    justifyContent: props.expanded ? 'flex-start' : 'center',
    padding: props.expanded ? '8px 12px' : '8px 0',
    width: '100%',
    background: isActive ? 'var(--blue-dim)' : 'transparent',
    color: isActive ? 'var(--blue)' : 'var(--text-2)',
    border: 'none',
    borderRadius: 'var(--r)',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'var(--font)',
    position: 'relative',
    transition: 'background 0.15s, color 0.15s',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  }
}

const userInitial = computed(() => {
  if (!props.user?.username) return '?'
  return props.user.username[0].toUpperCase()
})

const userColor = computed(() => props.user?.color || 'var(--blue)')
const nextTheme = computed(() => props.theme === 'dark' ? 'light' : 'dark')
const themeToggleLabel = computed(() => nextTheme.value === 'light' ? 'Light mode' : 'Dark mode')
const themeToggleIcon = computed(() => nextTheme.value === 'light' ? 'sun' : 'moon')
</script>

<template>
  <aside :style="sidebarStyle">
    <!-- Header -->
    <div
      :style="{
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        padding: expanded ? '0 12px' : '0',
        justifyContent: expanded ? 'flex-start' : 'center',
        borderBottom: '1px solid var(--border)',
        gap: '8px',
        flexShrink: 0,
        cursor: 'pointer',
        overflow: 'hidden',
      }"
      @click="emit('toggle')"
    >
      <LoomLogo :size="22" />
      <template v-if="expanded">
        <span :style="{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '14px', color: 'var(--text)', letterSpacing: '-0.02em', flexShrink: 0 }">Loom</span>
        <span :style="{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.04em', flexShrink: 0 }">local AI</span>
        <span :style="{ flex: 1 }" />
        <AppIcon name="chevron-left" :size="14" color="var(--text-3)" />
      </template>
    </div>

    <!-- Body -->
    <div
      :style="{
        flex: 1,
        overflowY: 'auto',
        padding: expanded ? '12px 8px 8px' : '12px 8px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }"
    >
      <!-- Search / Command Palette -->
      <button
        :style="{
          display: 'flex',
          alignItems: 'center',
          gap: expanded ? '8px' : '0',
          justifyContent: expanded ? 'flex-start' : 'center',
          padding: expanded ? '7px 10px' : '7px 0',
          width: '100%',
          background: 'var(--surface-2)',
          color: 'var(--text-3)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'var(--font)',
          marginBottom: '6px',
          transition: 'background 0.15s, border-color 0.15s',
        }"
        @click="emit('palette')"
      >
        <AppIcon name="search" :size="13" color="var(--text-3)" />
        <span v-if="expanded" :style="{ flex: 1, textAlign: 'left' }">Search...</span>
        <span v-if="expanded" :style="{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-3)' }">⌘K</span>
      </button>

      <!-- Workspace picker -->
      <div
        :style="{
          display: 'flex', alignItems: 'center',
          gap: expanded ? '7px' : '0',
          justifyContent: expanded ? 'flex-start' : 'center',
          padding: expanded ? '5px 10px' : '5px 0',
          marginBottom: '6px',
          borderRadius: 'var(--r)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          minWidth: 0,
        }"
      >
        <AppIcon name="folder" :size="13" :color="workspaceName ? 'var(--blue)' : 'var(--text-3)'" style="flex-shrink:0" />
        <template v-if="expanded">
          <input
            v-if="editingWorkspace"
            v-model="workspaceInput"
            @blur="commitWorkspace"
            @keydown.enter="commitWorkspace"
            @keydown="cancelWorkspace"
            placeholder="/caminho/do/projeto"
            autofocus
            :style="{
              flex: 1, minWidth: 0,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: '11px', fontFamily: 'var(--mono)',
            }"
          />
          <template v-else>
            <span
              :style="{
                flex: 1, minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: '11px', fontFamily: 'var(--mono)',
                color: workspaceName ? 'var(--text-2)' : 'var(--text-3)',
                cursor: 'default',
              }"
              :title="workspacePath || undefined"
            >{{ workspaceName || 'definir workspace' }}</span>
            <button
              :style="{
                background: 'transparent', border: 'none', padding: '0 2px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0,
              }"
              @click.stop="startEditing"
              title="Alterar workspace"
            >
              <AppIcon name="edit" :size="11" color="var(--text-3)" />
            </button>
          </template>
        </template>
        <template v-else>
          <button
            :style="{ background:'transparent', border:'none', padding:0, cursor:'pointer', display:'flex' }"
            @click.stop="startEditing"
            title="Alterar workspace"
          >
            <AppIcon name="edit" :size="11" color="var(--text-3)" />
          </button>
        </template>
      </div>

      <!-- Nav items -->
      <div style="position:relative" v-for="item in NAV_ITEMS" :key="item.id">
        <!-- Active left accent bar -->
        <div
          v-if="screen === item.id"
          :style="{
            position: 'absolute',
            left: 0,
            top: '4px',
            bottom: '4px',
            width: '2.5px',
            background: 'var(--blue)',
            borderRadius: '0 2px 2px 0',
          }"
        />
        <button
          :style="navBtnStyle(screen === item.id)"
          @click="emit('screen-change', item.id)"
        >
          <AppIcon :name="item.icon" :size="15" :color="screen === item.id ? 'var(--blue)' : 'var(--text-3)'" />
          <span v-if="expanded">{{ item.label }}</span>
        </button>
      </div>
    </div>

    <!-- Bottom -->
    <div
      :style="{
        borderTop: '1px solid var(--border)',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }"
    >
      <!-- Theme toggle -->
      <button
        :title="`Switch to ${nextTheme} mode`"
        :aria-label="`Switch to ${nextTheme} mode`"
        :style="{
          display: 'flex',
          alignItems: 'center',
          gap: expanded ? '10px' : '0',
          justifyContent: expanded ? 'flex-start' : 'center',
          padding: expanded ? '7px 10px' : '7px 0',
          width: '100%',
          background: 'transparent',
          color: 'var(--text-2)',
          border: 'none',
          borderRadius: 'var(--r)',
          cursor: 'pointer',
          fontSize: '13px',
          fontFamily: 'var(--font)',
          transition: 'background 0.15s',
        }"
        @click="emit('toggle-theme')"
      >
        <AppIcon :name="themeToggleIcon" :size="14" color="var(--text-3)" />
        <span v-if="expanded" :style="{ color: 'var(--text-2)' }">{{ themeToggleLabel }}</span>
      </button>

      <!-- Profile -->
      <button
        :style="{
          display: 'flex',
          alignItems: 'center',
          gap: expanded ? '9px' : '0',
          justifyContent: expanded ? 'flex-start' : 'center',
          padding: expanded ? '6px 10px' : '6px 0',
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--r)',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }"
        @click="emit('open-profile')"
      >
        <div
          :style="{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: userColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#000',
            flexShrink: 0,
          }"
        >{{ userInitial }}</div>
        <span v-if="expanded" :style="{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }">
          {{ user?.username || 'User' }}
        </span>
      </button>
    </div>
  </aside>
</template>
