<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTweaks } from './composables/useTweaks.js'
import { api } from './lib/api.js'
import AppSidebar from './components/AppSidebar.vue'
import OnboardingScreen from './components/OnboardingScreen.vue'
import WorkspaceScreen from './components/WorkspaceScreen.vue'
import WorkflowBuilderScreen from './components/WorkflowBuilderScreen.vue'
import AgentManagerScreen from './components/AgentManagerScreen.vue'
import TerminalScreen from './components/TerminalScreen.vue'
import MultiAgentScreen from './components/MultiAgentScreen.vue'
import CommandPalette from './components/CommandPalette.vue'
import ProfileModal from './components/ProfileModal.vue'
import TweaksPanel from './components/TweaksPanel.vue'

const TWEAK_DEFAULTS = {
  accentColor: '#00b8d4',
  sidebarExpanded: true,
}

const { tweaks, setTweak } = useTweaks(TWEAK_DEFAULTS)

const booting = ref(true)
const onboarding = ref(false)
const user = ref(null)
const profileOpen = ref(false)
const screen = ref('workspace')
const paletteOpen = ref(false)
const theme = ref('dark')
const workspacePath = ref('')
const THEME_VARS = {
  dark: {
    bg: '#000000',
    surface: '#0a0a0a',
    surface2: '#111111',
    surface3: '#181818',
    border: '#1a1a1a',
    border2: '#2a2a2a',
    text: '#ededed',
    text2: '#737373',
    text3: '#404040',
    colorScheme: 'dark',
  },
  light: {
    bg: '#f5f5f5',
    surface: '#ffffff',
    surface2: '#f0f0f0',
    surface3: '#e6e6e6',
    border: '#e5e5e5',
    border2: '#d4d4d4',
    text: '#0a0a0a',
    text2: '#525252',
    text3: '#a3a3a3',
    colorScheme: 'light',
  },
}

const expanded = computed(() => tweaks.sidebarExpanded !== false)

// ⌘K handler
function onKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); paletteOpen.value = !paletteOpen.value }
  if (e.key === 'Escape') paletteOpen.value = false
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.__forgeNavigate = (s) => { screen.value = s }
  window.__forgeUseAgent = (agentId, model) => {
    window.__forgeNextAgentSelection = { agentId, model }
  }
  initializeApp()
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  delete window.__forgeNavigate
  delete window.__forgeUseAgent
  delete window.__forgeNextAgentSelection
})

// Apply theme + accent CSS vars
const accentStyleEl = ref(null)
watch([() => tweaks.accentColor, theme], () => {
  if (!accentStyleEl.value) {
    accentStyleEl.value = document.createElement('style')
    accentStyleEl.value.id = 'app-accent'
    document.head.appendChild(accentStyleEl.value)
  }
  const c = tweaks.accentColor || '#00b8d4'
  const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16)
  const activeTheme = THEME_VARS[theme.value] || THEME_VARS.dark
  document.documentElement.dataset.theme = theme.value
  document.documentElement.style.colorScheme = activeTheme.colorScheme
  accentStyleEl.value.textContent = `:root{
    --bg:${activeTheme.bg};
    --surface:${activeTheme.surface};
    --surface-2:${activeTheme.surface2};
    --surface-3:${activeTheme.surface3};
    --border:${activeTheme.border};
    --border-2:${activeTheme.border2};
    --text:${activeTheme.text};
    --text-2:${activeTheme.text2};
    --text-3:${activeTheme.text3};
    --blue:${c};
    --blue-dim:rgba(${r},${g},${b},0.12);
    --blue-glow:rgba(${r},${g},${b},0.30);
  }`
}, { immediate: true })

async function initializeApp() {
  try {
    const [profile, settings] = await Promise.all([
      api.getProfile(),
      api.getSettings(),
    ])

    if (profile) {
      user.value = profile
      onboarding.value = false
    } else {
      onboarding.value = true
    }

    if (settings?.accentColor) {
      setTweak('accentColor', settings.accentColor)
    }
    if (typeof settings?.sidebarExpanded === 'boolean') {
      setTweak('sidebarExpanded', settings.sidebarExpanded)
    }
    if (settings?.theme) {
      theme.value = settings.theme
    }
    if (settings?.workspacePath) {
      workspacePath.value = settings.workspacePath
    }
  } finally {
    booting.value = false
  }
}

async function handleComplete(data) {
  const profile = await api.saveProfile({
    username: data.username,
    color: data.color || 'var(--blue)',
  })
  user.value = profile
  onboarding.value = false
  await api.saveSettings({
    accentColor: tweaks.accentColor,
    sidebarExpanded: expanded.value,
    theme: theme.value,
  })
}

async function handleProfileSave(data) {
  const profile = await api.saveProfile(data)
  user.value = profile
}

async function handleAccentChange(color) {
  setTweak('accentColor', color)
  await persistSettings()
}

async function handleSidebarToggle() {
  setTweak('sidebarExpanded', !expanded.value)
  await persistSettings()
}

async function handleThemeChange(nextTheme) {
  theme.value = nextTheme
  await persistSettings()
}

async function handleWorkspaceChange(path) {
  workspacePath.value = path
  await persistSettings()
}

async function persistSettings() {
  await api.saveSettings({
    accentColor: tweaks.accentColor,
    sidebarExpanded: expanded.value,
    theme: theme.value,
    workspacePath: workspacePath.value,
  })
}

const ACCENT_OPTIONS = ['#00b8d4', '#d9357a', '#00cc88', '#e6c128']
</script>

<template>
  <div v-if="booting" style="display:flex;align-items:center;justify-content:center;height:100vh;background:var(--bg);color:var(--text-2);font-family:var(--mono);font-size:12px">
    Loading local workspace...
  </div>

  <!-- Onboarding -->
  <OnboardingScreen v-else-if="onboarding" @complete="handleComplete" />

  <!-- Main app -->
  <div v-else style="display:flex;flex-direction:column;height:100vh;overflow:hidden">
    <div style="display:flex;flex:1;overflow:hidden">
      <AppSidebar
        :screen="screen"
        :expanded="expanded"
        :theme="theme"
        :user="user"
        :workspacePath="workspacePath"
        @screen-change="s => screen = s"
        @toggle="handleSidebarToggle"
        @palette="paletteOpen = true"
        @toggle-theme="handleThemeChange(theme === 'dark' ? 'light' : 'dark')"
        @open-profile="profileOpen = true"
        @workspace-change="handleWorkspaceChange"
      />
      <main style="flex:1;overflow:hidden;position:relative">
        <WorkspaceScreen   v-show="screen === 'workspace'" />
        <AgentManagerScreen    v-if="screen === 'agents'" />
        <WorkflowBuilderScreen v-if="screen === 'workflow'" />
        <TerminalScreen    v-if="screen === 'terminal'" :workspacePath="workspacePath" />
        <MultiAgentScreen  v-show="screen === 'multiagent'" :active="screen === 'multiagent'" :initial-workspace-path="workspacePath" />
      </main>
    </div>

    <!-- Modals -->
    <CommandPalette v-if="paletteOpen" @close="paletteOpen = false" @navigate="s => { screen = s; paletteOpen = false }" />
    <ProfileModal v-if="profileOpen" :user="user" @save="handleProfileSave" @close="profileOpen = false" />

    <!-- Tweaks panel -->
    <TweaksPanel>
      <div class="twk-sect">Accent</div>
      <div class="twk-row">
        <div class="twk-lbl"><span>Color</span></div>
        <div class="twk-chips">
          <button v-for="c in ACCENT_OPTIONS" :key="c" class="twk-chip"
            :data-on="tweaks.accentColor === c ? '1' : '0'"
            :style="{ background: c }"
            @click="handleAccentChange(c)" />
        </div>
      </div>
      <div class="twk-sect">Theme</div>
      <div class="twk-row twk-row-h">
        <div class="twk-lbl"><span>Mode</span></div>
        <div class="twk-seg" style="position:relative;flex:1">
          <div class="twk-seg-thumb" :style="{ left: theme === 'dark' ? '2px' : 'calc(50% + 2px)', width: 'calc(50% - 4px)' }" />
          <button @click="handleThemeChange('dark')" :aria-checked="theme === 'dark'" class="twk-seg-btn" :data-on="theme === 'dark' ? '1' : '0'">Dark</button>
          <button @click="handleThemeChange('light')" :aria-checked="theme === 'light'" class="twk-seg-btn" :data-on="theme === 'light' ? '1' : '0'">Light</button>
        </div>
      </div>
      <div class="twk-sect">Sidebar</div>
      <div class="twk-row twk-row-h">
        <div class="twk-lbl"><span>Show labels</span></div>
        <button type="button" class="twk-toggle" :data-on="expanded ? '1' : '0'"
          @click="handleSidebarToggle"><i /></button>
      </div>
      <div class="twk-sect">Navigate</div>
      <div class="twk-row">
        <div class="twk-lbl"><span>Screen</span></div>
        <select class="twk-field" :value="screen" @change="e => screen = e.target.value">
          <option value="workspace">Chats</option>
          <option value="agents">Agents</option>
          <option value="workflow">Workflow</option>
          <option value="terminal">Terminal</option>
          <option value="multiagent">Multi-Agent</option>
        </select>
      </div>
    </TweaksPanel>
  </div>
</template>

<style>
/* Tweaks panel segment thumb */
.twk-seg {
  position: relative;
}
.twk-seg-thumb {
  position: absolute;
  top: 2px;
  bottom: 2px;
  background: var(--surface-3);
  border-radius: 3px;
  transition: left 0.15s ease, width 0.15s ease;
  pointer-events: none;
  z-index: 0;
}
.twk-seg button {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 4px 8px;
  font-size: 11px;
  font-family: var(--mono);
  background: none;
  border: none;
  color: var(--text-2);
  cursor: pointer;
  transition: color 0.15s;
}
.twk-seg button[data-on="1"] {
  color: var(--text);
}

/* Toggle button */
.twk-toggle {
  width: 32px;
  height: 18px;
  border-radius: 9px;
  border: none;
  padding: 0;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  background: var(--surface-3);
  flex-shrink: 0;
}
.twk-toggle[data-on="1"] {
  background: var(--blue);
}
.twk-toggle i {
  position: absolute;
  top: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--border);
  transition: left 0.2s;
  left: 2px;
  display: block;
}
.twk-toggle[data-on="1"] i {
  left: 16px;
}

/* Select field */
.twk-field {
  flex: 1;
  background: var(--surface-2);
  border: 1px solid var(--border-2);
  border-radius: var(--r);
  color: var(--text);
  font-size: 11px;
  font-family: var(--mono);
  padding: 4px 6px;
  outline: none;
  cursor: pointer;
}
</style>
