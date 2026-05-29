<script setup>
import { onMounted, ref } from 'vue'
import AppBadge from './AppBadge.vue'
import AppIcon from './AppIcon.vue'
import StatusDot from './StatusDot.vue'
import { agents, loadAgents as storeLoadAgents, scanAgents as storeScanAgents } from '../lib/agentsStore.js'
import { getAdapterMeta, getAgentSelection } from '../lib/agentModels.js'

const toast = ref(null)
const loading = ref(false)

onMounted(() => {
  loadAgents()
})

async function loadAgents() {
  loading.value = true
  try {
    await storeLoadAgents({ refresh: true })
  } finally {
    loading.value = false
  }
}

async function scanAgents() {
  loading.value = true
  try {
    await storeScanAgents()
    toast.value = `${agents.value.length} agent(s) detected`
    setTimeout(() => { toast.value = null }, 2000)
  } finally {
    loading.value = false
  }
}

function toAgentCard(agent) {
  const meta = getAdapterMeta(agent.adapterType)
  const selection = getAgentSelection(agent, agent.adapterConfig?.model)
  return {
    ...agent,
    meta,
    selectedModel: selection.model,
    command: agent.adapterConfig?.command || '',
  }
}

function useAgent(agent) {
  const selection = getAgentSelection(agent, agent.adapterConfig?.model)
  window.__forgeUseAgent?.(agent.id, selection.model)
  window.__forgeNavigate?.('workspace')
  toast.value = `${agent.name} selected`
  setTimeout(() => { toast.value = null }, 1800)
}
</script>

<template>
  <div style="height:100%;overflow-y:auto;background:var(--bg)">
    <div style="max-width:1180px;margin:0 auto;padding:28px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:24px">
        <div>
          <h1 style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:4px">Local Agents</h1>
          <p style="font-size:13px;color:var(--text-3)">Local adapters detected automatically. Use <span style="font-family:var(--mono)">Re-scan</span> to refresh.</p>
        </div>
        <button
          style="display:flex;align-items:center;gap:6px;padding:7px 14px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);color:var(--text-2);font-size:12px;cursor:pointer"
          @click="scanAgents"
        >
          <AppIcon name="refresh" :size="13" color="var(--text-3)" />
          {{ loading ? 'Scanning...' : 'Re-scan' }}
        </button>
      </div>

      <div v-if="!loading && !agents.length" style="padding:28px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);color:var(--text-2)">
        No local agents detected. Click <strong>Re-scan</strong> to search for installed CLI agents.
      </div>

      <div v-else style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px">
        <div
          v-for="agent in agents.map(toAgentCard)"
          :key="agent.id"
          :style="{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '16px',
          }"
        >
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px">
            <div :style="{ width:'34px',height:'34px',borderRadius:'var(--r)',background:agent.meta.bgColor,border:`1px solid ${agent.meta.color}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }">
              <span :style="{ fontFamily:'var(--mono)',fontSize:'11px',fontWeight:700,color:agent.meta.color }">{{ agent.meta.shortLabel.slice(0,2).toUpperCase() }}</span>
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:13px;font-weight:600;color:var(--text)">{{ agent.name }}</span>
                <StatusDot :status="agent.status" :size="6" />
              </div>
              <div style="font-family:var(--mono);font-size:11px;color:var(--text-3);margin-top:2px">{{ agent.adapterType }}</div>
              <div style="font-family:var(--mono);font-size:10px;color:var(--text-3);margin-top:4px;word-break:break-all">{{ agent.command || 'no command override' }}</div>
            </div>
          </div>

          <p style="font-size:12px;color:var(--text-2);line-height:1.55;margin-bottom:12px">{{ agent.meta.desc }}</p>

          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px">
            <AppBadge v-for="cap in agent.meta.caps.slice(0,3)" :key="cap" variant="default">{{ cap }}</AppBadge>
          </div>

          <div style="display:flex;justify-content:space-between;gap:8px;font-family:var(--mono);font-size:10px;color:var(--text-3);margin-bottom:12px">
            <span>{{ agent.selectedModel }}</span>
            <span>{{ agent.meta.runtime }}</span>
          </div>

          <button
            :style="{ width:'100%',padding:'8px 0',borderRadius:'var(--r)',border:'none',background:agent.meta.color,color:'#000',fontSize:'12px',fontWeight:600,cursor:'pointer' }"
            @click="useAgent(agent)"
          >
            Use
          </button>
        </div>
      </div>
    </div>

    <Transition name="toast">
      <div
        v-if="toast"
        style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 20px;background:var(--surface);border:1px solid var(--blue);border-radius:var(--r-lg);font-size:13px;color:var(--blue);box-shadow:0 4px 20px rgba(0,0,0,0.4);z-index:1000;white-space:nowrap"
      >
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s, transform 0.2s; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(8px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
