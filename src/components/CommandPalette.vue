<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['close', 'navigate'])

const PALETTE_ITEMS = [
  { cat:'Recent',  icon:'clock',    color:'var(--text-3)', label:'Auth module refactor',         sub:'Claude Code · 2m ago',       action:'workspace' },
  { cat:'Recent',  icon:'clock',    color:'var(--text-3)', label:'Test generation session',       sub:'Codex · 18m ago',            action:'workspace' },
  { cat:'Agents',  icon:'sparkles', color:'#d9357a',       label:'Open Claude Code',              sub:'v1.8.2 · active',            action:'agents' },
  { cat:'Agents',  icon:'search',   color:'#00b8d4',       label:'Open Gemini CLI',               sub:'v0.1.9 · active',            action:'agents' },
  { cat:'Agents',  icon:'code',     color:'#00cc88',       label:'Open Codex CLI',                sub:'v0.2.1 · active',            action:'agents' },
  { cat:'Actions', icon:'workflow', color:'var(--blue)',   label:'New Workflow',                  sub:'Open workflow builder',      action:'workflow' },
  { cat:'Actions', icon:'terminal', color:'var(--green)',  label:'New Terminal Session',          sub:'Open split terminal',        action:'terminal' },
  { cat:'Actions', icon:'users',    color:'var(--purple)', label:'Start Multi-Agent Session',    sub:'Collaborative workspace',    action:'multiagent' },
  { cat:'Navigate',icon:'home',     color:'var(--text-2)', label:'Go to Chat Workspace',         sub:'Main conversation area',     action:'workspace' },
  { cat:'Navigate',icon:'agent',    color:'var(--text-2)', label:'Agent Manager',                sub:'View and manage agents',     action:'agents' },
]

const query = ref('')
const active = ref(0)
const inputRef = ref(null)

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

const filtered = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return PALETTE_ITEMS
  return PALETTE_ITEMS.filter(item =>
    item.label.toLowerCase().includes(q) ||
    item.sub.toLowerCase().includes(q) ||
    item.cat.toLowerCase().includes(q)
  )
})

const groups = computed(() => {
  const map = {}
  for (const item of filtered.value) {
    if (!map[item.cat]) map[item.cat] = []
    map[item.cat].push(item)
  }
  return map
})

const flatItems = computed(() => filtered.value)

watch(query, () => { active.value = 0 })

function selectItem(item) {
  emit('navigate', item.action)
}

function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(active.value + 1, flatItems.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = flatItems.value[active.value]
    if (item) selectItem(item)
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

function itemIndex(item) {
  return flatItems.value.indexOf(item)
}
</script>

<template>
  <!-- Backdrop -->
  <div
    style="position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;justify-content:center;align-items:flex-start"
    @click.self="emit('close')"
  >
    <!-- Palette card -->
    <div
      style="width:100%;max-width:620px;margin-top:120px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-xl);overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.6);animation:fadeUp 0.15s ease"
      @keydown="onKeydown"
    >
      <!-- Search input -->
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border)">
        <AppIcon name="search" :size="16" color="var(--text-3)" />
        <input
          ref="inputRef"
          v-model="query"
          placeholder="Search commands, agents, screens…"
          style="flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:14px;font-family:var(--font)"
        />
        <div style="display:flex;gap:4px;flex-shrink:0">
          <kbd style="font-family:var(--mono);font-size:10px;padding:2px 5px;background:var(--surface-3);border:1px solid var(--border-2);border-radius:3px;color:var(--text-3)">↑↓</kbd>
          <kbd style="font-family:var(--mono);font-size:10px;padding:2px 5px;background:var(--surface-3);border:1px solid var(--border-2);border-radius:3px;color:var(--text-3)">⏎</kbd>
          <kbd style="font-family:var(--mono);font-size:10px;padding:2px 5px;background:var(--surface-3);border:1px solid var(--border-2);border-radius:3px;color:var(--text-3)">esc</kbd>
        </div>
      </div>

      <!-- Results -->
      <div style="max-height:420px;overflow-y:auto">
        <template v-for="(items, cat) in groups" :key="cat">
          <!-- Category header -->
          <div style="padding:8px 14px 4px;font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.08em;font-family:var(--mono)">
            {{ cat }}
          </div>
          <!-- Items -->
          <button
            v-for="item in items"
            :key="item.label"
            :style="{
              width:'100%',display:'flex',alignItems:'center',gap:'10px',
              padding:'8px 14px',border:'none',cursor:'pointer',
              background: itemIndex(item) === active ? 'var(--surface-2)' : 'transparent',
              borderLeft: itemIndex(item) === active ? `2px solid ${item.color}` : '2px solid transparent',
              transition:'background 0.1s',
              textAlign:'left',
            }"
            @mouseenter="active = itemIndex(item)"
            @click="selectItem(item)"
          >
            <div :style="{
              width:'28px',height:'28px',borderRadius:'var(--r)',
              background:'var(--surface-3)',
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
            }">
              <AppIcon :name="item.icon" :size="14" :color="item.color" />
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:var(--text);font-weight:500">{{ item.label }}</div>
              <div style="font-size:11px;color:var(--text-3);margin-top:1px;font-family:var(--mono)">{{ item.sub }}</div>
            </div>
            <AppIcon v-if="itemIndex(item) === active" name="arrow-right" :size="13" color="var(--text-3)" />
          </button>
        </template>

        <!-- Empty state -->
        <div v-if="flatItems.length === 0" style="padding:32px;text-align:center;color:var(--text-3);font-size:13px">
          No results for "{{ query }}"
        </div>
      </div>

      <!-- Footer -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-top:1px solid var(--border);background:var(--surface-2)">
        <span style="font-size:11px;color:var(--text-3);font-family:var(--mono)">{{ flatItems.length }} result{{ flatItems.length !== 1 ? 's' : '' }}</span>
        <div style="display:flex;align-items:center;gap:4px">
          <span style="font-size:11px;color:var(--text-3)">Open with</span>
          <kbd style="font-family:var(--mono);font-size:10px;padding:2px 5px;background:var(--surface-3);border:1px solid var(--border-2);border-radius:3px;color:var(--text-3)">⌘K</kbd>
        </div>
      </div>
    </div>
  </div>
</template>
