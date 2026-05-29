<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { api } from '../lib/api.js'
import { getAdapterMeta, getAgentSelection } from '../lib/agentModels.js'
import { activeWorkflowId } from '../lib/workflowState.js'
import { agents as storeAgents, loadAgents as fetchAgents } from '../lib/agentsStore.js'

const props = defineProps({
  active: { type: Boolean, default: false },
  initialWorkspacePath: { type: String, default: '' },
})

const STORAGE_KEY = 'loomai-multiagent-session'
const STEP_INTERVAL_SECONDS = 6

const ORCHESTRATOR = {
  id: 'orchestrator',
  name: 'Loom Weaver',
  role: 'Task Coordinator',
  icon: 'network',
  color: '#e6c128',
  bg: 'rgba(230,193,40,0.08)',
}

const loading = ref(true)
const availableAgents = computed(() => storeAgents.value.map(enrichAgent))
const workflows = ref([])
const selectedWorkflowId = ref('')
const selectedAgentIds = ref([])
const workflowParams = ref({})
const workspacePath = ref('')
const timelineExpanded = ref(false)
const session = ref(createEmptySession())
const intervalId = ref(null)
const paneRefs = ref({})
const abortController = ref(null)

const selectedAgents = computed(() => (
  availableAgents.value.filter(agent => selectedAgentIds.value.includes(agent.id))
))

const selectedWorkflow = computed(() => (
  workflows.value.find(workflow => workflow.id === selectedWorkflowId.value) || null
))

const workflowParameters = computed(() => {
  if (!selectedWorkflow.value) return []
  if (selectedWorkflow.value.parameters?.length) return selectedWorkflow.value.parameters
  const inputNode = selectedWorkflow.value.definition?.nodes?.find(n => n.type === 'input')
  return inputNode?.parameters || []
})

const prompt = computed(() => {
  if (!workflowParameters.value.length) return ''
  const parts = workflowParameters.value
    .filter(p => workflowParams.value[p.key])
    .map(p => `${p.label}: ${workflowParams.value[p.key]}`)
  return parts.join('\n')
})

const sessionPanes = computed(() => {
  const ids = session.value.selectedAgentIds.length
    ? session.value.selectedAgentIds
    : selectedAgentIds.value

  const panes = ids
    .map(id => availableAgents.value.find(agent => agent.id === id))
    .filter(Boolean)

  return [ORCHESTRATOR, ...panes]
})

const workflowNodes = computed(() => selectedWorkflow.value?.definition?.nodes || [])
const workflowEdges = computed(() => selectedWorkflow.value?.definition?.edges || [])
const stepCount = computed(() => session.value.steps.length)
const doneEvents = computed(() => session.value.completedStepIds.length)
const totalDuration = computed(() => session.value.totalDuration || 0)
const progressPct = computed(() => {
  if (!stepCount.value) return 0
  if (session.value.status === 'complete') return 100
  return Math.min((doneEvents.value / stepCount.value) * 100, 100)
})
const isRunning = computed(() => session.value.status === 'running')
const isComplete = computed(() => session.value.status === 'complete')
const canStart = computed(() => {
  if (loading.value || !selectedAgents.value.length || !selectedWorkflow.value) return false
  if (!workspacePath.value?.trim()) return false
  const requiredParams = workflowParameters.value.filter(p => p.required)
  return requiredParams.every(p => workflowParams.value[p.key]?.trim())
})

const startBlockReason = computed(() => {
  if (loading.value) return 'Carregando...'
  if (!selectedWorkflow.value) return 'Selecione um workflow'
  if (!selectedAgents.value.length) return 'Nenhum agente disponível no workflow'
  if (!workspacePath.value?.trim()) return 'Preencha o workspace'
  const missing = workflowParameters.value
    .filter(p => p.required && !workflowParams.value[p.key]?.trim())
    .map(p => p.label)
  if (missing.length) return `Preencha: ${missing.join(', ')}`
  return null
})

watch(session, persistSession, { deep: true })
watch(selectedWorkflowId, () => {
  workflowParams.value = {}
  if (availableAgents.value.length) {
    autoSelectAgentsFromWorkflow()
  }
})

watch(() => props.initialWorkspacePath, (val) => {
  if (val && !workspacePath.value) {
    workspacePath.value = val
  }
}, { immediate: true })

watch(() => props.active, async (isActive) => {
  if (!isActive) return
  if (session.value.status !== 'running') {
    await loadData()
    syncSelectedAgentsFromSession()
  }
})

onMounted(() => {
  hydrateSession()
  if (session.value.status === 'running') {
    session.value.status = 'paused'
    appendMessage('orchestrator', 'system', 'Restored previous session in paused mode.')
  }
})

onUnmounted(() => {
  clearInterval(intervalId.value)
})

function autoSelectAgentsFromWorkflow() {
  const workflow = workflows.value.find(w => w.id === selectedWorkflowId.value)
  const nodes = workflow?.definition?.nodes || []
  const agentTypes = [...new Set(nodes.map(n => n.agentType).filter(Boolean))]

  if (agentTypes.length > 0) {
    const ids = []
    for (const agentType of agentTypes) {
      const match = availableAgents.value.find(a => a.adapterType === agentType)
      if (match && !ids.includes(match.id)) ids.push(match.id)
    }
    if (ids.length > 0) {
      selectedAgentIds.value = ids
      return
    }
  }

  selectedAgentIds.value = availableAgents.value
    .filter(a => a.status !== 'idle')
    .slice(0, 3)
    .map(a => a.id)
}

async function loadData() {
  loading.value = true
  try {
    const [, fetchedWorkflows] = await Promise.all([
      fetchAgents(),
      api.getWorkflows(),
    ])

    const sortedWorkflows = [...fetchedWorkflows].sort((left, right) =>
      (right.updatedAt || '').localeCompare(left.updatedAt || ''),
    )
    workflows.value = sortedWorkflows

    const fromBuilder = activeWorkflowId.value
    const hasPersistedWorkflow = session.value.workflowId
      && sortedWorkflows.some(workflow => workflow.id === session.value.workflowId)

    if (fromBuilder && sortedWorkflows.some(w => w.id === fromBuilder)) {
      selectedWorkflowId.value = fromBuilder
    } else if (hasPersistedWorkflow) {
      selectedWorkflowId.value = session.value.workflowId
    } else if (!selectedWorkflowId.value && sortedWorkflows.length) {
      selectedWorkflowId.value = sortedWorkflows[0].id
    }

    if (!selectedAgentIds.value.length) {
      autoSelectAgentsFromWorkflow()
    }

    if (!session.value.selectedAgentIds.length && selectedAgentIds.value.length) {
      session.value.selectedAgentIds = [...selectedAgentIds.value]
    }
  } finally {
    loading.value = false
  }
}

function enrichAgent(agent) {
  const meta = getAdapterMeta(agent.adapterType)
  const selection = getAgentSelection(agent, agent.adapterConfig?.model)
  return {
    ...agent,
    icon: meta.icon || 'agent',
    role: meta.role || 'Local Agent',
    color: meta.color || 'var(--blue)',
    bg: meta.bgColor || 'rgba(0,184,212,0.08)',
    model: selection.model,
  }
}

function createEmptySession() {
  return {
    status: 'idle',
    elapsed: 0,
    totalDuration: 0,
    prompt: '',
    workflowId: '',
    workflowName: '',
    selectedAgentIds: [],
    steps: [],
    completedStepIds: [],
    logs: {
      orchestrator: [
        { from: 'system', text: 'Select agents, review the workflow, and start a session.' },
      ],
    },
    activePaneId: 'orchestrator',
    summary: '',
  }
}

function hydrateSession() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    session.value = {
      ...createEmptySession(),
      ...parsed,
      logs: {
        orchestrator: parsed.logs?.orchestrator || createEmptySession().logs.orchestrator,
        ...(parsed.logs || {}),
      },
      completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      selectedAgentIds: Array.isArray(parsed.selectedAgentIds) ? parsed.selectedAgentIds : [],
    }
    if (parsed.workflowParams) {
      workflowParams.value = parsed.workflowParams
    }
    if (parsed.workspacePath) {
      workspacePath.value = parsed.workspacePath
    }
  } catch {
    session.value = createEmptySession()
  }
}

function persistSession() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...session.value,
    workflowParams: workflowParams.value,
    workspacePath: workspacePath.value,
  }))
}

function syncSelectedAgentsFromSession() {
  if (!session.value.selectedAgentIds.length) return
  const validIds = session.value.selectedAgentIds.filter(id => availableAgents.value.some(agent => agent.id === id))
  if (validIds.length) {
    selectedAgentIds.value = validIds
  }
}

function setPaneRef(el, id) {
  if (el) {
    paneRefs.value[id] = el
  }
}

function scrollPane(agentId) {
  nextTick(() => {
    const el = paneRefs.value[agentId]
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

function formatTime(seconds) {
  const total = Math.max(0, seconds || 0)
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatWorkflowCoverage() {
  if (!selectedWorkflow.value) return 'Ad-hoc session'
  return `${workflowNodes.value.length} nodes · ${workflowEdges.value.length} edges`
}

function toggleAgent(agentId) {
  if (selectedAgentIds.value.includes(agentId)) {
    selectedAgentIds.value = selectedAgentIds.value.filter(id => id !== agentId)
  } else {
    selectedAgentIds.value = [...selectedAgentIds.value, agentId]
  }
}

function reset() {
  abortController.value?.abort()
  abortController.value = null
  clearInterval(intervalId.value)
  session.value = createEmptySession()
  workflowParams.value = {}
  timelineExpanded.value = false
}

async function startSession() {
  if (!canStart.value) return
  clearInterval(intervalId.value)

  const agents = selectedAgents.value
  const workflow = selectedWorkflow.value

  const logs = {
    orchestrator: [
      { from: 'system', text: 'Orchestration session started.' },
      { from: 'agent', text: `Workflow: ${workflow?.name || 'Ad-hoc'}\nParticipants: ${agents.map(a => a.name).join(' · ')}` },
    ],
  }
  agents.forEach(agent => {
    logs[agent.id] = [
      { from: 'system', text: `${agent.name} ready.` },
    ]
  })

  session.value = {
    ...createEmptySession(),
    status: 'running',
    elapsed: 0,
    totalDuration: 0,
    prompt: prompt.value,
    workflowId: workflow?.id || '',
    workflowName: workflow?.name || 'Ad-hoc session',
    selectedAgentIds: agents.map(a => a.id),
    steps: [],
    completedStepIds: [],
    logs,
    activePaneId: 'orchestrator',
    summary: '',
  }

  intervalId.value = setInterval(() => { session.value.elapsed += 1 }, 1000)

  abortController.value = new AbortController()

  try {
    await api.executeSession(
      {
        workflow_id: workflow.id,
        agent_ids: agents.map(a => a.id),
        params: workflowParams.value,
        workspace_path: workspacePath.value || null,
      },
      {
        onSessionStarted({ total_steps }) {
          session.value.totalDuration = total_steps * 20
        },
        onStepStarted({ step_id, step_index, label, agent_id }) {
          session.value.activePaneId = agent_id
          session.value.steps = [...session.value.steps, {
            id: step_id,
            at: (step_index + 1) * 20,
            label,
            paneId: agent_id,
          }]
          appendMessage('orchestrator', 'system', `${label} started.`)
          appendMessage(agent_id, 'system', `Executing: ${label}`)
          scrollPane(agent_id)
          scrollPane('orchestrator')
        },
        onStepLog({ agent_id, message }) {
          appendMessage(agent_id, 'system', message)
          scrollPane(agent_id)
        },
        onStepDone({ step_id, label, agent_id, output }) {
          session.value.completedStepIds = [...session.value.completedStepIds, step_id]
          appendMessage(agent_id, 'agent', output)
          appendMessage('orchestrator', 'agent', `${label} completed.`)
          scrollPane(agent_id)
          scrollPane('orchestrator')
        },
        onStepError({ step_id, label, agent_id, error }) {
          session.value.completedStepIds = [...session.value.completedStepIds, step_id]
          appendMessage(agent_id, 'agent', `Error: ${error}`)
          appendMessage('orchestrator', 'system', `${label} failed: ${error}`)
          scrollPane(agent_id)
          scrollPane('orchestrator')
        },
        onSessionDone({ summary }) {
          clearInterval(intervalId.value)
          session.value.status = 'complete'
          session.value.summary = summary
          appendMessage('orchestrator', 'agent', `Session complete.\n${summary}`)
          scrollPane('orchestrator')
        },
        onSessionError({ message }) {
          clearInterval(intervalId.value)
          session.value.status = 'paused'
          appendMessage('orchestrator', 'system', `Execution error: ${message}`)
          scrollPane('orchestrator')
        },
      },
      abortController.value.signal,
    )
  } catch (err) {
    if (err.name !== 'AbortError') {
      clearInterval(intervalId.value)
      session.value.status = 'paused'
      appendMessage('orchestrator', 'system', `Failed to start execution: ${err.message || 'Unknown error'}`)
      scrollPane('orchestrator')
    }
  }
}

function pauseSession() {
  abortController.value?.abort()
  session.value.status = 'paused'
  clearInterval(intervalId.value)
  appendMessage('orchestrator', 'system', 'Session paused.')
}

function resumeSession() {
  if (session.value.status !== 'paused') return
  startSession()
}

function tick() {
  if (session.value.status !== 'running') return

  session.value.elapsed += 1

  session.value.steps.forEach(step => {
    if (step.at <= session.value.elapsed && !session.value.completedStepIds.includes(step.id)) {
      runStep(step)
    }
  })

  if (session.value.completedStepIds.length === session.value.steps.length && session.value.steps.length) {
    finalizeSession()
  }
}

function runStep(step) {
  session.value.completedStepIds = [...session.value.completedStepIds, step.id]
  session.value.activePaneId = step.paneId

  appendMessage('orchestrator', 'system', `${step.label} started.`)
  appendMessage(step.paneId, 'system', step.systemText)
  appendMessage(step.paneId, 'agent', step.agentText)
  appendMessage('orchestrator', 'agent', step.summaryText)

  scrollPane(step.paneId)
  scrollPane('orchestrator')
}

function finalizeSession() {
  clearInterval(intervalId.value)
  session.value.status = 'complete'
  session.value.summary = `${doneEvents.value} coordinated steps completed with ${session.value.selectedAgentIds.length} agents.`
  appendMessage('orchestrator', 'agent', `Session complete.\n${session.value.summary}`)
  scrollPane('orchestrator')
}

function appendMessage(agentId, from, text) {
  const normalizedText = normalizeAgentLog(text)
  if (!normalizedText) return
  const existing = session.value.logs[agentId] || []
  const last = existing[existing.length - 1]
  if (last && last.from === from && last.text === normalizedText) {
    return
  }
  session.value.logs = {
    ...session.value.logs,
    [agentId]: [...existing, { from, text: normalizedText }],
  }
}

function normalizeAgentLog(text) {
  const value = (text || '').trim()
  if (!value) return null
  if (value.includes('Failed to connect to IDE companion extension')) return null
  if (value === 'YOLO mode is enabled. All tool calls will be automatically approved.') {
    return 'Auto-approval enabled.'
  }
  if (value === 'Ripgrep is not available. Falling back to GrepTool.') {
    return 'Ripgrep unavailable; using fallback search.'
  }
  if (value.startsWith('Warning: Basic terminal detected')) return null
  if (value.startsWith('Warning: 256-color support not detected')) return null
  return value
}

function buildSteps(workflow, agents, taskPrompt) {
  const workflowNodes = (workflow?.definition?.nodes || []).filter(node => node.type !== 'input')
  const baseNodes = workflowNodes.length ? workflowNodes : fallbackNodes()

  return baseNodes.map((node, index) => {
    const assignee = pickAssignee(node, agents, index)
    const paneId = node.type === 'condition' || node.type === 'output'
      ? 'orchestrator'
      : assignee?.id || 'orchestrator'

    return {
      id: `${node.id || `step-${index}`}-${index}`,
      at: (index + 1) * STEP_INTERVAL_SECONDS,
      label: node.label || `Step ${index + 1}`,
      paneId,
      systemText: buildSystemText(node, assignee),
      agentText: buildAgentText(node, assignee, taskPrompt),
      summaryText: buildSummaryText(node, assignee),
    }
  })
}

function workflowSummary(workflow) {
  if (!workflow?.definition) {
    return 'Uses the built-in fallback orchestration flow.'
  }

  const actionableNodes = (workflow.definition.nodes || []).filter(node =>
    !['input', 'output', 'condition'].includes(node.type),
  )

  if (!actionableNodes.length) {
    return 'Runs the saved nodes in sequence and reports through Loom Weaver.'
  }

  return actionableNodes
    .slice(0, 3)
    .map(node => node.label)
    .join(' → ')
}

function fallbackNodes() {
  return [
    { id: 'plan', type: 'claude', label: 'Plan the task' },
    { id: 'research', type: 'gemini', label: 'Research references' },
    { id: 'implement', type: 'codex', label: 'Implement changes' },
    { id: 'review', type: 'condition', label: 'Review results' },
    { id: 'handoff', type: 'output', label: 'Prepare handoff' },
  ]
}

function pickAssignee(node, agents, index) {
  if (!agents.length) return null

  const byType = {
    claude: 'Claude Code',
    gemini: 'Gemini CLI',
    codex: 'Codex CLI',
    shell: 'Aider',
    file: 'Aider',
    memory: 'OpenCode',
  }

  const preferredName = byType[node.type]
  const preferred = agents.find(agent => agent.name === preferredName)
  if (preferred) return preferred

  return agents[index % agents.length]
}

function buildSystemText(node, assignee) {
  if (node.type === 'condition') {
    return 'Evaluating branch conditions and readiness gates...'
  }
  if (node.type === 'output') {
    return 'Assembling final output package...'
  }
  return `${assignee?.name || 'Agent'} executing "${node.label}".`
}

function buildAgentText(node, assignee, taskPrompt) {
  const promptLine = taskPrompt.split('\n')[0]

  if (node.type === 'condition') {
    return 'Checks passed for the current branch. No blocking issues detected.'
  }

  if (node.type === 'output') {
    return `Prepared a compact handoff based on the workflow output.\nTask focus: ${promptLine}`
  }

  const detail = node.prompt
    ? node.prompt.split('\n')[0]
    : `Breaking the task into actionable output for ${node.label.toLowerCase()}.`

  return `${assignee?.name || 'Agent'} report:\n${detail}\nTask focus: ${promptLine}`
}

function buildSummaryText(node, assignee) {
  if (node.type === 'condition') {
    return `${node.label} resolved. Workflow can continue.`
  }
  if (node.type === 'output') {
    return `${node.label} finalized for handoff.`
  }
  return `${assignee?.name || 'Agent'} finished ${node.label.toLowerCase()}.`
}

function msgStyle(from) {
  if (from === 'system') return { color: 'var(--text-3)', fontStyle: 'italic' }
  return { color: 'var(--text-2)' }
}

function paneMessages(agentId) {
  return session.value.logs[agentId] || []
}
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100%;background:var(--bg);overflow:hidden">
    <div style="height:44px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid var(--border);background:var(--surface);gap:10px;flex-shrink:0">
      <span style="font-size:14px;font-weight:600;color:var(--text)">Multi-Agent</span>
      <div
        style="width:6px;height:6px;border-radius:50%;background:var(--green)"
        :style="{ animation: isRunning ? 'statusGlow 2s ease-in-out infinite' : 'none' }"
      />
      <span
        v-if="session.status !== 'idle'"
        :style="{
          fontSize:'11px',
          fontFamily:'var(--mono)',
          padding:'2px 8px',
          borderRadius:'4px',
          background: isComplete ? 'var(--green-dim)' : 'var(--blue-dim)',
          color: isComplete ? 'var(--green)' : 'var(--blue)',
        }"
      >
        {{ isComplete ? 'Complete' : session.status }}
      </span>
      <div style="flex:1" />
      <span style="font-size:13px;font-family:var(--mono);color:var(--text-2)">{{ formatTime(session.elapsed) }}</span>
      <div v-if="session.status === 'idle' || session.status === 'complete'" style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
        <button
          :disabled="!canStart"
          :style="{
            display:'flex',alignItems:'center',gap:'5px',
            padding:'6px 12px',borderRadius:'var(--r)',fontSize:'12px',border:'none',
            background: canStart ? 'var(--blue)' : 'var(--surface-3)',
            color: canStart ? '#000' : 'var(--text-3)',
            cursor: canStart ? 'pointer' : 'not-allowed',
          }"
          @click="startSession"
        >
          <AppIcon name="play" :size="13" :color="canStart ? '#000' : 'var(--text-3)'" />
          Start
        </button>
        <span
          v-if="startBlockReason"
          style="font-size:10px;color:var(--yellow,#e6c128);font-family:var(--mono);white-space:nowrap"
        >{{ startBlockReason }}</span>
      </div>
      <button
        v-else-if="isRunning"
        :style="{
          display:'flex',alignItems:'center',gap:'5px',
          padding:'6px 12px',borderRadius:'var(--r)',fontSize:'12px',cursor:'pointer',border:'none',
          background:'var(--surface-3)',color:'var(--text-2)',
        }"
        @click="pauseSession"
      >
        <AppIcon name="pause" :size="13" color="var(--text-2)" />
        Pause
      </button>
      <button
        v-else-if="session.status === 'paused'"
        :style="{
          display:'flex',alignItems:'center',gap:'5px',
          padding:'6px 12px',borderRadius:'var(--r)',fontSize:'12px',cursor:'pointer',border:'none',
          background:'var(--blue)',color:'#000',
        }"
        @click="resumeSession"
      >
        <AppIcon name="play" :size="13" color="#000" />
        Resume
      </button>
      <button
        :style="{
          display:'flex',alignItems:'center',gap:'5px',
          padding:'6px 12px',borderRadius:'var(--r)',fontSize:'12px',cursor:'pointer',
          background:'transparent',border:'1px solid var(--border-2)',color:'var(--text-3)',
        }"
        @click="reset"
      >
        <AppIcon name="refresh" :size="13" color="var(--text-3)" />
        Reset
      </button>
    </div>

    <div style="display:grid;grid-template-columns:minmax(320px,360px) 1fr;flex:1;min-height:0">
      <aside style="border-right:1px solid var(--border);background:var(--surface);overflow-y:auto;padding:18px 16px">
        <div style="padding:14px;border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg);margin-bottom:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:8px">
              <AppIcon name="layers" :size="14" color="var(--blue)" />
              <span style="font-size:12px;font-weight:600;color:var(--text)">Workflow</span>
            </div>
            <span style="font-size:10px;color:var(--text-3);font-family:var(--mono)">{{ formatWorkflowCoverage() }}</span>
          </div>
          <div v-if="workflows.length">
            <select
              v-model="selectedWorkflowId"
              style="width:100%;padding:9px 10px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);color:var(--text);font-size:12px;font-family:var(--font);outline:none;cursor:pointer"
            >
              <option v-for="workflow in workflows" :key="workflow.id" :value="workflow.id">
                {{ workflow.name }}
              </option>
            </select>
            <div v-if="selectedWorkflow" style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;gap:8px">
              <span style="font-size:11px;color:var(--text-3);line-height:1.5;flex:1">{{ workflowSummary(selectedWorkflow) }}</span>
              <button
                style="display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:var(--r);font-size:11px;cursor:pointer;background:transparent;border:1px solid var(--border-2);color:var(--text-2);white-space:nowrap;flex-shrink:0"
                @click="window.__forgeNavigate('workflow')"
              >
                <AppIcon name="pencil" :size="10" color="var(--text-2)" />
                Edit
              </button>
            </div>
          </div>
          <div v-else style="display:flex;flex-direction:column;gap:10px">
            <span style="font-size:12px;color:var(--text-2);line-height:1.5">Nenhum workflow encontrado.</span>
            <button
              style="display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:var(--r);font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border-2);background:var(--surface-2);color:var(--text)"
              @click="window.__forgeNavigate('workflow')"
            >
              <AppIcon name="git-branch" :size="13" color="var(--blue)" />
              Go to Workflow Builder →
            </button>
          </div>
        </div>

        <div style="padding:14px;border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg);margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <AppIcon name="folder" :size="14" :color="workspacePath ? 'var(--green)' : 'var(--text-3)'" />
            <span style="font-size:12px;font-weight:600;color:var(--text)">Workspace</span>
            <span
              v-if="!workspacePath"
              style="font-size:10px;color:var(--yellow,#e6c128);font-family:var(--mono);margin-left:auto"
            >obrigatório</span>
          </div>
          <input
            v-model="workspacePath"
            type="text"
            placeholder="/caminho/do/projeto"
            :style="{
              width:'100%',
              padding:'8px 10px',
              borderRadius:'var(--r)',
              border: workspacePath ? '1px solid var(--border-2)' : '1px solid var(--yellow,#e6c128)',
              background:'var(--surface-2)',
              color:'var(--text)',
              fontSize:'12px',
              fontFamily:'var(--mono)',
              outline:'none',
              boxSizing:'border-box',
            }"
          />
          <div style="font-size:11px;color:var(--text-3);margin-top:6px;line-height:1.4">
            Os agentes executarão neste diretório. Sem workspace, o acesso é negado.
          </div>
        </div>

        <div
          v-if="workflowParameters.length"
          style="padding:14px;border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg);margin-bottom:14px"
        >
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <AppIcon name="wand" :size="14" color="var(--blue)" />
            <span style="font-size:12px;font-weight:600;color:var(--text)">Parâmetros</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div v-for="param in workflowParameters" :key="param.key">
              <label style="display:block;font-size:11px;font-weight:500;color:var(--text-2);margin-bottom:4px">
                {{ param.label }}
                <span v-if="param.required" style="color:var(--red);margin-left:2px">*</span>
              </label>
              <select
                v-if="param.type === 'select'"
                v-model="workflowParams[param.key]"
                style="width:100%;padding:8px 10px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);color:var(--text);font-size:12px;font-family:var(--font);outline:none;cursor:pointer"
              >
                <option value="" disabled>Selecione...</option>
                <option v-for="opt in param.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <textarea
                v-else-if="param.type === 'textarea'"
                v-model="workflowParams[param.key]"
                rows="4"
                :placeholder="param.placeholder || ''"
                style="width:100%;resize:vertical;min-height:80px;padding:8px 10px;border-radius:var(--r);border:1px solid var(--border-2);background:var(--surface-2);color:var(--text);font-size:12px;line-height:1.5;outline:none;font-family:var(--font)"
              />
              <input
                v-else
                v-model="workflowParams[param.key]"
                type="text"
                :placeholder="param.placeholder || ''"
                style="width:100%;padding:8px 10px;border-radius:var(--r);border:1px solid var(--border-2);background:var(--surface-2);color:var(--text);font-size:12px;outline:none;font-family:var(--font)"
              />
            </div>
          </div>
        </div>

        <div style="padding:14px;border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span style="font-size:12px;font-weight:600;color:var(--text)">Participants</span>
            <span style="font-size:10px;color:var(--text-3);font-family:var(--mono)">{{ selectedAgents.length }} from workflow</span>
          </div>
          <div v-if="loading" style="font-size:12px;color:var(--text-3)">Loading local agents...</div>
          <div v-else-if="!availableAgents.length" style="font-size:12px;color:var(--text-2);line-height:1.5">
            No local agents found yet. Open the Agents screen to scan the machine first.
          </div>
          <div v-else-if="!selectedAgents.length" style="font-size:12px;color:var(--text-3);line-height:1.5">
            No agent nodes in the selected workflow. Add agent nodes in the Workflow Builder.
          </div>
          <div v-else style="display:flex;flex-direction:column;gap:8px">
            <div
              v-for="agent in selectedAgents"
              :key="agent.id"
              :style="{
                display:'flex',alignItems:'flex-start',gap:'10px',width:'100%',
                padding:'10px',borderRadius:'var(--r)',border:`1px solid ${agent.color}55`,
                background:agent.bg,
              }"
            >
              <div :style="{
                width:'24px',height:'24px',borderRadius:'var(--r)',background:agent.bg,
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
              }">
                <AppIcon :name="agent.icon" :size="13" :color="agent.color" />
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                  <span style="font-size:12px;font-weight:600;color:var(--text)">{{ agent.name }}</span>
                  <span style="font-size:10px;color:var(--text-3);font-family:var(--mono)">{{ agent.status }}</span>
                </div>
                <div style="font-size:11px;color:var(--text-2);margin-top:2px">{{ agent.role }}</div>
                <div style="font-size:10px;color:var(--text-3);font-family:var(--mono);margin-top:5px">{{ agent.model }}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section style="display:flex;flex-direction:column;min-width:0;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);background:var(--surface);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="padding:7px 10px;border-radius:999px;background:var(--surface-2);font-size:11px;color:var(--text-2)">
            {{ session.workflowName || (selectedWorkflow?.name || 'Ad-hoc session') }}
          </div>
          <div style="padding:7px 10px;border-radius:999px;background:var(--surface-2);font-size:11px;color:var(--text-2)">
            {{ stepCount }} coordinated steps
          </div>
          <div v-if="session.summary" style="padding:7px 10px;border-radius:999px;background:var(--green-dim);font-size:11px;color:var(--green)">
            {{ session.summary }}
          </div>
        </div>

        <div
          v-if="session.status === 'idle' && !selectedWorkflow"
          style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px"
        >
          <div style="width:48px;height:48px;border-radius:var(--r-lg);background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center">
            <AppIcon name="git-branch" :size="22" color="var(--text-3)" />
          </div>
          <div style="text-align:center">
            <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px">No workflow loaded</div>
            <div style="font-size:12px;color:var(--text-3);line-height:1.6;max-width:280px">Build a workflow in the Workflow Builder first, then come back here to run it with agents.</div>
          </div>
          <button
            style="display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:var(--r);font-size:13px;font-weight:600;cursor:pointer;border:none;background:var(--blue);color:#000"
            @click="window.__forgeNavigate('workflow')"
          >
            <AppIcon name="git-branch" :size="14" color="#000" />
            Go to Workflow Builder →
          </button>
        </div>

        <div v-else style="flex:1;min-height:0;padding:1px;background:var(--border);display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1px;overflow:auto">
          <div
            v-for="agent in sessionPanes"
            :key="agent.id"
            style="background:var(--bg);display:flex;flex-direction:column;min-height:260px"
          >
            <div :style="{
              height:'38px',display:'flex',alignItems:'center',gap:'8px',padding:'0 12px',
              borderBottom:'1px solid var(--border)',background:'var(--surface)',
            }">
              <div :style="{
                width:'22px',height:'22px',borderRadius:'var(--r)',background:agent.bg,
                display:'flex',alignItems:'center',justifyContent:'center',
              }">
                <AppIcon :name="agent.icon" :size="13" :color="agent.color" />
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;color:var(--text)">{{ agent.name }}</div>
              </div>
              <div
                v-if="session.activePaneId === agent.id && isRunning"
                style="display:flex;align-items:center;gap:3px"
              >
                <span style="animation:streamDot1 1.2s ease-in-out infinite;color:var(--blue);font-size:10px">▪</span>
                <span style="animation:streamDot2 1.2s ease-in-out infinite;color:var(--blue);font-size:10px">▪</span>
                <span style="animation:streamDot3 1.2s ease-in-out infinite;color:var(--blue);font-size:10px">▪</span>
              </div>
              <span style="font-size:10px;color:var(--text-3)">{{ agent.role }}</span>
            </div>

            <div
              :ref="el => setPaneRef(el, agent.id)"
              style="flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px"
            >
              <div
                v-for="(msg, index) in paneMessages(agent.id)"
                :key="`${agent.id}-${index}`"
                :style="{
                  fontSize:'12px',lineHeight:'1.55',whiteSpace:'pre-wrap',wordBreak:'break-word',
                  padding:'6px 8px',borderRadius:'var(--r)',
                  background: msg.from === 'system' ? 'transparent' : 'var(--surface)',
                  border: msg.from === 'system' ? 'none' : '1px solid var(--border)',
                  animation:'agentDetect 0.2s ease',
                  ...msgStyle(msg.from),
                }"
              >
                <span v-if="msg.from === 'system'" style="margin-right:4px;opacity:0.6">·</span>{{ msg.text }}
              </div>
            </div>
          </div>
        </div>

        <div style="flex-shrink:0;border-top:1px solid var(--border);background:var(--surface)">
          <div
            style="display:flex;align-items:center;gap:10px;padding:0 14px;height:36px;cursor:pointer"
            @click="timelineExpanded = !timelineExpanded"
          >
            <div style="flex:1;height:3px;background:var(--surface-3);border-radius:2px;overflow:hidden">
              <div
                :style="{
                  height:'100%',
                  borderRadius:'2px',
                  background:'linear-gradient(90deg,var(--blue),var(--green))',
                  width: progressPct + '%',
                  transition:'width 0.5s ease',
                }"
              />
            </div>
            <span style="font-size:11px;color:var(--text-3);white-space:nowrap">{{ doneEvents }}/{{ stepCount }} events</span>
            <AppIcon :name="timelineExpanded ? 'chevron-down' : 'chevron-up'" :size="13" color="var(--text-3)" />
          </div>

          <div v-if="timelineExpanded" style="padding:12px 16px 14px;position:relative">
            <div style="position:relative;height:32px">
              <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:2px;background:var(--surface-3);border-radius:1px" />
              <div
                :style="{
                  position:'absolute',left:0,top:'50%',transform:'translateY(-50%)',
                  height:'2px',borderRadius:'1px',
                  background:'linear-gradient(90deg,var(--blue),var(--green))',
                  width: progressPct + '%',
                }"
              />
              <div
                v-for="step in session.steps"
                :key="step.id"
                :style="{
                  position:'absolute',top:'50%',transform:'translate(-50%,-50%)',
                  left: totalDuration ? ((step.at / totalDuration) * 100) + '%' : '0%',
                  width:'8px',height:'8px',borderRadius:'50%',
                  background: session.completedStepIds.includes(step.id) ? 'var(--green)' : 'var(--surface-3)',
                  border:`2px solid ${session.completedStepIds.includes(step.id) ? 'var(--green)' : 'var(--border-2)'}`,
                  zIndex:1,
                }"
                :title="step.label"
              />
              <div
                v-if="totalDuration"
                :style="{
                  position:'absolute',top:'50%',transform:'translate(-50%,-50%)',
                  left: Math.min((session.elapsed / totalDuration) * 100, 100) + '%',
                  width:'2px',height:'22px',background:'var(--blue)',borderRadius:'1px',
                  boxShadow:'0 0 8px var(--blue-glow)',
                }"
              />
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:6px">
              <span style="font-size:10px;color:var(--text-3);font-family:var(--mono)">0:00</span>
              <span style="font-size:10px;color:var(--text-3);font-family:var(--mono)">{{ formatTime(totalDuration) }}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:12px">
              <div
                v-for="step in session.steps"
                :key="`${step.id}-label`"
                style="padding:8px 9px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg)"
              >
                <div style="font-size:11px;color:var(--text)">{{ step.label }}</div>
                <div style="font-size:10px;color:var(--text-3);font-family:var(--mono);margin-top:3px">
                  {{ formatTime(step.at) }} · {{ step.paneId === 'orchestrator' ? 'Loom Weaver' : (availableAgents.find(agent => agent.id === step.paneId)?.name || 'Agent') }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
