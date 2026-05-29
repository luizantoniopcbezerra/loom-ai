<script setup>
import { ref, computed, watch, onUnmounted, nextTick, onMounted } from 'vue'
import AppIcon from './AppIcon.vue'
import { api } from '../lib/api.js'
import { activeWorkflowId } from '../lib/workflowState.js'
import { PLANNER_PROMPT, SPEC_WRITER_PROMPT, FEATURE_IMPLEMENTATION_PROMPT } from '../lib/defaultPrompts.js'
import { getAdapterMeta } from '../lib/agentModels.js'
import { agents as storeAgents, loadAgents as fetchAgents } from '../lib/agentsStore.js'

const NODE_TYPES = {
  input:     { label: 'Prompt Input',  color: '#00cc88', icon: 'inbox',      bg: 'rgba(0,204,136,0.1)' },
  agent:     { label: 'AI Agent',      color: '#7878a8', icon: 'agent',      bg: 'rgba(120,120,168,0.1)' },
  shell:     { label: 'Shell Command', color: '#e6c128', icon: 'terminal',   bg: 'rgba(230,193,40,0.1)' },
  condition: { label: 'Condition',     color: '#d93346', icon: 'git-branch', bg: 'rgba(217,51,70,0.1)' },
  memory:    { label: 'Memory',        color: '#00b8d4', icon: 'database',   bg: 'rgba(0,184,212,0.1)' },
  file:      { label: 'File Writer',   color: '#e6c128', icon: 'file-text',  bg: 'rgba(230,193,40,0.1)' },
  output:    { label: 'Output',        color: '#7878a8', icon: 'send',       bg: 'rgba(120,120,168,0.1)' },
}

const agentOptions = computed(() => {
  const seen = new Set()
  return storeAgents.value
    .filter(a => {
      const type = a.adapterType || a.adapter_type
      if (!type || seen.has(type)) return false
      seen.add(type)
      return true
    })
    .map(a => {
      const type = a.adapterType || a.adapter_type
      const meta = getAdapterMeta(type)
      return { value: type, label: meta.label, shortLabel: meta.shortLabel, color: meta.color, icon: meta.icon, bg: meta.bgColor }
    })
})

const LEGACY_TYPE_TO_ADAPTER = { claude: 'claude_local', gemini: 'gemini_local', codex: 'codex_local' }

const DEFAULT_NODES = [
  {
    id:'n1', type:'input', x:60, y:200, label:'Prompt Input', status:'queued',
    parameters:[{ key:'PROJECT_CONTEXT', label:'Project Context', type:'textarea', placeholder:'Descreva o contexto do projeto, objetivos e requisitos...', required:true, options:'' }],
  },
  {
    id:'n2', type:'agent', agentType:'claude_local', x:260, y:200, label:'Planner', status:'queued',
    prompt: PLANNER_PROMPT,
  },
  {
    id:'n3', type:'agent', agentType:'claude_local', x:480, y:200, label:'Spec Writer', status:'queued',
    prompt: SPEC_WRITER_PROMPT,
  },
  {
    id:'n4', type:'agent', agentType:'claude_local', x:700, y:200, label:'Feature Implementation', status:'queued',
    prompt: FEATURE_IMPLEMENTATION_PROMPT,
  },
  {
    id:'n5', type:'agent', agentType:'claude_local', x:920, y:200, label:'Code Review', status:'queued',
    prompt:'You are a code reviewer.\n\nReview the implementation against these principles:\n- Object Calisthenics (9 rules): one indent level per method, no else, wrap primitives, first-class collections, one dot per line, no abbreviations, small entities, max 2 instance variables, no getters/setters\n- KISS: solutions as simple as possible\n- YAGNI: no premature features\n- DRY: no code duplication\n- Less Code Best Code: minimal, concise implementations\n\nFor each violation: specify the rule, location, and suggested fix. Provide an overall quality score and summary.',
  },
  {
    id:'n6', type:'output', x:1140, y:200, label:'Final Output', status:'queued',
  },
]
const DEFAULT_EDGES = [
  { from:'n1', to:'n2' },
  { from:'n2', to:'n3' },
  { from:'n3', to:'n4' },
  { from:'n4', to:'n5' },
  { from:'n5', to:'n6' },
]

const INIT_NODES = DEFAULT_NODES
const INIT_EDGES = DEFAULT_EDGES
const NODE_W = 148
const NODE_H = 62
const GRID_SIZE = 24
const MIN_ZOOM = 0.4
const MAX_ZOOM = 1.8
const ZOOM_STEP = 0.1

const nodes = ref(INIT_NODES.map(n => ({ ...n })))
const edges = ref(INIT_EDGES.map(e => ({ ...e })))
const selectedNode = ref(null)
const executing = ref(false)
const panOffset = ref({ x: 20, y: 40 })
const zoom = ref(1)
const panning = ref(false)
const draggingNodeId = ref(null)
const addOpen = ref(false)
const promptDraft = ref('')
const saveFlash = ref(false)
const svgRef = ref(null)
const containerRef = ref(null)
const renameVal = ref('')
const renamingId = ref(null)
const workflowId = ref(null)
const persistTimer = ref(null)
const hydrating = ref(true)
const workflows = ref([])
const workflowName = ref('Main Workflow')
const selectorOpen = ref(false)
const selectorRef = ref(null)
let dragCleanup = null
let panCleanup = null

const connectingFrom = ref(null)
const connectPreviewEnd = ref(null)
const hoverInputNodeId = ref(null)

const nodeParams = ref([])
const addingParam = ref(false)
const editingParamIndex = ref(null)
const paramDraft = ref(createEmptyParam())

function createEmptyParam() {
  return { key: '', label: '', type: 'text', placeholder: '', required: false, options: '' }
}

watch(() => selectedNode.value?.id, () => {
  if (selectedNode.value) {
    promptDraft.value = selectedNode.value.prompt || `You are ${selectedNode.value.label}.\nAnalyze the input and produce structured output.`
    renameVal.value = selectedNode.value.label
    nodeParams.value = (selectedNode.value.parameters || []).map(p => ({ ...p, options: Array.isArray(p.options) ? p.options.join(', ') : (p.options || '') }))
  }
  addingParam.value = false
  editingParamIndex.value = null
  paramDraft.value = createEmptyParam()
})

const hasChanges = computed(() =>
  selectedNode.value &&
  promptDraft.value !== (selectedNode.value.prompt || `You are ${selectedNode.value.label}.\nAnalyze the input and produce structured output.`)
)

function bezierPath(fromNode, toNode) {
  const fx = fromNode.x + NODE_W
  const fy = fromNode.y + NODE_H / 2
  const tx = toNode.x
  const ty = toNode.y + NODE_H / 2
  const dx = tx - fx
  const cx1 = fx + dx * 0.55
  const cx2 = tx - dx * 0.55
  return `M ${fx} ${fy} C ${cx1} ${fy} ${cx2} ${ty} ${tx} ${ty}`
}

function getEdgePoints() {
  return edges.value.map(edge => {
    const fromNode = nodes.value.find(n => n.id === edge.from)
    const toNode = nodes.value.find(n => n.id === edge.to)
    if (!fromNode || !toNode) return null
    return { path: bezierPath(fromNode, toNode), from: edge.from, to: edge.to }
  }).filter(Boolean)
}

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function getWorldPoint(clientX, clientY) {
  const svgEl = svgRef.value
  if (!svgEl) return { x: 0, y: 0 }
  const rect = svgEl.getBoundingClientRect()
  return {
    x: (clientX - rect.left - panOffset.value.x) / zoom.value,
    y: (clientY - rect.top - panOffset.value.y) / zoom.value,
  }
}

function startDrag(e, nodeId) {
  e.stopPropagation()
  e.preventDefault()
  if (e.target.closest('foreignObject')) return
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return
  draggingNodeId.value = nodeId
  const startPoint = getWorldPoint(e.clientX, e.clientY)
  const startX = startPoint.x - node.x
  const startY = startPoint.y - node.y

  function onMove(me) {
    const point = getWorldPoint(me.clientX, me.clientY)
    node.x = point.x - startX
    node.y = point.y - startY
  }
  function onUp() {
    draggingNodeId.value = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    dragCleanup = null
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  dragCleanup = onUp
}

function startPan(e) {
  if (e.button !== 0) return
  if (draggingNodeId.value) return
  if (e.target.closest('[data-node]')) return
  e.preventDefault()

  const startX = e.clientX - panOffset.value.x
  const startY = e.clientY - panOffset.value.y
  panning.value = true

  function onMove(me) {
    panOffset.value = {
      x: me.clientX - startX,
      y: me.clientY - startY,
    }
  }

  function onUp() {
    panning.value = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    panCleanup = null
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  panCleanup = onUp
}

function zoomAtPoint(nextZoom, clientX, clientY) {
  const svgEl = svgRef.value
  if (!svgEl) return

  const rect = svgEl.getBoundingClientRect()
  const clampedZoom = clampZoom(nextZoom)
  const worldX = (clientX - rect.left - panOffset.value.x) / zoom.value
  const worldY = (clientY - rect.top - panOffset.value.y) / zoom.value

  zoom.value = clampedZoom
  panOffset.value = {
    x: clientX - rect.left - worldX * clampedZoom,
    y: clientY - rect.top - worldY * clampedZoom,
  }
}

function handleWheel(e) {
  e.preventDefault()
  const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
  zoomAtPoint(zoom.value + delta, e.clientX, e.clientY)
}

function zoomFromCenter(delta) {
  const svgEl = svgRef.value
  if (!svgEl) return
  const rect = svgEl.getBoundingClientRect()
  zoomAtPoint(
    zoom.value + delta,
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  )
}

function resetViewport() {
  panOffset.value = { x: 20, y: 40 }
  zoom.value = 1
}

function selectNode(e, node) {
  e.stopPropagation()
  selectedNode.value = selectedNode.value?.id === node.id ? null : { ...node }
}

function resetToDefault() {
  nodes.value = DEFAULT_NODES.map(n => ({ ...n }))
  edges.value = DEFAULT_EDGES.map(e => ({ ...e }))
  selectedNode.value = null
  resetViewport()
}

function simulate() {
  if (executing.value) return
  executing.value = true
  nodes.value.forEach(n => { if (n.status === 'queued') n.status = 'running' })
  setTimeout(() => {
    nodes.value.forEach(n => { if (n.status === 'running') n.status = 'done' })
    setTimeout(() => { executing.value = false }, 1800)
  }, 600)
}

function addNode(type) {
  const svgEl = svgRef.value
  const w = svgEl ? svgEl.clientWidth : 800
  const h = svgEl ? svgEl.clientHeight : 500
  const jx = (Math.random() - 0.5) * 60
  const jy = (Math.random() - 0.5) * 60
  const id = 'n' + Date.now()
  nodes.value.push({
    id,
    type,
    ...(type === 'agent' ? { agentType: 'claude_local' } : {}),
    x: (w / 2 - panOffset.value.x) / zoom.value - NODE_W / 2 + jx,
    y: (h / 2 - panOffset.value.y) / zoom.value - NODE_H / 2 + jy,
    label: NODE_TYPES[type].label,
    status: 'queued',
  })
  addOpen.value = false
}

function deleteNode(id) {
  nodes.value = nodes.value.filter(n => n.id !== id)
  edges.value = edges.value.filter(e => e.from !== id && e.to !== id)
  if (selectedNode.value?.id === id) selectedNode.value = null
}

function deleteEdge(fromId, toId) {
  edges.value = edges.value.filter(e => !(e.from === fromId && e.to === toId))
}

function startConnect(e, nodeId) {
  e.stopPropagation()
  e.preventDefault()
  connectingFrom.value = nodeId
  connectPreviewEnd.value = getWorldPoint(e.clientX, e.clientY)

  function onMove(me) {
    connectPreviewEnd.value = getWorldPoint(me.clientX, me.clientY)
  }
  function onUp() {
    const fromId = connectingFrom.value
    const toId = hoverInputNodeId.value
    if (fromId && toId && fromId !== toId) {
      const exists = edges.value.some(e => e.from === fromId && e.to === toId)
      if (!exists) edges.value.push({ from: fromId, to: toId })
    }
    connectingFrom.value = null
    connectPreviewEnd.value = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function connectPreviewPath() {
  if (!connectingFrom.value || !connectPreviewEnd.value) return null
  const fromNode = nodes.value.find(n => n.id === connectingFrom.value)
  if (!fromNode) return null
  const fx = fromNode.x + NODE_W
  const fy = fromNode.y + NODE_H / 2
  const tx = connectPreviewEnd.value.x
  const ty = connectPreviewEnd.value.y
  const dx = tx - fx
  const cx1 = fx + dx * 0.55
  const cx2 = tx - dx * 0.55
  return `M ${fx} ${fy} C ${cx1} ${fy} ${cx2} ${ty} ${tx} ${ty}`
}

function renameNode(id, label) {
  const node = nodes.value.find(n => n.id === id)
  if (node) node.label = label
  if (selectedNode.value?.id === id) selectedNode.value = { ...selectedNode.value, label }
}

function savePrompt() {
  const node = nodes.value.find(n => n.id === selectedNode.value?.id)
  if (node) {
    node.prompt = promptDraft.value
    selectedNode.value = { ...selectedNode.value, prompt: promptDraft.value }
  }
  saveFlash.value = true
  setTimeout(() => { saveFlash.value = false }, 1200)
}

function commitParam() {
  const draft = paramDraft.value
  if (!draft.key.trim() || !draft.label.trim()) return
  const serialized = {
    key: draft.key.trim(),
    label: draft.label.trim(),
    type: draft.type,
    placeholder: draft.placeholder,
    required: draft.required,
    ...(draft.type === 'select' ? { options: draft.options.split(',').map(o => o.trim()).filter(Boolean) } : {}),
  }
  if (editingParamIndex.value !== null) {
    nodeParams.value.splice(editingParamIndex.value, 1, { ...serialized, options: draft.options })
  } else {
    nodeParams.value.push({ ...serialized, options: draft.options })
  }
  persistParams()
  cancelParamEdit()
}

function editParam(index) {
  editingParamIndex.value = index
  addingParam.value = true
  const p = nodeParams.value[index]
  paramDraft.value = { ...p }
}

function deleteParam(index) {
  nodeParams.value.splice(index, 1)
  persistParams()
}

function cancelParamEdit() {
  addingParam.value = false
  editingParamIndex.value = null
  paramDraft.value = createEmptyParam()
}

function persistParams() {
  const node = nodes.value.find(n => n.id === selectedNode.value?.id)
  if (!node) return
  node.parameters = nodeParams.value.map(p => ({
    key: p.key,
    label: p.label,
    type: p.type,
    placeholder: p.placeholder || '',
    required: !!p.required,
    ...(p.type === 'select' ? { options: typeof p.options === 'string' ? p.options.split(',').map(o => o.trim()).filter(Boolean) : p.options } : {}),
  }))
  selectedNode.value = { ...selectedNode.value, parameters: node.parameters }
}

function getNodeMeta(node) {
  if (node.type === 'agent' || LEGACY_TYPE_TO_ADAPTER[node.type]) {
    const adapterType = node.agentType || LEGACY_TYPE_TO_ADAPTER[node.type] || 'claude_local'
    const opt = agentOptions.value.find(o => o.value === adapterType)
    if (opt) return { label: 'AI Agent', color: opt.color, icon: opt.icon, bg: opt.bg, shortLabel: opt.shortLabel }
    const meta = getAdapterMeta(adapterType)
    return { label: 'AI Agent', color: meta.color, icon: meta.icon, bg: meta.bgColor, shortLabel: meta.shortLabel }
  }
  const t = NODE_TYPES[node.type]
  return t ? { ...t, shortLabel: t.label } : { label: 'Unknown', color: '#444', icon: 'code', bg: 'rgba(68,68,68,0.1)', shortLabel: '?' }
}

const selectedNodeMeta = computed(() => selectedNode.value ? getNodeMeta(selectedNode.value) : null)
const isAgentNode = computed(() => !!(selectedNode.value && (selectedNode.value.type === 'agent' || LEGACY_TYPE_TO_ADAPTER[selectedNode.value.type])))
const selectedAgentType = computed(() => selectedNode.value ? (selectedNode.value.agentType || LEGACY_TYPE_TO_ADAPTER[selectedNode.value.type] || 'claude_local') : 'claude_local')

function setNodeAgent(agentType) {
  const node = nodes.value.find(n => n.id === selectedNode.value?.id)
  if (!node) return
  node.type = 'agent'
  node.agentType = agentType
  selectedNode.value = { ...selectedNode.value, type: 'agent', agentType }
}

function statusColor(status) {
  if (status === 'done') return '#00cc88'
  if (status === 'running') return '#00b8d4'
  if (status === 'queued') return '#404040'
  return '#404040'
}

function edgeColor(edge) {
  const fromNode = nodes.value.find(n => n.id === edge.from)
  if (!fromNode) return 'var(--border-2)'
  if (fromNode.status === 'done') return 'rgba(0,204,136,0.5)'
  if (fromNode.status === 'running') return 'rgba(0,184,212,0.5)'
  return 'var(--border-2)'
}

watch([nodes, edges], () => {
  if (hydrating.value) return
  queuePersist()
}, { deep: true })

async function loadAgents() {
  await fetchAgents()
}

onMounted(() => {
  loadWorkflow()
  loadAgents()
  document.addEventListener('mousedown', handleOutsideClick)
})

onUnmounted(() => {
  clearTimeout(persistTimer.value)
  dragCleanup?.()
  panCleanup?.()
  document.removeEventListener('mousedown', handleOutsideClick)
})

function queuePersist() {
  clearTimeout(persistTimer.value)
  persistTimer.value = setTimeout(() => {
    persistWorkflow()
  }, 500)
}

async function loadWorkflow() {
  const list = await api.getWorkflows()
  workflows.value = list
  const latestWorkflow = list[0]
  if (!latestWorkflow?.definition) {
    hydrating.value = false
    return
  }

  workflowId.value = latestWorkflow.id
  workflowName.value = latestWorkflow.name
  nodes.value = latestWorkflow.definition.nodes?.map(node => ({ ...node })) || []
  edges.value = latestWorkflow.definition.edges?.map(edge => ({ ...edge })) || []
  activeWorkflowId.value = latestWorkflow.id
  hydrating.value = false
}

async function persistWorkflow() {
  const payload = {
    name: workflowName.value,
    definition: {
      nodes: nodes.value,
      edges: edges.value,
    },
  }

  if (workflowId.value) {
    await api.updateWorkflow(workflowId.value, payload)
    const idx = workflows.value.findIndex(w => w.id === workflowId.value)
    if (idx !== -1) workflows.value[idx] = { ...workflows.value[idx], name: workflowName.value }
    return
  }

  const workflow = await api.createWorkflow(payload)
  workflowId.value = workflow.id
  workflows.value.unshift(workflow)
}

async function switchWorkflow(targetId) {
  if (targetId === workflowId.value) { selectorOpen.value = false; return }
  clearTimeout(persistTimer.value)
  await persistWorkflow()
  const list = await api.getWorkflows()
  workflows.value = list
  const target = list.find(w => w.id === targetId)
  if (!target) return
  hydrating.value = true
  workflowId.value = target.id
  workflowName.value = target.name
  nodes.value = target.definition?.nodes?.map(n => ({ ...n })) || []
  edges.value = target.definition?.edges?.map(e => ({ ...e })) || []
  selectedNode.value = null
  panOffset.value = { x: 20, y: 40 }
  activeWorkflowId.value = target.id
  hydrating.value = false
  selectorOpen.value = false
}

async function newWorkflow() {
  clearTimeout(persistTimer.value)
  await persistWorkflow()
  const workflow = await api.createWorkflow({
    name: 'Novo Workflow',
    definition: { nodes: [], edges: [] },
  })
  workflows.value.unshift(workflow)
  workflowId.value = workflow.id
  workflowName.value = workflow.name
  hydrating.value = true
  nodes.value = []
  edges.value = []
  selectedNode.value = null
  panOffset.value = { x: 20, y: 40 }
  activeWorkflowId.value = workflow.id
  hydrating.value = false
  selectorOpen.value = false
}

async function runWithAgents() {
  await persistWorkflow()
  activeWorkflowId.value = workflowId.value
  window.__forgeNavigate('multiagent')
}

async function renameWorkflow() {
  if (!workflowId.value || !workflowName.value.trim()) return
  workflowName.value = workflowName.value.trim()
  await persistWorkflow()
}

function startRenameOther(wf, e) {
  e.stopPropagation()
  renamingId.value = wf.id
  renameVal.value = wf.name
}

async function commitRenameOther(wf) {
  const trimmed = renameVal.value.trim()
  renamingId.value = null
  if (!trimmed || trimmed === wf.name) return
  const idx = workflows.value.findIndex(w => w.id === wf.id)
  if (idx !== -1) workflows.value[idx] = { ...workflows.value[idx], name: trimmed }
  await api.updateWorkflow(wf.id, { name: trimmed, definition: wf.definition })
}

async function deleteWorkflow(wf) {
  if (workflows.value.length <= 1) return
  await api.deleteWorkflow(wf.id)
  workflows.value = workflows.value.filter(w => w.id !== wf.id)
  if (wf.id === workflowId.value) {
    const next = workflows.value[0]
    if (next) {
      hydrating.value = true
      workflowId.value = next.id
      workflowName.value = next.name
      nodes.value = next.definition?.nodes?.map(n => ({ ...n })) || []
      edges.value = next.definition?.edges?.map(e => ({ ...e })) || []
      selectedNode.value = null
      nodeParams.value = []
      panOffset.value = { x: 20, y: 40 }
      activeWorkflowId.value = next.id
      hydrating.value = false
    }
  }
  selectorOpen.value = false
}

function handleOutsideClick(e) {
  if (selectorRef.value && !selectorRef.value.contains(e.target)) {
    selectorOpen.value = false
  }
}
</script>

<template>
  <div ref="containerRef" style="display:flex;height:100%;background:var(--bg);overflow:hidden;position:relative">
    <!-- SVG canvas -->
    <div style="flex:1;position:relative;overflow:hidden">
      <!-- Toolbar -->
      <div style="position:absolute;top:12px;left:12px;right:12px;z-index:10;display:flex;align-items:center;gap:8px;pointer-events:none">
        <!-- Workflow selector -->
        <div ref="selectorRef" style="pointer-events:all;position:relative">
          <button
            style="display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:6px 12px;cursor:pointer"
            @click.stop="selectorOpen = !selectorOpen"
          >
            <AppIcon name="layers" :size="13" color="var(--text-3)" />
            <span style="font-size:13px;font-weight:600;color:var(--text);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ workflowName }}</span>
            <span style="font-size:11px;color:var(--text-3);font-family:var(--mono)">· {{ nodes.length }}n · {{ edges.length }}e</span>
            <AppIcon name="chevron-down" :size="11" color="var(--text-3)" :style="{ transform: selectorOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }" />
          </button>
          <div
            v-if="selectorOpen"
            style="position:absolute;top:calc(100% + 6px);left:0;min-width:240px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:6px;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,0.35);display:flex;flex-direction:column;gap:2px"
          >
            <div style="padding:4px 8px 2px;font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Workflow atual</div>
            <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:var(--r);background:var(--surface-2)">
              <AppIcon name="edit-2" :size="11" color="var(--text-3)" />
              <input
                v-model="workflowName"
                style="flex:1;background:transparent;border:none;font-size:12px;font-weight:600;color:var(--text);outline:none;font-family:var(--font)"
                @blur="renameWorkflow"
                @keydown.enter.prevent="$event.target.blur()"
              />
              <button
                v-if="workflows.length > 1"
                style="padding:3px;background:transparent;border:none;cursor:pointer;border-radius:var(--r);flex-shrink:0;display:flex;align-items:center"
                title="Excluir workflow"
                @click.stop="deleteWorkflow(workflows.find(w => w.id === workflowId))"
              >
                <AppIcon name="trash-2" :size="12" color="var(--red)" />
              </button>
            </div>
            <template v-if="workflows.filter(w => w.id !== workflowId).length">
              <div style="height:1px;background:var(--border);margin:4px 2px" />
              <div style="padding:4px 8px 2px;font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Outros</div>
              <div
                v-for="wf in workflows.filter(w => w.id !== workflowId)"
                :key="wf.id"
                style="display:flex;align-items:center;gap:4px;border-radius:var(--r)"
                @mouseenter="e => e.currentTarget.style.background='var(--surface-2)'"
                @mouseleave="e => e.currentTarget.style.background='transparent'"
              >
                <template v-if="renamingId === wf.id">
                  <AppIcon name="layers" :size="12" color="var(--text-3)" style="flex-shrink:0;margin-left:8px" />
                  <input
                    :ref="el => el?.focus()"
                    v-model="renameVal"
                    style="flex:1;background:transparent;border:none;font-size:12px;color:var(--text);outline:none;font-family:var(--font);padding:6px 4px;min-width:0"
                    @blur="commitRenameOther(wf)"
                    @keydown.enter.prevent="$event.target.blur()"
                    @keydown.esc.prevent="renamingId = null"
                    @click.stop
                  />
                </template>
                <button
                  v-else
                  style="flex:1;display:flex;align-items:center;gap:8px;padding:6px 8px;background:transparent;border:none;cursor:pointer;text-align:left;min-width:0"
                  @click="switchWorkflow(wf.id)"
                >
                  <AppIcon name="layers" :size="12" color="var(--text-3)" />
                  <span style="font-size:12px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ wf.name }}</span>
                </button>
                <button
                  v-if="renamingId !== wf.id"
                  style="padding:5px 6px;background:transparent;border:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center"
                  title="Renomear workflow"
                  @click.stop="startRenameOther(wf, $event)"
                >
                  <AppIcon name="edit-2" :size="11" color="var(--text-3)" />
                </button>
                <button
                  style="padding:5px 6px;background:transparent;border:none;cursor:pointer;flex-shrink:0;display:flex;align-items:center"
                  title="Excluir workflow"
                  @click.stop="deleteWorkflow(wf)"
                >
                  <AppIcon name="trash-2" :size="12" color="var(--red)" />
                </button>
              </div>
            </template>
            <div style="height:1px;background:var(--border);margin:4px 2px" />
            <button
              style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:transparent;border:none;border-radius:var(--r);cursor:pointer;text-align:left;width:100%"
              @mouseenter="e => e.currentTarget.style.background='var(--surface-2)'"
              @mouseleave="e => e.currentTarget.style.background='transparent'"
              @click="newWorkflow"
            >
              <AppIcon name="plus" :size="12" color="var(--blue)" />
              <span style="font-size:12px;color:var(--blue);font-weight:600">Novo Workflow</span>
            </button>
          </div>
        </div>
        <div style="flex:1" />
        <button
          style="pointer-events:all;display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--r);font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border-2);background:var(--surface);color:var(--text-2);transition:background 0.15s"
          @mouseenter="e => e.currentTarget.style.background='var(--surface-2)'"
          @mouseleave="e => e.currentTarget.style.background='var(--surface)'"
          @click="resetViewport"
        >
          <AppIcon name="locate-fixed" :size="13" color="var(--text-3)" />
          Reset View
        </button>
        <button
          style="pointer-events:all;display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--r);font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border-2);background:var(--surface);color:var(--text-2);transition:background 0.15s"
          @mouseenter="e => e.currentTarget.style.background='var(--surface-2)'"
          @mouseleave="e => e.currentTarget.style.background='var(--surface)'"
          @click="resetToDefault"
        >
          <AppIcon name="refresh-cw" :size="13" color="var(--text-3)" />
          Default Workflow
        </button>
        <button
          style="pointer-events:all;display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--r);font-size:12px;font-weight:600;cursor:pointer;border:none;background:var(--blue);color:#000;transition:opacity 0.15s"
          :disabled="!workflowId"
          :style="{ opacity: workflowId ? 1 : 0.5, cursor: workflowId ? 'pointer' : 'not-allowed' }"
          @click="runWithAgents"
        >
          <AppIcon name="zap" :size="13" color="#000" />
          Run with Agents →
        </button>
        <div style="pointer-events:all;display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:6px 10px">
          <button
            style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:var(--r);border:none;background:transparent;cursor:pointer"
            @click="zoomFromCenter(-ZOOM_STEP)"
          >
            <AppIcon name="minus" :size="12" color="var(--text-2)" />
          </button>
          <span style="min-width:42px;text-align:center;font-size:11px;color:var(--text-2);font-family:var(--mono)">{{ Math.round(zoom * 100) }}%</span>
          <button
            style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:var(--r);border:none;background:transparent;cursor:pointer"
            @click="zoomFromCenter(ZOOM_STEP)"
          >
            <AppIcon name="plus" :size="12" color="var(--text-2)" />
          </button>
        </div>
      </div>

      <svg
        ref="svgRef"
        :style="{ width:'100%', height:'100%', display:'block', cursor: panning ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }"
        @pointerdown="startPan"
        @wheel.prevent="handleWheel"
        @click="selectedNode = null; addOpen = false"
      >
        <!-- Dot grid background -->
        <defs>
          <pattern id="dotgrid" x="0" y="0" :width="GRID_SIZE * zoom" :height="GRID_SIZE * zoom" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="var(--border)" />
          </pattern>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.4)" />
          </filter>
        </defs>
        <rect
          :x="panOffset.x % (GRID_SIZE * zoom)"
          :y="panOffset.y % (GRID_SIZE * zoom)"
          width="100%"
          height="100%"
          fill="url(#dotgrid)"
        />

        <g :transform="`translate(${panOffset.x},${panOffset.y}) scale(${zoom})`">
          <!-- Edges -->
          <g v-for="(ep, i) in getEdgePoints()" :key="i" style="cursor:pointer" @click.stop="deleteEdge(ep.from, ep.to)">
            <path
              :d="ep.path"
              fill="none"
              stroke="transparent"
              stroke-width="12"
            />
            <path
              :d="ep.path"
              fill="none"
              :stroke="edgeColor({ from: ep.from, to: ep.to })"
              stroke-width="1.5"
              stroke-linecap="round"
              style="pointer-events:none"
            />
          </g>

          <!-- Connection preview -->
          <path
            v-if="connectPreviewPath()"
            :d="connectPreviewPath()"
            fill="none"
            stroke="var(--blue)"
            stroke-width="1.5"
            stroke-dasharray="6,4"
            stroke-linecap="round"
            opacity="0.8"
            style="pointer-events:none"
          />

          <!-- Nodes -->
          <g
            v-for="node in nodes"
            :key="node.id"
            data-node
            :transform="`translate(${node.x},${node.y})`"
            style="cursor:pointer"
            @pointerdown="e => startDrag(e, node.id)"
            @click="e => selectNode(e, node)"
          >
            <!-- Shadow (selected) -->
            <rect
              v-if="selectedNode?.id === node.id"
              :x="-3" :y="-3"
              :width="NODE_W + 6" :height="NODE_H + 6"
              rx="8"
              fill="none"
              :stroke="getNodeMeta(node).color"
              stroke-width="1.5"
              opacity="0.5"
            />
            <!-- Card background -->
            <rect
              :width="NODE_W" :height="NODE_H"
              rx="6"
              :fill="getNodeMeta(node).bg"
              :stroke="selectedNode?.id === node.id ? getNodeMeta(node).color : 'var(--border-2)'"
              stroke-width="1"
            />
            <!-- Left accent bar -->
            <rect
              x="0" y="6"
              width="3"
              :height="NODE_H - 12"
              rx="2"
              :fill="getNodeMeta(node).color"
            />

            <!-- Icon (foreignObject) -->
            <foreignObject x="10" y="10" width="20" height="20" style="overflow:visible;pointer-events:none">
              <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:20px;height:20px">
                <AppIcon
                  :name="getNodeMeta(node).icon"
                  :size="14"
                  :color="getNodeMeta(node).color"
                />
              </div>
            </foreignObject>

            <!-- Label (foreignObject) -->
            <foreignObject x="34" y="8" :width="NODE_W - 44" height="28" style="overflow:visible;pointer-events:none">
              <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:11px;font-weight:600;color:var(--text);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font)">
                {{ node.label }}
              </div>
            </foreignObject>

            <!-- Type label -->
            <foreignObject x="34" y="26" :width="NODE_W - 44" height="18" style="overflow:visible;pointer-events:none">
              <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:10px;color:var(--text-3);font-family:var(--mono);overflow:hidden;white-space:nowrap">
                {{ getNodeMeta(node).shortLabel }}
              </div>
            </foreignObject>

            <!-- Status dot -->
            <circle
              :cx="NODE_W - 10" :cy="10"
              r="4"
              :fill="statusColor(node.status)"
            >
              <animate
                v-if="node.status === 'running'"
                attributeName="opacity"
                values="1;0.3;1"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </circle>

            <!-- Input port (left) -->
            <circle
              :cx="0" :cy="NODE_H / 2"
              r="5"
              :fill="connectingFrom && hoverInputNodeId === node.id && connectingFrom !== node.id ? getNodeMeta(node).color : 'var(--bg)'"
              :stroke="getNodeMeta(node).color"
              stroke-width="1.5"
              style="cursor:crosshair"
              @pointerdown.stop
              @pointerenter="hoverInputNodeId = node.id"
              @pointerleave="hoverInputNodeId = null"
            />

            <!-- Output port (right) -->
            <circle
              :cx="NODE_W" :cy="NODE_H / 2"
              r="5"
              :fill="connectingFrom === node.id ? getNodeMeta(node).color : 'var(--bg)'"
              :stroke="getNodeMeta(node).color"
              stroke-width="1.5"
              style="cursor:crosshair"
              @pointerdown.stop="startConnect($event, node.id)"
            />
          </g>
        </g>
      </svg>

      <!-- Status legend -->
      <div style="position:absolute;bottom:16px;left:16px;display:flex;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:6px 12px">
        <div v-for="s in [{label:'Done',color:'#00cc88'},{label:'Running',color:'#00b8d4'},{label:'Queued',color:'#404040'}]" :key="s.label" style="display:flex;align-items:center;gap:5px">
          <div :style="{ width:'6px',height:'6px',borderRadius:'50%',background:s.color }" />
          <span style="font-size:11px;color:var(--text-3)">{{ s.label }}</span>
        </div>
      </div>

      <!-- FAB -->
      <div style="position:absolute;bottom:16px;right:16px;display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <!-- Node type picker -->
        <div v-if="addOpen" style="display:flex;flex-direction:column;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:6px;animation:fadeUp 0.15s ease">
          <button
            v-for="(nt, key) in NODE_TYPES"
            :key="key"
            style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:transparent;border:none;border-radius:var(--r);cursor:pointer;width:100%;text-align:left;transition:background 0.1s;white-space:nowrap"
            @mouseenter="e => e.currentTarget.style.background='var(--surface-2)'"
            @mouseleave="e => e.currentTarget.style.background='transparent'"
            @click.stop="addNode(key)"
          >
            <AppIcon :name="nt.icon" :size="14" :color="nt.color" />
            <span style="font-size:12px;color:var(--text-2)">{{ nt.label }}</span>
          </button>
        </div>
        <button
          style="width:40px;height:40px;border-radius:50%;background:var(--blue);border:none;color:#000;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px var(--blue-glow);transition:transform 0.15s"
          :style="{ transform: addOpen ? 'rotate(45deg)' : 'none' }"
          @click.stop="addOpen = !addOpen"
        >
          <AppIcon name="plus" :size="18" color="#000" />
        </button>
      </div>
    </div>

    <!-- Inspector panel -->
    <div style="width:280px;flex-shrink:0;border-left:1px solid var(--border);background:var(--surface);display:flex;flex-direction:column;overflow:hidden">
      <template v-if="selectedNode">
        <!-- Header -->
        <div style="padding:12px 14px;border-bottom:1px solid var(--border);flex-shrink:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div :style="{ width:'28px',height:'28px',borderRadius:'var(--r)',background:selectedNodeMeta?.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }">
              <AppIcon :name="selectedNodeMeta?.icon || 'code'" :size="14" :color="selectedNodeMeta?.color" />
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:11px;font-weight:600;color:var(--text);text-transform:uppercase;letter-spacing:0.05em">{{ selectedNodeMeta?.label }}</div>
              <div style="font-size:10px;color:var(--text-3);font-family:var(--mono)">{{ selectedNode.status }}</div>
            </div>
            <button
              style="padding:4px 8px;border-radius:var(--r);font-size:11px;cursor:pointer;background:transparent;border:1px solid var(--border-2);color:var(--red);display:flex;align-items:center;gap:4px;flex-shrink:0"
              @click="deleteNode(selectedNode.id)"
            >
              <AppIcon name="x" :size="11" color="var(--red)" />
            </button>
          </div>
          <input
            :value="renameVal"
            @input="e => renameVal = e.target.value"
            @change="renameNode(selectedNode.id, renameVal)"
            style="width:100%;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);padding:5px 8px;font-size:12px;color:var(--text);outline:none;font-family:var(--font)"
            placeholder="Node label"
          />
        </div>

        <!-- Scrollable body -->
        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:0">

          <!-- Agent picker (agent nodes only) -->
          <div v-if="isAgentNode" style="padding:12px 14px;border-bottom:1px solid var(--border)">
            <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:8px">Agente</div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <button
                v-for="opt in agentOptions"
                :key="opt.value"
                :style="{
                  display:'flex', alignItems:'center', gap:'8px', padding:'6px 8px',
                  borderRadius:'var(--r)', border:'1px solid', cursor:'pointer', width:'100%', textAlign:'left',
                  background: selectedAgentType === opt.value ? opt.bg : 'transparent',
                  borderColor: selectedAgentType === opt.value ? opt.color : 'var(--border)',
                  transition:'all 0.1s',
                }"
                @click="setNodeAgent(opt.value)"
              >
                <AppIcon :name="opt.icon" :size="12" :color="opt.color" />
                <span :style="{ fontSize:'11px', color: selectedAgentType === opt.value ? opt.color : 'var(--text-2)', fontWeight: selectedAgentType === opt.value ? '600' : '400' }">{{ opt.label }}</span>
                <AppIcon v-if="selectedAgentType === opt.value" name="check" :size="10" :color="opt.color" style="margin-left:auto" />
              </button>
            </div>
          </div>

          <!-- Prompt Template section -->
          <div style="padding:12px 14px;border-bottom:1px solid var(--border)">
            <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:8px">Prompt Template</div>
            <textarea
              v-model="promptDraft"
              style="width:100%;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);padding:8px;font-size:11px;color:var(--text-2);font-family:var(--mono);resize:vertical;outline:none;line-height:1.5;min-height:120px"
            />
            <button
              :style="{
                marginTop:'8px',width:'100%',padding:'6px 0',borderRadius:'var(--r)',fontSize:'12px',cursor:'pointer',border:'none',
                background: saveFlash ? 'var(--green)' : (hasChanges ? 'var(--blue)' : 'var(--surface-3)'),
                color: hasChanges || saveFlash ? '#000' : 'var(--text-3)',
                transition: 'background 0.15s',
              }"
              @click="savePrompt"
            >{{ saveFlash ? '✓ Saved' : 'Save prompt' }}</button>
          </div>

          <!-- Parameters section -->
          <div style="padding:12px 14px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Parâmetros</div>
              <button
                v-if="!addingParam"
                style="display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:var(--r);font-size:11px;cursor:pointer;background:var(--surface-2);border:1px solid var(--border-2);color:var(--text-2)"
                @click="addingParam = true; editingParamIndex = null; paramDraft = createEmptyParam()"
              >
                <AppIcon name="plus" :size="10" color="var(--text-2)" />
                Adicionar
              </button>
            </div>

            <!-- Existing params list -->
            <div v-if="nodeParams.length" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
              <div
                v-for="(param, idx) in nodeParams"
                :key="idx"
                style="display:flex;align-items:flex-start;gap:6px;padding:8px 9px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg)"
              >
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:5px">
                    <span style="font-size:11px;font-weight:600;color:var(--text)">{{ param.label }}</span>
                    <span v-if="param.required" style="font-size:9px;color:var(--red)">*</span>
                  </div>
                  <div style="font-size:10px;color:var(--text-3);font-family:var(--mono);margin-top:2px">{{ param.key }} · {{ param.type }}</div>
                </div>
                <button
                  style="padding:3px;background:transparent;border:none;cursor:pointer;color:var(--text-3);flex-shrink:0"
                  @click="editParam(idx)"
                >
                  <AppIcon name="edit" :size="11" color="var(--text-3)" />
                </button>
                <button
                  style="padding:3px;background:transparent;border:none;cursor:pointer;flex-shrink:0"
                  @click="deleteParam(idx)"
                >
                  <AppIcon name="x" :size="11" color="var(--red)" />
                </button>
              </div>
            </div>
            <div v-else-if="!addingParam" style="font-size:11px;color:var(--text-3);line-height:1.5;margin-bottom:10px">
              Nenhum parâmetro ainda.
            </div>

            <!-- Add / Edit param form -->
            <div
              v-if="addingParam"
              style="padding:10px;border:1px solid var(--border-2);border-radius:var(--r);background:var(--bg);display:flex;flex-direction:column;gap:8px"
            >
              <div style="font-size:10px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.05em">
                {{ editingParamIndex !== null ? 'Editar parâmetro' : 'Novo parâmetro' }}
              </div>

              <div>
                <div style="font-size:10px;color:var(--text-3);margin-bottom:3px">Label</div>
                <input
                  v-model="paramDraft.label"
                  placeholder="ex: Objetivo"
                  style="width:100%;padding:5px 7px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);font-size:11px;color:var(--text);outline:none;font-family:var(--font)"
                />
              </div>

              <div>
                <div style="font-size:10px;color:var(--text-3);margin-bottom:3px">Key</div>
                <input
                  v-model="paramDraft.key"
                  placeholder="ex: objective"
                  style="width:100%;padding:5px 7px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);font-size:11px;color:var(--text);outline:none;font-family:var(--mono)"
                />
              </div>

              <div>
                <div style="font-size:10px;color:var(--text-3);margin-bottom:3px">Tipo</div>
                <select
                  v-model="paramDraft.type"
                  style="width:100%;padding:5px 7px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);font-size:11px;color:var(--text);outline:none;cursor:pointer;font-family:var(--font)"
                >
                  <option value="text">text</option>
                  <option value="textarea">textarea</option>
                  <option value="select">select</option>
                </select>
              </div>

              <div v-if="paramDraft.type === 'select'">
                <div style="font-size:10px;color:var(--text-3);margin-bottom:3px">Opções (separadas por vírgula)</div>
                <input
                  v-model="paramDraft.options"
                  placeholder="ex: Sim, Não, Talvez"
                  style="width:100%;padding:5px 7px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);font-size:11px;color:var(--text);outline:none;font-family:var(--font)"
                />
              </div>

              <div v-else>
                <div style="font-size:10px;color:var(--text-3);margin-bottom:3px">Placeholder</div>
                <input
                  v-model="paramDraft.placeholder"
                  placeholder="Texto de ajuda"
                  style="width:100%;padding:5px 7px;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);font-size:11px;color:var(--text);outline:none;font-family:var(--font)"
                />
              </div>

              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px;color:var(--text-2)">
                <input type="checkbox" v-model="paramDraft.required" style="cursor:pointer" />
                Obrigatório
              </label>

              <div style="display:flex;gap:6px">
                <button
                  style="flex:1;padding:5px 0;border-radius:var(--r);font-size:11px;font-weight:600;cursor:pointer;border:none;background:var(--blue);color:#000"
                  @click="commitParam"
                >
                  {{ editingParamIndex !== null ? 'Salvar' : 'Adicionar' }}
                </button>
                <button
                  style="padding:5px 10px;border-radius:var(--r);font-size:11px;cursor:pointer;background:transparent;border:1px solid var(--border-2);color:var(--text-3)"
                  @click="cancelParamEdit"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <template v-else>
        <div style="padding:12px 14px;border-bottom:1px solid var(--border);flex-shrink:0">
          <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:8px">Nome do Workflow</div>
          <input
            v-model="workflowName"
            style="width:100%;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);padding:5px 8px;font-size:13px;font-weight:600;color:var(--text);outline:none;font-family:var(--font);box-sizing:border-box"
            placeholder="Nome do workflow"
            @blur="renameWorkflow"
            @keydown.enter.prevent="$event.target.blur()"
          />
        </div>
        <div style="padding:14px;display:flex;flex-direction:column;gap:10px">
          <div style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:2px">Estatísticas</div>
          <div v-for="stat in [
            { label: 'Total nodes', value: nodes.length },
            { label: 'Connections', value: edges.length },
            { label: 'Done', value: nodes.filter(n=>n.status==='done').length },
            { label: 'Running', value: nodes.filter(n=>n.status==='running').length },
            { label: 'Queued', value: nodes.filter(n=>n.status==='queued').length },
          ]" :key="stat.label" style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:12px;color:var(--text-2)">{{ stat.label }}</span>
            <span style="font-size:12px;font-family:var(--mono);color:var(--text)">{{ stat.value }}</span>
          </div>
          <div style="margin-top:4px;font-size:11px;color:var(--text-3);line-height:1.5">Selecione um nó para inspecionar e editar.</div>
        </div>
      </template>
    </div>
  </div>
</template>
