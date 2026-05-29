<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'
import StatusDot from './StatusDot.vue'

const emit = defineEmits(['complete'])

const STEPS = ['Welcome', 'Scanning', 'Agents Found', 'Permissions', 'Profile', 'Ready']

const DETECTED_AGENTS = [
  { name: 'Claude Code', cli: 'claude',     version: '1.8.2', color: '#d9357a', caps: ['code', 'analysis', 'chat'] },
  { name: 'Gemini CLI',  cli: 'gemini',     version: '0.1.9', color: '#00b8d4', caps: ['research', 'vision', 'chat'] },
  { name: 'Codex CLI',   cli: 'codex',      version: '0.2.1', color: '#00cc88', caps: ['codegen', 'complete'] },
  { name: 'Copilot CLI', cli: 'gh copilot', version: '2.0.1', color: '#00b8d4', caps: ['explain', 'suggest'] },
  { name: 'Aider',       cli: 'aider',      version: '0.50.1', color: '#e6c128', caps: ['edit', 'commit', 'chat'] },
  { name: 'OpenCode',    cli: 'opencode',   version: '0.1.4', color: '#d93346', caps: ['interactive', 'lsp'] },
]

const SCAN_LINES = [
  '> Initializing Loom runtime...',
  '> Scanning PATH for AI CLIs...',
  '> Detected: /usr/local/bin/claude (v1.8.2)',
  '> Detected: /usr/local/bin/gemini (v0.1.9)',
  '> Detected: /usr/local/bin/codex (v0.2.1)',
  '> Detected: /usr/bin/aider (v0.50.1)',
  '> Scanning ~/.config/loom/agents...',
  '> Detected: opencode (v0.1.4)',
  '> Checking GPU availability... NVIDIA RTX 4090 ✓',
  '> Indexing local model store... 4 models found',
  '> Scan complete. 6 agents ready.',
]

const PERMISSIONS = [
  { icon: 'folder',   label: 'File System',       desc: 'Read/write project files',   default: true },
  { icon: 'terminal', label: 'Shell',              desc: 'Run terminal commands',       default: true },
  { icon: 'cpu',      label: 'GPU',                desc: 'Hardware acceleration',       default: true },
  { icon: 'wifi-off', label: 'Network Isolation',  desc: 'Block external requests',     default: false },
]

const step = ref(0)
const scanLines = ref([])
const scanDone = ref(false)
const agentsVisible = ref([])
const progress = ref(0)
const username = ref('')
const permissions = ref(PERMISSIONS.map(p => ({ ...p, enabled: p.default })))
const scanRef = ref(null)
const usernameInputRef = ref(null)

const timers = []

watch(step, (newVal, _oldVal, onCleanup) => {
  if (newVal === 1) {
    scanLines.value = []
    scanDone.value = false
    agentsVisible.value = []
    progress.value = 0
    let i = 0
    const iv = setInterval(() => {
      if (i >= SCAN_LINES.length) {
        clearInterval(iv)
        scanDone.value = true
        return
      }
      scanLines.value = [...scanLines.value, SCAN_LINES[i]]
      progress.value = Math.round((i + 1) / SCAN_LINES.length * 100)
      i++
      if (i >= SCAN_LINES.length) {
        clearInterval(iv)
        scanDone.value = true
      }
      nextTick(() => {
        if (scanRef.value) {
          scanRef.value.scrollTop = scanRef.value.scrollHeight
        }
      })
    }, 280)
    onCleanup(() => clearInterval(iv))
  }

  if (newVal === 2) {
    agentsVisible.value = []
    DETECTED_AGENTS.forEach((_, idx) => {
      const t = setTimeout(() => {
        agentsVisible.value = [...agentsVisible.value, idx]
      }, idx * 150)
      timers.push(t)
    })
  }

  if (newVal === 4) {
    nextTick(() => {
      if (usernameInputRef.value) usernameInputRef.value.focus()
    })
  }
})

onUnmounted(() => {
  timers.forEach(t => clearTimeout(t))
})

function next() {
  if (step.value < STEPS.length - 1) step.value++
}
function back() {
  if (step.value > 0) step.value--
}
function complete() {
  emit('complete', { username: username.value || 'User' })
}
function togglePermission(idx) {
  permissions.value[idx].enabled = !permissions.value[idx].enabled
}

const CTAStyle = {
  background: 'var(--blue)',
  color: '#000',
  borderRadius: '0',
  fontFamily: 'var(--mono)',
  textTransform: 'uppercase',
  fontWeight: 700,
  fontSize: '12px',
  letterSpacing: '0.06em',
  padding: '10px 28px',
  border: 'none',
  cursor: 'pointer',
}
</script>

<template>
  <div
    :style="{
      position: 'fixed', inset: 0,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      overflow: 'hidden',
    }"
  >
    <!-- Brand strip -->
    <div
      :style="{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
      }"
    >
      <svg width="22" height="22" viewBox="0 0 28 28">
        <rect width="28" height="28" fill="#ededed" />
        <text x="14" y="21" text-anchor="middle" style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:19px;letter-spacing:-0.04em;fill:#000">L</text>
      </svg>
      <span :style="{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '14px' }">Loom</span>
      <span :style="{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.04em' }">local AI</span>
    </div>

    <!-- Card area -->
    <div
      :style="{
        width: '100%',
        maxWidth: step === 2 ? '820px' : '560px',
        transition: 'max-width 0.3s ease',
        padding: '0 20px',
      }"
    >

      <!-- Step 0: Welcome -->
      <div v-if="step === 0" :style="{ textAlign: 'center', animation: 'fadeUp 0.4s ease' }">
        <div :style="{ marginBottom: '16px' }">
          <span :style="{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)',
            border: '1px solid var(--border)', borderRadius: '20px', padding: '3px 10px',
          }">
            <AppIcon name="wifi-off" :size="11" color="var(--text-3)" />
            Fully Offline
          </span>
        </div>
        <h1 :style="{
          fontSize: '42px', fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.03em', marginBottom: '16px', color: 'var(--text)',
        }">Run every agent.<br>Locally.</h1>
        <p :style="{ color: 'var(--text-2)', fontSize: '15px', marginBottom: '32px', lineHeight: 1.6 }">
          Loom orchestrates Claude Code, Gemini CLI, Codex, Aider, and more —<br>
          all running on your machine. No cloud required.
        </p>
        <button :style="CTAStyle" @click="next">Get Started →</button>
      </div>

      <!-- Step 1: Scanning -->
      <div v-else-if="step === 1" :style="{ animation: 'fadeUp 0.4s ease' }">
        <div :style="{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }">
          <div v-if="!scanDone" :style="{
            width: '20px', height: '20px', border: '2px solid var(--blue)',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite', flexShrink: 0,
          }" />
          <AppIcon v-else name="check" :size="20" color="var(--green)" />
          <span :style="{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--text)' }">
            {{ scanDone ? 'Scan complete' : 'Scanning system...' }}
          </span>
        </div>

        <!-- Scan terminal -->
        <div
          ref="scanRef"
          :style="{
            background: '#0a0a0a', border: '1px solid var(--border)',
            borderRadius: 'var(--r)', padding: '14px',
            fontFamily: 'var(--mono)', fontSize: '12px',
            height: '220px', overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: '4px',
          }"
        >
          <div
            v-for="(line, i) in scanLines"
            :key="i"
            :style="{
              color: line.includes('Detected') ? 'var(--green)' : 'var(--text-2)',
              animation: 'fadeIn 0.2s ease',
            }"
          >{{ line }}</div>
          <span v-if="!scanDone" :style="{ color: 'var(--text-3)', animation: 'blink 1s infinite' }">_</span>
        </div>

        <!-- Progress bar -->
        <div :style="{ marginTop: '14px', marginBottom: '20px' }">
          <div :style="{
            height: '2px', background: 'var(--surface-3)',
            borderRadius: '1px', overflow: 'hidden',
          }">
            <div :style="{
              height: '100%', background: 'var(--blue)',
              width: progress + '%', transition: 'width 0.3s ease',
            }" />
          </div>
          <div :style="{ marginTop: '6px', display: 'flex', justifyContent: 'space-between' }">
            <span :style="{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }">
              {{ scanDone ? 'Complete' : 'Scanning...' }}
            </span>
            <span :style="{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }">{{ progress }}%</span>
          </div>
        </div>

        <div :style="{ display: 'flex', gap: '10px' }">
          <button :style="{ ...CTAStyle, background: 'var(--surface-2)', color: 'var(--text-2)' }" @click="back">← Back</button>
          <button
            :style="{
              ...CTAStyle,
              opacity: scanDone ? 1 : 0.4,
              cursor: scanDone ? 'pointer' : 'not-allowed',
            }"
            :disabled="!scanDone"
            @click="next"
          >Review Agents →</button>
        </div>
      </div>

      <!-- Step 2: Agents Found -->
      <div v-else-if="step === 2" :style="{ animation: 'fadeUp 0.4s ease' }">
        <h2 :style="{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }">6 Agents Detected</h2>
        <p :style="{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '22px' }">
          All agents installed and ready to use.
        </p>

        <div :style="{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
          marginBottom: '24px',
        }">
          <div
            v-for="(agent, i) in DETECTED_AGENTS"
            :key="agent.name"
            :style="{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '14px',
              opacity: agentsVisible.includes(i) ? 1 : 0,
              animation: agentsVisible.includes(i) ? 'agentDetect 0.3s ease' : 'none',
              transition: 'opacity 0.3s',
            }"
          >
            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }">
              <div :style="{
                width: '8px', height: '8px', borderRadius: '50%',
                background: agent.color, flexShrink: 0,
              }" />
              <span :style="{ fontWeight: 600, fontSize: '13px' }">{{ agent.name }}</span>
            </div>
            <div :style="{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px' }">
              {{ agent.cli }} · v{{ agent.version }}
            </div>
            <div :style="{ display: 'flex', flexWrap: 'wrap', gap: '4px' }">
              <span
                v-for="cap in agent.caps"
                :key="cap"
                :style="{
                  fontFamily: 'var(--mono)', fontSize: '10px',
                  padding: '1px 6px', borderRadius: '3px',
                  background: 'var(--surface-3)', color: 'var(--text-3)',
                }"
              >{{ cap }}</span>
            </div>
          </div>
        </div>

        <div :style="{ display: 'flex', gap: '10px' }">
          <button :style="{ ...CTAStyle, background: 'var(--surface-2)', color: 'var(--text-2)' }" @click="back">← Back</button>
          <button :style="CTAStyle" @click="next">Configure Permissions →</button>
        </div>
      </div>

      <!-- Step 3: Permissions -->
      <div v-else-if="step === 3" :style="{ animation: 'fadeUp 0.4s ease' }">
        <h2 :style="{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }">Permissions</h2>
        <p :style="{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '22px' }">
          Control what agents can access on your system.
        </p>

        <div :style="{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }">
          <div
            v-for="(perm, i) in permissions"
            :key="perm.label"
            :style="{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }"
            @click="togglePermission(i)"
          >
            <AppIcon :name="perm.icon" :size="16" color="var(--text-2)" />
            <div :style="{ flex: 1 }">
              <div :style="{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }">{{ perm.label }}</div>
              <div :style="{ fontSize: '12px', color: 'var(--text-3)' }">{{ perm.desc }}</div>
            </div>
            <!-- Toggle -->
            <div
              :style="{
                width: '36px', height: '20px', borderRadius: '10px',
                background: perm.enabled ? 'var(--blue)' : 'var(--surface-3)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }"
            >
              <div :style="{
                position: 'absolute', top: '3px',
                left: perm.enabled ? '19px' : '3px',
                width: '14px', height: '14px', borderRadius: '50%',
                background: perm.enabled ? '#000' : 'var(--text-3)',
                transition: 'left 0.2s',
              }" />
            </div>
          </div>
        </div>

        <div :style="{ display: 'flex', gap: '10px' }">
          <button :style="{ ...CTAStyle, background: 'var(--surface-2)', color: 'var(--text-2)' }" @click="back">← Back</button>
          <button :style="CTAStyle" @click="next">Set Up Profile →</button>
        </div>
      </div>

      <!-- Step 4: Profile -->
      <div v-else-if="step === 4" :style="{ animation: 'fadeUp 0.4s ease' }">
        <h2 :style="{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }">Your Profile</h2>
        <p :style="{ color: 'var(--text-2)', fontSize: '13px', marginBottom: '28px' }">
          Choose a username for your session.
        </p>

        <div :style="{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }">
          <!-- Avatar preview -->
          <div :style="{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 700, color: '#000', flexShrink: 0,
          }">
            {{ username ? username[0].toUpperCase() : '?' }}
          </div>

          <div :style="{ flex: 1 }">
            <label :style="{ display: 'block', fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }">Username</label>
            <input
              ref="usernameInputRef"
              v-model="username"
              placeholder="Enter username..."
              :style="{
                width: '100%', background: 'var(--surface)',
                border: '1px solid var(--border-2)',
                borderRadius: 'var(--r)', padding: '9px 12px',
                color: 'var(--text)', fontSize: '14px',
                fontFamily: 'var(--mono)', outline: 'none',
              }"
              @keydown.enter="next"
            />
          </div>
        </div>

        <div :style="{ display: 'flex', gap: '10px' }">
          <button :style="{ ...CTAStyle, background: 'var(--surface-2)', color: 'var(--text-2)' }" @click="back">← Back</button>
          <button
            :style="{
              ...CTAStyle,
              opacity: username.trim() ? 1 : 0.4,
              cursor: username.trim() ? 'pointer' : 'not-allowed',
            }"
            :disabled="!username.trim()"
            @click="next"
          >Continue →</button>
        </div>
      </div>

      <!-- Step 5: Ready -->
      <div v-else-if="step === 5" :style="{ textAlign: 'center', animation: 'fadeUp 0.4s ease' }">
        <div :style="{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'var(--green-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }">
          <AppIcon name="check" :size="28" color="var(--green)" />
        </div>
        <h2 :style="{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }">
          Welcome, {{ username || 'User' }}
        </h2>
        <p :style="{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '12px' }">
          Loom is ready. 6 agents loaded, running fully offline.
        </p>
        <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '32px' }">
          <StatusDot status="active" :size="8" />
          <span :style="{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--green)' }">All systems online</span>
        </div>
        <button :style="CTAStyle" @click="complete">Launch Loom →</button>
      </div>

    </div>

    <!-- Bottom progress strip -->
    <div
      :style="{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        borderTop: '1px solid var(--border)',
      }"
    >
      <div
        v-for="(label, i) in STEPS"
        :key="label"
        :style="{
          display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
          opacity: i <= step ? 1 : 0.35,
          transition: 'opacity 0.2s',
        }"
        @click="i < step ? (step = i) : undefined"
      >
        <div
          :style="{
            width: '6px', height: '6px', borderRadius: '50%',
            background: i === step ? 'var(--blue)' : i < step ? 'var(--green)' : 'var(--surface-3)',
            transition: 'background 0.2s',
          }"
        />
        <span :style="{
          fontFamily: 'var(--mono)', fontSize: '10px',
          color: i === step ? 'var(--text)' : 'var(--text-3)',
        }">{{ label }}</span>
        <span
          v-if="i < STEPS.length - 1"
          :style="{ color: 'var(--border-2)', fontSize: '10px', marginLeft: '2px' }"
        >·</span>
      </div>
    </div>
  </div>
</template>
