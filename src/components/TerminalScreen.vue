<script setup>
import { ref, reactive, nextTick, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  workspacePath: { type: String, default: '' },
})

const SESSION_COLORS = ['#d9357a', '#00cc88', '#e6c128', '#00b8d4']
const END_MARKER = '::LOOMAI_END::'
const SHELL_MARKER = '__LOOMAI_SHELL__:'

const LINE_COLORS = {
  cmd:   'var(--blue)',
  info:  'var(--text-3)',
  out:   'var(--text-2)',
  error: 'var(--red)',
}

let counter = 0

const sessions = reactive([])
const activeTabId = ref(null)
const outputEls = ref({})

function makeSession() {
  counter++
  return reactive({
    id: `s${counter}`,
    index: counter,
    shellName: 'shell',
    name: `shell · ${counter}`,
    color: SESSION_COLORS[(counter - 1) % SESSION_COLORS.length],
    lines: [],
    input: '',
    streaming: false,
    connected: false,
    ws: null,
    lineBuf: '',
    connectedAt: '',
  })
}

function updateSessionShell(session, shellName) {
  const normalized = (shellName || '').trim().replace(/^-+/, '')
  if (!normalized) return

  session.shellName = normalized
  session.name = `${normalized} · ${session.index}`

  const connectionLine = session.lines.find(line => line.meta === 'connection')
  if (connectionLine) {
    connectionLine.text = `${normalized} · connected · ${session.connectedAt}`
  }
}

function connectSession(session) {
  const ws = new WebSocket('ws://localhost:8080/ws/terminal')
  session.ws = ws

  ws.onopen = () => {
    session.connected = true
    session.connectedAt = new Date().toLocaleTimeString()
    session.lines = [{ type: 'info', text: `shell · connected · ${session.connectedAt}`, meta: 'connection' }]
    ws.send(`printf '${SHELL_MARKER}%s\\n' "\${SHELL##*/}"\n`)
    if (props.workspacePath) {
      session.lines.push({ type: 'info', text: `workspace: ${props.workspacePath}` })
      ws.send(`cd ${JSON.stringify(props.workspacePath)}\n`)
    }
    scrollOutput(session.id)
  }

  ws.onmessage = (event) => {
    session.lineBuf += event.data
    const parts = session.lineBuf.split('\n')
    session.lineBuf = parts.pop()
    for (const part of parts) {
      if (part === END_MARKER) {
        session.streaming = false
      } else if (part.startsWith(SHELL_MARKER)) {
        updateSessionShell(session, part.slice(SHELL_MARKER.length))
      } else {
        session.lines.push({ type: 'out', text: part })
      }
    }
    scrollOutput(session.id)
  }

  ws.onerror = () => {
    session.connected = false
    session.streaming = false
    session.lines.push({ type: 'error', text: 'Erro de conexão — o backend está rodando na porta 8080?' })
    scrollOutput(session.id)
  }

  ws.onclose = () => {
    session.connected = false
    session.streaming = false
    if (session.lineBuf) {
      session.lines.push({ type: 'out', text: session.lineBuf })
      session.lineBuf = ''
    }
    session.lines.push({ type: 'info', text: 'Sessão encerrada.' })
    scrollOutput(session.id)
  }
}

function addSession() {
  const session = makeSession()
  session.lines.push({ type: 'info', text: 'Conectando...' })
  sessions.push(session)
  activeTabId.value = session.id
  nextTick(() => connectSession(session))
}

function closeSession(id) {
  const idx = sessions.findIndex(s => s.id === id)
  if (idx === -1) return
  sessions[idx].ws?.close()
  sessions.splice(idx, 1)
  if (activeTabId.value === id) {
    activeTabId.value = sessions[Math.max(0, idx - 1)]?.id || sessions[0]?.id || null
  }
}

function submitCommand(session) {
  const cmd = session.input.trim()
  if (!cmd || !session.connected) return
  session.input = ''
  session.lines.push({ type: 'cmd', text: cmd })
  session.streaming = true
  scrollOutput(session.id)
  if (session.ws?.readyState === WebSocket.OPEN) {
    session.ws.send(cmd + '\necho "' + END_MARKER + '"\n')
  } else {
    session.streaming = false
    session.lines.push({ type: 'error', text: 'Não conectado. Feche e abra a sessão novamente.' })
    scrollOutput(session.id)
  }
}

function scrollOutput(sessionId) {
  nextTick(() => {
    const el = outputEls.value[sessionId]
    if (el) el.scrollTop = el.scrollHeight
  })
}

function setOutputEl(el, id) {
  if (el) outputEls.value[id] = el
}

function lineColor(type) { return LINE_COLORS[type] || 'var(--text-2)' }

function linePrefix(type) {
  if (type === 'cmd') return '❯ '
  if (type === 'info') return '· '
  if (type === 'error') return '✗ '
  return '  '
}

function visiblePanes() {
  return sessions.length <= 1 ? sessions.slice(0, 1) : sessions.slice(0, 2)
}

onUnmounted(() => sessions.forEach(s => s.ws?.close()))

addSession()
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100%;background:var(--bg);overflow:hidden">
    <!-- Tab bar -->
    <div style="height:38px;display:flex;align-items:center;border-bottom:1px solid var(--border);background:var(--surface);padding:0 8px;gap:2px;flex-shrink:0;overflow-x:auto">
      <button
        v-for="s in sessions"
        :key="s.id"
        :style="{
          display:'flex',alignItems:'center',gap:'6px',
          padding:'4px 10px',borderRadius:'var(--r)',
          background: activeTabId === s.id ? 'var(--surface-2)' : 'transparent',
          border:'none',
          color: activeTabId === s.id ? 'var(--text)' : 'var(--text-3)',
          fontSize:'12px',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
          transition:'background 0.12s,color 0.12s',
        }"
        @click="activeTabId = s.id"
      >
        <div :style="{ width:'6px',height:'6px',borderRadius:'50%',background:s.connected?s.color:'var(--text-3)',flexShrink:0 }" />
        <span>{{ s.name }}</span>
        <span style="margin-left:2px;color:var(--text-3);font-size:14px;line-height:1;padding:1px 3px;cursor:pointer" @click.stop="closeSession(s.id)">×</span>
      </button>
      <button
        style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:1px dashed var(--border-2);border-radius:var(--r);background:transparent;color:var(--text-3);cursor:pointer;font-size:18px;flex-shrink:0;margin-left:4px;line-height:1"
        @click="addSession"
      >+</button>
    </div>

    <!-- Panes -->
    <div style="flex:1;display:flex;overflow:hidden">
      <div
        v-for="(s, idx) in visiblePanes()"
        :key="s.id"
        :style="{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',borderLeft:idx>0?'1px solid var(--border)':'none'}"
      >
        <!-- Pane header -->
        <div style="height:34px;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0">
          <div :style="{ width:'7px',height:'7px',borderRadius:'50%',background:s.connected?s.color:'var(--text-3)',flexShrink:0 }" />
          <span style="font-size:12px;font-weight:500;color:var(--text-2);font-family:var(--mono);flex:1">{{ s.name }}</span>
          <span v-if="!s.connected" style="font-size:10px;color:var(--text-3);font-family:var(--mono)">offline</span>
          <button style="background:transparent;border:none;color:var(--text-3);cursor:pointer;padding:2px;display:flex;align-items:center" @click="closeSession(s.id)">
            <AppIcon name="x" :size="13" color="var(--text-3)" />
          </button>
        </div>

        <!-- Output area -->
        <div
          :ref="el => setOutputEl(el, s.id)"
          style="flex:1;overflow-y:auto;padding:12px 14px;font-family:var(--mono);font-size:12px;line-height:1.7"
        >
          <div v-for="(line, i) in s.lines" :key="i">
            <div :style="{ color: lineColor(line.type), whiteSpace:'pre-wrap', wordBreak:'break-all' }">
              {{ linePrefix(line.type) }}{{ line.text }}
            </div>
          </div>
          <div v-if="s.streaming" style="display:flex;align-items:center;gap:3px;margin-top:4px;padding-left:2px">
            <span style="animation:streamDot1 1.2s ease-in-out infinite;color:var(--text-3)">▪</span>
            <span style="animation:streamDot2 1.2s ease-in-out infinite;color:var(--text-3)">▪</span>
            <span style="animation:streamDot3 1.2s ease-in-out infinite;color:var(--text-3)">▪</span>
          </div>
        </div>

        <!-- Input line -->
        <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-top:1px solid var(--border);background:var(--surface);flex-shrink:0">
          <span :style="{ color: s.connected ? s.color : 'var(--text-3)', fontFamily:'var(--mono)', fontSize:'13px', flexShrink:0 }">❯</span>
          <input
            v-model="s.input"
            @keydown.enter="submitCommand(s)"
            :placeholder="s.connected ? '' : 'aguardando conexão...'"
            :disabled="!s.connected"
            :style="{
              flex:1,background:'transparent',border:'none',outline:'none',
              color:'var(--text)',fontFamily:'var(--mono)',fontSize:'12px',
              caretColor: s.color,
              opacity: s.connected ? 1 : 0.4,
            }"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="sessions.length === 0" style="flex:1;display:flex;align-items:center;justify-content:center">
        <button
          style="display:flex;align-items:center;gap:6px;padding:8px 16px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);color:var(--text-2);font-family:var(--mono);font-size:12px;cursor:pointer"
          @click="addSession"
        >+ Nova sessão</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
input::placeholder { color: var(--text-3); }
</style>
