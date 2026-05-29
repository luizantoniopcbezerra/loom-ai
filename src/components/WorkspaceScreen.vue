<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import StatusDot from './StatusDot.vue'
import { api } from '../lib/api.js'
import { getAdapterMeta, getAgentSelection, getDefaultModelForAgent } from '../lib/agentModels.js'
import { agents as AGENTS, loadAgents as fetchAgents } from '../lib/agentsStore.js'
const LAYOUT_STORAGE_KEY = 'loomai-workspace-open-conversations'

const defaultAgentId = ref(null)
const defaultModel = ref(getDefaultModelForAgent({ adapterType: 'claude_local' }))

const conversations = ref([])
const openConversationIds = ref([])
const activeConversationId = ref(null)
const hoveredConversationId = ref(null)
const messagesByConversation = ref({})
const conversationSettings = ref({})
const conversationUi = ref({})
const inputs = ref({})
const replyRuns = ref({})
const paneRefs = ref({})
const inputRefs = ref({})
const agentById = computed(() => Object.fromEntries(AGENTS.value.map(agent => [agent.id, agent])))

onMounted(async () => {
  hydrateLayout()
  await loadWorkspace()
})

watch([openConversationIds, activeConversationId], persistLayout, { deep: true })
watch(conversationSettings, persistLayout, { deep: true })
watch(conversationUi, persistLayout, { deep: true })

const sortedConversations = computed(() => (
  [...conversations.value].sort((left, right) => (
    (right.updatedAt || right.updated_at || '').localeCompare(left.updatedAt || left.updated_at || '')
  ))
))

const openConversations = computed(() => (
  openConversationIds.value
    .map(id => conversations.value.find(conversation => conversation.id === id))
    .filter(Boolean)
))

async function loadWorkspace() {
  const [, loadedConversations] = await Promise.all([
    fetchAgents(),
    api.getConversations(),
  ])

  if (AGENTS.value.length && !AGENTS.value.some(agent => agent.id === defaultAgentId.value)) {
    defaultAgentId.value = AGENTS.value[0].id
  }
  if (window.__forgeNextAgentSelection?.agentId && AGENTS.value.some(agent => agent.id === window.__forgeNextAgentSelection.agentId)) {
    defaultAgentId.value = window.__forgeNextAgentSelection.agentId
    if (window.__forgeNextAgentSelection.model) {
      defaultModel.value = window.__forgeNextAgentSelection.model
    }
    delete window.__forgeNextAgentSelection
  }
  defaultModel.value = getAgentSelection(agentById.value[defaultAgentId.value], defaultModel.value).model

  conversations.value = loadedConversations
  hydrateConversationSettings()
  hydrateConversationUi()
  syncOpenConversations()

  await Promise.all(openConversationIds.value.map(conversationId => ensureMessagesLoaded(conversationId)))
}

function hydrateLayout() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAYOUT_STORAGE_KEY) || 'null')
    if (!parsed) return
    if (Array.isArray(parsed.openConversationIds)) {
      openConversationIds.value = parsed.openConversationIds
    }
    if (typeof parsed.activeConversationId === 'string') {
      activeConversationId.value = parsed.activeConversationId
    }
    if (parsed.conversationSettings && typeof parsed.conversationSettings === 'object') {
      conversationSettings.value = parsed.conversationSettings
    }
    if (parsed.conversationUi && typeof parsed.conversationUi === 'object') {
      conversationUi.value = parsed.conversationUi
    }
  } catch {
    openConversationIds.value = []
    activeConversationId.value = null
    conversationSettings.value = {}
    conversationUi.value = {}
  }
}

function persistLayout() {
  window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({
    openConversationIds: openConversationIds.value,
    activeConversationId: activeConversationId.value,
    conversationSettings: conversationSettings.value,
    conversationUi: conversationUi.value,
  }))
}

function hydrateConversationSettings() {
  const next = { ...conversationSettings.value }

  conversations.value.forEach(conversation => {
    const existing = next[conversation.id]
    const legacyAgentId = AGENTS.value.find(agent => agent.name === existing?.agent)?.id
    const resolvedAgentId = existing?.agentId || legacyAgentId || defaultAgentId.value
    const resolved = getAgentSelection(agentById.value[resolvedAgentId], existing?.model || defaultModel.value)
    next[conversation.id] = {
      agentId: resolved.agentId || resolvedAgentId,
      model: resolved.model,
    }
  })

  conversationSettings.value = next
}

function hydrateConversationUi() {
  const next = { ...conversationUi.value }

  conversations.value.forEach(conversation => {
    next[conversation.id] = {
      contextOpen: next[conversation.id]?.contextOpen || false,
      activeToolsOpen: next[conversation.id]?.activeToolsOpen ?? true,
      tokenUsageOpen: next[conversation.id]?.tokenUsageOpen ?? false,
      contextMemoryOpen: next[conversation.id]?.contextMemoryOpen ?? false,
    }
  })

  conversationUi.value = next
}

function syncOpenConversations() {
  const validIds = openConversationIds.value.filter(id => conversations.value.some(conversation => conversation.id === id))

  if (!validIds.length && conversations.value.length) {
    validIds.push(conversations.value[0].id)
  }

  openConversationIds.value = validIds

  if (!validIds.includes(activeConversationId.value)) {
    activeConversationId.value = validIds[0] || null
  }
}

async function ensureMessagesLoaded(conversationId) {
  if (messagesByConversation.value[conversationId]) {
    return
  }

  const loadedMessages = await api.getMessages(conversationId)
  messagesByConversation.value = {
    ...messagesByConversation.value,
    [conversationId]: loadedMessages.map(message => toUiMessage(message, conversationId)),
  }
  scrollPaneToBottom(conversationId)
}

function setPaneRef(el, conversationId) {
  if (el) {
    paneRefs.value[conversationId] = el
  }
}

function setInputRef(el, conversationId) {
  if (el) {
    inputRefs.value[conversationId] = el
  }
}

function scrollPaneToBottom(conversationId) {
  nextTick(() => {
    const el = paneRefs.value[conversationId]
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

function focusConversation(conversationId) {
  activeConversationId.value = conversationId
  nextTick(() => {
    inputRefs.value[conversationId]?.focus()
  })
}

async function openConversation(conversationId) {
  if (!openConversationIds.value.includes(conversationId)) {
    openConversationIds.value = [...openConversationIds.value, conversationId]
  }
  activeConversationId.value = conversationId
  await ensureMessagesLoaded(conversationId)
  focusConversation(conversationId)
}

function closeConversation(conversationId) {
  openConversationIds.value = openConversationIds.value.filter(id => id !== conversationId)

  if (!openConversationIds.value.length && conversations.value.length) {
    openConversationIds.value = [conversations.value[0].id]
  }

  if (activeConversationId.value === conversationId) {
    activeConversationId.value = openConversationIds.value[0] || null
  }
}

async function deleteConversation(conversationId) {
  conversations.value = conversations.value.filter(c => c.id !== conversationId)
  closeConversation(conversationId)
  await api.deleteConversation(conversationId)
}

function getConversationSelection(conversationId) {
  const stored = conversationSettings.value[conversationId]
  return getAgentSelection(
    agentById.value[stored?.agentId || defaultAgentId.value],
    stored?.model || defaultModel.value,
  )
}

function getModelsForConversation(conversationId) {
  return getConversationSelection(conversationId).models
}

function setConversationAgent(conversationId, nextAgentId) {
  const nextSelection = getAgentSelection(agentById.value[nextAgentId], conversationSettings.value[conversationId]?.model)
  conversationSettings.value = {
    ...conversationSettings.value,
    [conversationId]: {
      agentId: nextSelection.agentId || nextAgentId,
      model: nextSelection.model,
    },
  }
}

function setConversationModel(conversationId, nextModel) {
  const current = getConversationSelection(conversationId)
  const nextSelection = getAgentSelection(agentById.value[current.agentId], nextModel)
  conversationSettings.value = {
    ...conversationSettings.value,
    [conversationId]: {
      agentId: nextSelection.agentId || current.agentId,
      model: nextSelection.model,
    },
  }
}

function getConversationUi(conversationId) {
  return conversationUi.value[conversationId] || {
    contextOpen: false,
    activeToolsOpen: true,
    tokenUsageOpen: false,
    contextMemoryOpen: false,
  }
}

function setConversationUi(conversationId, patch) {
  conversationUi.value = {
    ...conversationUi.value,
    [conversationId]: {
      ...getConversationUi(conversationId),
      ...patch,
    },
  }
}

async function createConversation() {
  const now = new Date()
  const conversation = await api.createConversation({
    title: `Nova conversa ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  })

  conversations.value = [conversation, ...conversations.value]
  conversationSettings.value = {
    ...conversationSettings.value,
    [conversation.id]: {
      agentId: defaultAgentId.value,
      model: defaultModel.value,
    },
  }
  conversationUi.value = {
    ...conversationUi.value,
    [conversation.id]: {
      contextOpen: false,
      activeToolsOpen: true,
      tokenUsageOpen: false,
      contextMemoryOpen: false,
    },
  }
  inputs.value = {
    ...inputs.value,
    [conversation.id]: '',
  }
  messagesByConversation.value = {
    ...messagesByConversation.value,
    [conversation.id]: [],
  }
  await openConversation(conversation.id)
}

async function send(conversationId) {
  if (replyRuns.value[conversationId]) return

  const text = (inputs.value[conversationId] || '').trim()
  if (!text) return

  inputs.value = {
    ...inputs.value,
    [conversationId]: '',
  }

  const userMessage = await api.createMessage(conversationId, {
    role: 'user',
    content: text,
  })

  appendMessage(conversationId, toUiMessage(userMessage, conversationId))
  bumpConversation(conversationId, userMessage.createdAt || userMessage.created_at)
  scrollPaneToBottom(conversationId)

  const pendingId = crypto.randomUUID()
  const selection = getConversationSelection(conversationId)
  const meta = getAdapterMeta(selection.adapterType)

  appendMessage(conversationId, {
    id: pendingId,
    role: 'assistant',
    content: '',
    agent: selection.agent,
    agentColor: meta.color,
    model: selection.model,
    streaming: true,
  })
  scrollPaneToBottom(conversationId)

  const abortController = new AbortController()
  replyRuns.value = {
    ...replyRuns.value,
    [conversationId]: {
      pendingId,
      abortController,
      cancelled: false,
    },
  }

  try {
    const assistantMessage = await api.createAssistantReply(conversationId, {
      agent_id: selection.agentId,
      agent_name: selection.agent,
      model_name: selection.model,
    }, {
      signal: abortController.signal,
    })

    messagesByConversation.value = {
      ...messagesByConversation.value,
      [conversationId]: (messagesByConversation.value[conversationId] || []).map(message => (
        message.id === pendingId
          ? { ...toUiMessage(assistantMessage, conversationId), agent: selection.agent, agentColor: meta.color, model: selection.model, streaming: false }
          : message
      )),
    }
    bumpConversation(conversationId, assistantMessage.createdAt || assistantMessage.created_at)
  } catch (error) {
    const run = replyRuns.value[conversationId]
    if (error?.name === 'AbortError' || run?.cancelled) {
      replaceAssistantMessage(conversationId, pendingId, {
        id: pendingId,
        role: 'assistant',
        content: 'Run cancelada.',
        agent: selection.agent,
        agentColor: meta.color,
        model: selection.model,
        streaming: false,
      })
      scrollPaneToBottom(conversationId)
      return
    }

    const failureMessage = error?.message || 'O backend local nao conseguiu gerar a resposta.'
    replaceAssistantMessage(conversationId, pendingId, {
      id: pendingId,
      role: 'assistant',
      content: `Erro ao gerar resposta real.\n\n${failureMessage}`,
      agent: selection.agent,
      agentColor: meta.color,
      model: selection.model,
      streaming: false,
      error: true,
    })
  } finally {
    if (replyRuns.value[conversationId]?.pendingId === pendingId) {
      const nextRuns = { ...replyRuns.value }
      delete nextRuns[conversationId]
      replyRuns.value = nextRuns
    }
  }
  scrollPaneToBottom(conversationId)
}

function appendMessage(conversationId, message) {
  messagesByConversation.value = {
    ...messagesByConversation.value,
    [conversationId]: [...(messagesByConversation.value[conversationId] || []), message],
  }
}

function replaceAssistantMessage(conversationId, messageId, nextMessage) {
  messagesByConversation.value = {
    ...messagesByConversation.value,
    [conversationId]: (messagesByConversation.value[conversationId] || []).map(message => (
      message.id === messageId ? nextMessage : message
    )),
  }
}

function isReplyRunning(conversationId) {
  return !!replyRuns.value[conversationId]
}

function cancelReply(conversationId) {
  const run = replyRuns.value[conversationId]
  if (!run) return

  replyRuns.value = {
    ...replyRuns.value,
    [conversationId]: {
      ...run,
      cancelled: true,
    },
  }
  run.abortController.abort()
  api.cancelAssistantReply(conversationId).catch(() => {})
}

function bumpConversation(conversationId, updatedAt) {
  conversations.value = conversations.value
    .map(conversation => (
      conversation.id === conversationId
        ? { ...conversation, updatedAt: updatedAt || conversation.updatedAt }
        : conversation
    ))
    .sort((left, right) => (
      (right.updatedAt || right.updated_at || '').localeCompare(left.updatedAt || left.updated_at || '')
    ))
}

function handleKey(event, conversationId) {
  if (isReplyRunning(conversationId)) {
    return
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    send(conversationId)
  }
}

function autoresize(event) {
  event.target.style.height = 'auto'
  event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`
}

function renderContent(text) {
  const parts = []
  const fenceRe = /```(\w*)\n([\s\S]*?)```/g
  let last = 0
  let match
  while ((match = fenceRe.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', content: text.slice(last, match.index) })
    }
    parts.push({ type: 'code', lang: match[1] || 'text', content: match[2] })
    last = match.index + match[0].length
  }
  if (last < text.length) {
    parts.push({ type: 'text', content: text.slice(last) })
  }
  return parts
}

function htmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function colorize(code) {
  const tokens = []
  const stash = (value, color) => {
    const key = `__TOK${tokens.length}__`
    tokens.push({ key, value: `<span style="color:${color}">${value}</span>` })
    return key
  }

  let s = htmlEscape(code)

  s = s.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, match => stash(match, '#98d982'))
  s = s.replace(/('[^'\n]*')/g, match => stash(match, '#98d982'))
  s = s.replace(/(#[^\n]*)/g, match => stash(match, '#636d6e'))

  s = s.replace(/\b(def|return|if|else|elif|while|for|in|not|and|or|import|from|class|raise|try|except|with|as|True|False|None|pass|break|continue)\b/g, '<span style="color:#7cb8f0">$1</span>')
  s = s.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:#e8b77a">$1</span>')
  s = s.replace(/\b(int|str|list|dict|bool|float|tuple|set|len|range|print|type)\b/g, '<span style="color:#c397d8">$1</span>')

  for (const token of tokens) {
    s = s.replace(token.key, token.value)
  }

  return s
}

function toUiMessage(message, conversationId) {
  const selection = getConversationSelection(conversationId)
  const meta = getAdapterMeta(selection.adapterType)
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    agent: message.role === 'assistant' ? selection.agent : undefined,
    agentColor: message.role === 'assistant' ? meta.color : undefined,
    model: message.role === 'assistant' ? selection.model : undefined,
    streaming: false,
  }
}
</script>

<template>
  <div :style="{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }">
    <div :style="{ height: '44px', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }">
      <span :style="{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }">Chats</span>
      <div :style="{ flex: 1 }" />
      <span :style="{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }">{{ openConversationIds.length }} abertas</span>
    </div>

    <div :style="{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(260px, 300px) 1fr', minWidth: 0, overflow: 'hidden' }">
      <aside :style="{ borderRight: '1px solid var(--border)', background: 'var(--surface)', overflowY: 'auto', padding: '16px 12px' }">
        <button
          :style="{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            padding: '10px 12px',
            marginBottom: '10px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            color: 'var(--text)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font)',
          }"
          @click="createConversation"
        >
          <AppIcon name="plus" :size="12" color="var(--text-2)" />
          Nova conversa
        </button>

        <div :style="{ display: 'flex', flexDirection: 'column', gap: '8px' }">
          <div
            v-for="conversation in sortedConversations"
            :key="conversation.id"
            :style="{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              width: '100%',
              textAlign: 'left',
              padding: '10px',
              borderRadius: 'var(--r)',
              border: `1px solid ${openConversationIds.includes(conversation.id) ? 'var(--blue)' : 'var(--border)'}`,
              background: activeConversationId === conversation.id ? 'var(--blue-dim)' : (openConversationIds.includes(conversation.id) ? 'var(--surface-2)' : 'var(--surface)'),
              cursor: 'pointer',
              boxSizing: 'border-box',
            }"
            @mouseenter="hoveredConversationId = conversation.id"
            @mouseleave="hoveredConversationId = null"
            @click="openConversation(conversation.id)"
          >
            <div :style="{ width: '24px', height: '24px', borderRadius: 'var(--r)', background: openConversationIds.includes(conversation.id) ? 'rgba(0,184,212,0.12)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }">
              <AppIcon name="chat" :size="13" :color="openConversationIds.includes(conversation.id) ? 'var(--blue)' : 'var(--text-3)'" />
            </div>
            <div :style="{ flex: 1, minWidth: 0 }">
              <div :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }">
                <span :style="{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }">{{ conversation.title }}</span>
                <span :style="{ fontSize: '10px', color: openConversationIds.includes(conversation.id) ? 'var(--blue)' : 'var(--text-3)', fontFamily: 'var(--mono)', flexShrink: 0 }">
                  {{ openConversationIds.includes(conversation.id) ? 'aberta' : 'fechada' }}
                </span>
              </div>
              <div :style="{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: '4px' }">
                {{ (messagesByConversation[conversation.id] || []).length }} msgs
              </div>
            </div>
            <button
              v-show="hoveredConversationId === conversation.id"
              type="button"
              :style="{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '22px',
                height: '22px',
                border: 'none',
                borderRadius: '4px',
                background: 'var(--surface-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }"
              title="Excluir conversa"
              @click.stop="deleteConversation(conversation.id)"
            >
              <AppIcon name="trash-2" :size="11" color="var(--red, #e05252)" />
            </button>
          </div>

          <div
            v-if="!sortedConversations.length"
            :style="{ padding: '14px', borderRadius: 'var(--r)', border: '1px dashed var(--border-2)', color: 'var(--text-2)', fontSize: '12px', lineHeight: 1.5 }"
          >
            Nenhuma conversa ainda. Crie a primeira para abrir no grid.
          </div>
        </div>
      </aside>

      <section :style="{ minWidth: 0, overflow: 'auto', padding: '1px', background: 'var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1px' }">
        <div
          v-for="conversation in openConversations"
          :key="conversation.id"
          :style="{ background: 'var(--bg)', display: 'flex', minHeight: '300px', minWidth: 0 }"
          @click="focusConversation(conversation.id)"
        >
          <div :style="{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }">
            <div :style="{ height: '38px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px', borderBottom: '1px solid var(--border)', background: activeConversationId === conversation.id ? 'var(--surface-2)' : 'var(--surface)' }">
              <div :style="{ width: '22px', height: '22px', borderRadius: 'var(--r)', background: activeConversationId === conversation.id ? 'rgba(0,184,212,0.12)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }">
                <AppIcon name="chat" :size="12" :color="activeConversationId === conversation.id ? 'var(--blue)' : 'var(--text-3)'" />
              </div>
              <div :style="{ flex: 1, minWidth: 0 }">
                <div :style="{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }">
                  {{ conversation.title }}
                </div>
              </div>
              <button
                type="button"
                :style="{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 8px',
                  background: getConversationUi(conversation.id).contextOpen ? 'var(--surface-3)' : 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r)',
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                  fontSize: '11px',
                  fontFamily: 'var(--mono)',
                }"
                @click.stop="setConversationUi(conversation.id, { contextOpen: !getConversationUi(conversation.id).contextOpen })"
              >
                <AppIcon name="sliders" :size="11" color="var(--text-3)" />
                Context
              </button>
              <select
                :value="getConversationSelection(conversation.id).agentId"
                :style="{ maxWidth: '120px', padding: '4px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: '11px', fontFamily: 'var(--font)', outline: 'none' }"
                @click.stop
                @change="event => setConversationAgent(conversation.id, event.target.value)"
              >
                <option v-for="agentOption in AGENTS" :key="agentOption.id" :value="agentOption.id">
                  {{ agentOption.name }}
                </option>
              </select>
              <select
                :value="getConversationSelection(conversation.id).model"
                :style="{ maxWidth: '150px', padding: '4px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: '11px', fontFamily: 'var(--font)', outline: 'none' }"
                @click.stop
                @change="event => setConversationModel(conversation.id, event.target.value)"
              >
                <option v-for="modelOption in getModelsForConversation(conversation.id)" :key="modelOption" :value="modelOption">
                  {{ modelOption }}
                </option>
              </select>
              <button
                type="button"
                :style="{ width: '22px', height: '22px', border: 'none', borderRadius: '6px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }"
                @click.stop="closeConversation(conversation.id)"
              >
                <AppIcon name="x" :size="12" color="var(--text-3)" />
              </button>
            </div>

            <div :style="{ flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }">
              <div
                :ref="el => setPaneRef(el, conversation.id)"
                :style="{ flex: 1, overflowY: 'auto', padding: '18px 16px 8px', display: 'flex', flexDirection: 'column', minWidth: 0 }"
              >
                <div :style="{ flex: 1 }" />
                <div
                  v-if="!(messagesByConversation[conversation.id] || []).length"
                  :style="{ margin: 'auto 0', padding: '18px', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-lg)', color: 'var(--text-2)', fontSize: '13px', lineHeight: 1.6, background: 'var(--surface)' }"
                >
                  Esta conversa esta vazia. Envie uma mensagem para comecar neste painel.
                </div>

                <div v-for="msg in messagesByConversation[conversation.id] || []" :key="msg.id" :style="{ marginBottom: '18px', animation: 'fadeUp 0.25s ease' }">
                  <div v-if="msg.role === 'user'" :style="{ display: 'flex', justifyContent: 'flex-end' }">
                    <div :style="{ background: 'var(--blue-dim)', border: '1px solid rgba(0,184,212,0.2)', borderRadius: 'var(--r-xl)', padding: '10px 14px', maxWidth: '85%', color: 'var(--text)', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }">{{ msg.content }}</div>
                  </div>

                  <div v-else :style="{ display: 'flex', gap: '10px' }">
                    <div :style="{ width: '26px', height: '26px', borderRadius: '50%', background: msg.agentColor || 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px', fontSize: '10px', fontWeight: 700, color: '#000' }">
                      {{ (msg.agent || 'A')[0] }}
                    </div>

                    <div :style="{ flex: 1, minWidth: 0 }">
                      <div :style="{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }">
                        <span :style="{ fontSize: '12px', fontWeight: 600, color: msg.agentColor || 'var(--blue)' }">{{ msg.agent }}</span>
                        <span v-if="msg.model" :style="{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--mono)' }">{{ msg.model }}</span>
                      </div>

                      <div v-if="msg.streaming" :style="{ display: 'flex', alignItems: 'center', gap: '8px' }">
                        <div :style="{ display: 'flex', gap: '3px', alignItems: 'center' }">
                          <span :style="{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block', animation: 'streamDot1 1.2s infinite' }" />
                          <span :style="{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block', animation: 'streamDot2 1.2s infinite' }" />
                          <span :style="{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text-3)', display: 'inline-block', animation: 'streamDot3 1.2s infinite' }" />
                        </div>
                        <span :style="{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }">generating</span>
                      </div>

                      <div v-else>
                        <template v-for="(part, pi) in renderContent(msg.content)" :key="pi">
                          <p v-if="part.type === 'text'" :style="{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: '8px' }">{{ part.content }}</p>
                          <div v-else :style="{ marginBottom: '10px' }">
                            <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r) var(--r) 0 0', borderBottom: '1px solid var(--border)' }">
                              <AppIcon name="code" :size="12" color="var(--text-3)" />
                              <span :style="{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }">{{ part.lang }}</span>
                            </div>
                            <pre :style="{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--r) var(--r)', padding: '14px', overflowX: 'auto', fontFamily: 'var(--mono)', fontSize: '12.5px', lineHeight: 1.7, margin: 0 }"><code v-html="colorize(part.content)" /></pre>
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="getConversationUi(conversation.id).contextOpen"
                :style="{ width: '300px', minWidth: '300px', borderLeft: '1px solid var(--border)', background: 'var(--surface)', padding: '14px', overflowY: 'auto' }"
                @click.stop
              >
                <div :style="{ marginBottom: '12px' }">
                  <button
                    :style="{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '11px', fontFamily: 'var(--mono)', cursor: 'pointer', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.06em', justifyContent: 'space-between' }"
                    @click="setConversationUi(conversation.id, { activeToolsOpen: !getConversationUi(conversation.id).activeToolsOpen })"
                  >
                    <span>Active Tools</span>
                    <AppIcon :name="getConversationUi(conversation.id).activeToolsOpen ? 'chevron-up' : 'chevron-down'" :size="12" color="var(--text-3)" />
                  </button>
                  <div v-if="getConversationUi(conversation.id).activeToolsOpen" :style="{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }">
                    <div v-for="tool in ['shell', 'read_file', 'write_file', 'search']" :key="tool" :style="{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r)', fontSize: '12px' }">
                      <StatusDot status="active" :size="5" />
                      <span :style="{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }">{{ tool }}</span>
                    </div>
                  </div>
                </div>

                <div :style="{ marginBottom: '12px' }">
                  <button
                    :style="{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '11px', fontFamily: 'var(--mono)', cursor: 'pointer', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.06em', justifyContent: 'space-between' }"
                    @click="setConversationUi(conversation.id, { tokenUsageOpen: !getConversationUi(conversation.id).tokenUsageOpen })"
                  >
                    <span>Token Usage</span>
                    <AppIcon :name="getConversationUi(conversation.id).tokenUsageOpen ? 'chevron-up' : 'chevron-down'" :size="12" color="var(--text-3)" />
                  </button>
                  <div v-if="getConversationUi(conversation.id).tokenUsageOpen" :style="{ marginTop: '8px' }">
                    <div v-for="row in [['Input', '12.4k', '200k'], ['Output', '6.0k', '8k'], ['Cache', '8.2k', '-']]" :key="row[0]" :style="{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }">
                      <span :style="{ color: 'var(--text-3)' }">{{ row[0] }}</span>
                      <span :style="{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }">{{ row[1] }}</span>
                      <span :style="{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-3)' }">/ {{ row[2] }}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    :style="{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '11px', fontFamily: 'var(--mono)', cursor: 'pointer', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.06em', justifyContent: 'space-between' }"
                    @click="setConversationUi(conversation.id, { contextMemoryOpen: !getConversationUi(conversation.id).contextMemoryOpen })"
                  >
                    <span>Context Memory</span>
                    <AppIcon :name="getConversationUi(conversation.id).contextMemoryOpen ? 'chevron-up' : 'chevron-down'" :size="12" color="var(--text-3)" />
                  </button>
                  <div v-if="getConversationUi(conversation.id).contextMemoryOpen" :style="{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }">
                    <div v-for="item in ['Project structure indexed', 'Git history loaded', 'Dependencies scanned', `${(messagesByConversation[conversation.id] || []).length} msgs loaded`]" :key="item" :style="{ display: 'flex', alignItems: 'flex-start', gap: '7px', padding: '5px 0', fontSize: '12px', color: 'var(--text-3)' }">
                      <AppIcon name="check" :size="12" color="var(--green)" :style="{ marginTop: '1px' }" />
                      {{ item }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div :style="{ borderTop: '1px solid var(--border)', padding: '12px', background: 'var(--surface)', flexShrink: 0 }">
              <div :style="{ display: 'flex', gap: '8px', alignItems: 'flex-end' }">
                <div :style="{ flex: 1, position: 'relative', background: 'var(--surface-2)', border: activeConversationId === conversation.id ? '1px solid var(--blue)' : '1px solid var(--border-2)', borderRadius: 'var(--r-lg)' }">
                  <textarea
                    :ref="el => setInputRef(el, conversation.id)"
                    v-model="inputs[conversation.id]"
                    :placeholder="`Mensagem para ${conversation.title}...`"
                    rows="1"
                    :style="{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '10px 14px', color: 'var(--text)', fontSize: '14px', fontFamily: 'var(--font)', resize: 'none', lineHeight: 1.5, maxHeight: '160px', overflow: 'auto' }"
                    @focus="activeConversationId = conversation.id"
                    @keydown="event => handleKey(event, conversation.id)"
                    @input="autoresize"
                  />
                </div>
                <button
                  :style="{
                    width: '36px',
                    height: '36px',
                    background: isReplyRunning(conversation.id) ? 'rgba(255,107,107,0.18)' : ((inputs[conversation.id] || '').trim() ? 'var(--blue)' : 'var(--surface-3)'),
                    border: isReplyRunning(conversation.id) ? '1px solid rgba(255,107,107,0.38)' : 'none',
                    borderRadius: 'var(--r)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isReplyRunning(conversation.id) || (inputs[conversation.id] || '').trim() ? 'pointer' : 'not-allowed',
                    transition: 'background 0.15s',
                    flexShrink: 0,
                  }"
                  :disabled="!isReplyRunning(conversation.id) && !(inputs[conversation.id] || '').trim()"
                  @click="isReplyRunning(conversation.id) ? cancelReply(conversation.id) : send(conversation.id)"
                >
                  <AppIcon
                    :name="isReplyRunning(conversation.id) ? 'x' : 'send'"
                    :size="14"
                    :color="isReplyRunning(conversation.id) ? '#ff8f8f' : ((inputs[conversation.id] || '').trim() ? '#000' : 'var(--text-3)')"
                  />
                </button>
              </div>
              <div :style="{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', gap: '8px' }">
                <span :style="{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-3)' }">
                  {{ getConversationSelection(conversation.id).agent }} · {{ getConversationSelection(conversation.id).model }}
                </span>
                <span :style="{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-3)' }">
                  {{ isReplyRunning(conversation.id) ? 'stop run' : '⏎ send · ⇧⏎ newline' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="!openConversations.length"
          :style="{ background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', color: 'var(--text-2)' }"
        >
          <div :style="{ maxWidth: '420px', padding: '24px', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-xl)', background: 'var(--surface)', textAlign: 'center' }">
            <div :style="{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }">
              <div :style="{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0,184,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }">
                <AppIcon name="layers" :size="18" color="var(--blue)" />
              </div>
            </div>
            <div :style="{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }">
              Abra conversas lado a lado
            </div>
            <p :style="{ margin: '0 0 14px', fontSize: '13px', lineHeight: 1.6 }">
              Escolha uma conversa na coluna da esquerda ou crie uma nova para montar seu grid de chats.
            </p>
            <button
              :style="{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', border: 'none', borderRadius: 'var(--r)', background: 'var(--blue)', color: '#000', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }"
              @click="createConversation"
            >
              <AppIcon name="plus" :size="13" color="#000" />
              Criar conversa
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
