import { PLANNER_PROMPT, SPEC_WRITER_PROMPT, FEATURE_IMPLEMENTATION_PROMPT } from './defaultPrompts.js'

const STORAGE_KEY = 'loomai-local-backend-fallback'
const AGENTS_CACHE_KEY = 'loomai-agents-cache'
const AGENTS_CACHE_VERSION_KEY = 'loomai-agents-cache-v'
const AGENTS_CACHE_VERSION = '2'

const DEFAULT_AGENTS = []

// Limpa cache de agentes mockados de versões anteriores
;(function migrateAgentsCache() {
  const savedVersion = window.localStorage.getItem(AGENTS_CACHE_VERSION_KEY)
  if (savedVersion !== AGENTS_CACHE_VERSION) {
    window.localStorage.removeItem(AGENTS_CACHE_KEY)
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const state = JSON.parse(raw)
        if (Array.isArray(state.agents)) {
          state.agents = []
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        }
      } catch {}
    }
    window.localStorage.setItem(AGENTS_CACHE_VERSION_KEY, AGENTS_CACHE_VERSION)
  }
})()

const DEFAULT_CONVERSATION = {
  id: '6f08695d-a7e6-4261-a4b0-0e72e3880f0d',
  title: 'Binary Search',
  created_at: nowIso(),
  updated_at: nowIso(),
}

const DEFAULT_MESSAGES = [
  {
    id: 'f9fe6979-ab4f-4c7f-ad60-e23b8efba505',
    conversation_id: DEFAULT_CONVERSATION.id,
    role: 'user',
    content: 'Can you write a Python function that implements binary search with proper error handling?',
    created_at: nowIso(),
  },
  {
    id: '44597166-c44d-4924-aae8-734e353a1de3',
    conversation_id: DEFAULT_CONVERSATION.id,
    role: 'assistant',
    content: `Sure! Here's a clean implementation with full error handling:

\`\`\`python
def binary_search(arr: list, target: int) -> int:
    """
    Binary search implementation.
    Returns index of target or -1 if not found.
    """
    if not arr:
        raise ValueError("Array cannot be empty")

    left, right = 0, len(arr) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1
\`\`\`

The function handles empty arrays and uses integer overflow-safe midpoint calculation.`,
    created_at: nowIso(),
  },
  {
    id: '83f212ff-5191-4d2f-8c75-ff1ef4533ca6',
    conversation_id: DEFAULT_CONVERSATION.id,
    role: 'user',
    content: 'Can you add a recursive version too?',
    created_at: nowIso(),
  },
  {
    id: '752bb4df-74b4-47da-ba7e-c6602f47faeb',
    conversation_id: DEFAULT_CONVERSATION.id,
    role: 'assistant',
    content: "Here's the recursive version...",
    created_at: nowIso(),
  },
]

const DEFAULT_WORKFLOW = {
  id: '0c40e2f8-a4e1-484a-a1d6-4fce71f2dc57',
  name: 'Pipeline de Desenvolvimento',
  parameters: [
    { key: 'PROJECT_CONTEXT', label: 'Project Context', type: 'textarea', placeholder: 'Descreva o contexto do projeto, objetivos e requisitos...', required: true },
  ],
  definition: {
    nodes: [
      {
        id: 'n1', type: 'input', x: 60, y: 200, label: 'Prompt Input', status: 'queued',
        parameters: [{ key: 'PROJECT_CONTEXT', label: 'Project Context', type: 'textarea', placeholder: 'Descreva o contexto do projeto, objetivos e requisitos...', required: true, options: '' }],
      },
      {
        id: 'n2', type: 'claude', x: 260, y: 200, label: 'Planner', status: 'queued',
        prompt: PLANNER_PROMPT,
      },
      {
        id: 'n3', type: 'claude', x: 480, y: 200, label: 'Spec Writer', status: 'queued',
        prompt: SPEC_WRITER_PROMPT,
      },
      {
        id: 'n4', type: 'claude', x: 700, y: 200, label: 'Feature Implementation', status: 'queued',
        prompt: FEATURE_IMPLEMENTATION_PROMPT,
      },
      {
        id: 'n5', type: 'claude', x: 920, y: 200, label: 'Code Review', status: 'queued',
        prompt: 'You are a code reviewer.\n\nReview the implementation against these principles:\n- Object Calisthenics (9 rules): one indent level per method, no else, wrap primitives, first-class collections, one dot per line, no abbreviations, small entities, max 2 instance variables, no getters/setters\n- KISS: solutions as simple as possible\n- YAGNI: no premature features\n- DRY: no code duplication\n- Less Code Best Code: minimal, concise implementations\n\nFor each violation: specify the rule, location, and suggested fix. Provide an overall quality score and summary.',
      },
      {
        id: 'n6', type: 'output', x: 1140, y: 200, label: 'Final Output', status: 'queued',
      },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
      { from: 'n5', to: 'n6' },
    ],
  },
  created_at: nowIso(),
  updated_at: nowIso(),
}

function nowIso() {
  return new Date().toISOString()
}

function createDefaultAgent(id, name, adapterType, model, command, status) {
  return {
    id,
    name,
    adapter_type: adapterType,
    adapter_config: {
      command,
      model,
    },
    status,
    updated_at: nowIso(),
  }
}

function createEmptyState() {
  return {
    profile: null,
    settings: null,
    agents: [...DEFAULT_AGENTS],
    conversations: [DEFAULT_CONVERSATION],
    messages: [...DEFAULT_MESSAGES],
    workflows: [DEFAULT_WORKFLOW],
  }
}

function readState() {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initialState = createEmptyState()
    writeState(initialState)
    return initialState
  }

  try {
    const parsed = JSON.parse(raw)
    return {
      ...createEmptyState(),
      ...parsed,
    }
  } catch {
    const initialState = createEmptyState()
    writeState(initialState)
    return initialState
  }
}

function writeState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function readAgentsCache() {
  const raw = window.localStorage.getItem(AGENTS_CACHE_KEY)
  if (raw === null) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    window.localStorage.removeItem(AGENTS_CACHE_KEY)
    return null
  }
}

function writeAgentsCache(agents) {
  window.localStorage.setItem(AGENTS_CACHE_KEY, JSON.stringify(agents))
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (response.status === 404) {
    return null
  }

  const raw = await response.text()
  const data = raw ? JSON.parse(raw) : null

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed for ${path}`)
    error.status = response.status
    error.body = data
    throw error
  }

  return data
}

async function withFallback(remoteCall, fallbackCall) {
  try {
    return await remoteCall()
  } catch {
    return fallbackCall()
  }
}

function normalizeProfile(profile) {
  return profile ? {
    ...profile,
    createdAt: profile.created_at || profile.createdAt,
    updatedAt: profile.updated_at || profile.updatedAt,
  } : null
}

function normalizeSettings(settings) {
  return settings ? {
    ...settings,
    updatedAt: settings.updated_at || settings.updatedAt,
  } : null
}

function normalizeAgent(agent) {
  return {
    ...agent,
    adapterType: agent.adapter_type || agent.adapterType,
    adapterConfig: agent.adapter_config || agent.adapterConfig || {},
    updatedAt: agent.updated_at || agent.updatedAt,
  }
}

function normalizeConversation(conversation) {
  return {
    ...conversation,
    createdAt: conversation.created_at || conversation.createdAt,
    updatedAt: conversation.updated_at || conversation.updatedAt,
  }
}

function normalizeMessage(message) {
  return {
    ...message,
    conversationId: message.conversation_id || message.conversationId,
    createdAt: message.created_at || message.createdAt,
  }
}

function normalizeWorkflow(workflow) {
  return {
    ...workflow,
    createdAt: workflow.created_at || workflow.createdAt,
    updatedAt: workflow.updated_at || workflow.updatedAt,
  }
}

export const api = {
  async getProfile() {
    const data = await withFallback(
      () => request('/api/profile'),
      () => readState().profile,
    )
    return normalizeProfile(data)
  },

  async saveProfile(payload) {
    const data = await withFallback(
      () => request('/api/profile', { method: 'PUT', body: JSON.stringify(payload) }),
      () => {
        const state = readState()
        const now = nowIso()
        const existing = state.profile
        const profile = {
          id: existing?.id || crypto.randomUUID(),
          username: payload.username,
          color: payload.color,
          created_at: existing?.created_at || now,
          updated_at: now,
        }
        state.profile = profile
        writeState(state)
        return profile
      },
    )
    return normalizeProfile(data)
  },

  async getSettings() {
    const data = await withFallback(
      () => request('/api/settings'),
      () => readState().settings,
    )
    return normalizeSettings(data)
  },

  async saveSettings(payload) {
    const data = await withFallback(
      () => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
      () => {
        const state = readState()
        const settings = {
          id: state.settings?.id || crypto.randomUUID(),
          accentColor: payload.accentColor ?? null,
          sidebarExpanded: payload.sidebarExpanded ?? null,
          theme: payload.theme ?? null,
          workspacePath: payload.workspacePath ?? null,
          updated_at: nowIso(),
        }
        state.settings = settings
        writeState(state)
        return settings
      },
    )
    return normalizeSettings(data)
  },

  async getAgents(options = {}) {
    const cachedAgents = readAgentsCache()
    if (!options.refresh && cachedAgents !== null) {
      return cachedAgents.map(normalizeAgent)
    }

    const data = await withFallback(
      () => request('/api/agents'),
      () => readState().agents,
    )
    writeAgentsCache(data || [])
    return (data || []).map(normalizeAgent)
  },

  async scanAgents() {
    const data = await withFallback(
      () => request('/api/agents/scan', { method: 'POST' }),
      () => readState().agents,
    )
    writeAgentsCache(data || [])
    return (data || []).map(normalizeAgent)
  },

  async createAgent(payload) {
    const data = await withFallback(
      () => request('/api/agents', { method: 'POST', body: JSON.stringify(payload) }),
      () => {
        const state = readState()
        const agent = {
          id: crypto.randomUUID(),
          name: payload.name,
          adapter_type: payload.adapterType,
          adapter_config: payload.adapterConfig || {},
          status: payload.status,
          updated_at: nowIso(),
        }
        state.agents = [...state.agents, agent].sort((left, right) => left.name.localeCompare(right.name))
        writeState(state)
        return agent
      },
    )
    const cachedAgents = readAgentsCache() || []
    writeAgentsCache(cachedAgents.filter(existing => existing.id !== data.id).concat(data))
    return normalizeAgent(data)
  },

  async saveAgent(agentId, payload) {
    const data = await withFallback(
      () => request(`/api/agents/${agentId}`, { method: 'PUT', body: JSON.stringify(payload) }),
      () => {
        const state = readState()
        const now = nowIso()
        const agent = {
          id: agentId,
          name: payload.name,
          adapter_type: payload.adapterType,
          adapter_config: payload.adapterConfig || {},
          status: payload.status,
          updated_at: now,
        }
        state.agents = state.agents.filter(existing => existing.id !== agentId).concat(agent)
        writeState(state)
        return agent
      },
    )
    const cachedAgents = readAgentsCache()
    if (cachedAgents !== null) {
      writeAgentsCache(cachedAgents.filter(existing => existing.id !== agentId).concat(data))
    }
    return normalizeAgent(data)
  },

  async getAdapterModels(adapterType) {
    const data = await withFallback(
      () => request(`/api/adapters/${adapterType}/models`),
      () => [],
    )
    return Array.isArray(data) ? data : []
  },

  async getConversations() {
    const data = await withFallback(
      () => request('/api/conversations'),
      () => readState().conversations,
    )
    return (data || []).map(normalizeConversation)
  },

  async createConversation(payload) {
    const data = await withFallback(
      () => request('/api/conversations', { method: 'POST', body: JSON.stringify(payload) }),
      () => {
        const state = readState()
        const now = nowIso()
        const conversation = {
          id: crypto.randomUUID(),
          title: payload.title,
          created_at: now,
          updated_at: now,
        }
        state.conversations = [conversation, ...state.conversations]
        writeState(state)
        return conversation
      },
    )
    return normalizeConversation(data)
  },

  async deleteConversation(conversationId) {
    await withFallback(
      () => request(`/api/conversations/${conversationId}`, { method: 'DELETE' }),
      () => {
        const state = readState()
        state.conversations = state.conversations.filter(c => c.id !== conversationId)
        state.messages = state.messages.filter(m => m.conversation_id !== conversationId)
        writeState(state)
      },
    )
  },

  async getMessages(conversationId) {
    const data = await withFallback(
      () => request(`/api/conversations/${conversationId}/messages`),
      () => readState().messages.filter(message => message.conversation_id === conversationId),
    )
    return (data || []).map(normalizeMessage)
  },

  async createMessage(conversationId, payload) {
    const data = await withFallback(
      () => request(`/api/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(payload) }),
      () => {
        const state = readState()
        const message = {
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          role: payload.role,
          content: payload.content,
          created_at: nowIso(),
        }
        state.messages = [...state.messages, message]
        state.conversations = state.conversations.map(conversation => (
          conversation.id === conversationId
            ? { ...conversation, updated_at: message.created_at }
            : conversation
        )).sort((left, right) => right.updated_at.localeCompare(left.updated_at))
        writeState(state)
        return message
      },
    )
    return normalizeMessage(data)
  },

  async createAssistantReply(conversationId, payload = {}, options = {}) {
    const data = await request(`/api/conversations/${conversationId}/reply`, {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: options.signal,
    })
    if (!data) {
      const error = new Error('O endpoint /reply nao esta disponivel no backend atual.')
      error.status = 404
      throw error
    }
    return normalizeMessage(data)
  },

  async cancelAssistantReply(conversationId) {
    const data = await request(`/api/conversations/${conversationId}/reply/cancel`, {
      method: 'POST',
    })
    return data || { cancelled: false }
  },

  async getWorkflows() {
    const data = await withFallback(
      () => request('/api/workflows'),
      () => readState().workflows,
    )
    return (data || []).map(normalizeWorkflow)
  },

  async createWorkflow(payload) {
    const data = await withFallback(
      () => request('/api/workflows', { method: 'POST', body: JSON.stringify(payload) }),
      () => {
        const state = readState()
        const now = nowIso()
        const workflow = {
          id: crypto.randomUUID(),
          name: payload.name,
          definition: payload.definition,
          created_at: now,
          updated_at: now,
        }
        state.workflows = [workflow, ...state.workflows]
        writeState(state)
        return workflow
      },
    )
    return normalizeWorkflow(data)
  },

  async updateWorkflow(workflowId, payload) {
    const data = await withFallback(
      () => request(`/api/workflows/${workflowId}`, { method: 'PUT', body: JSON.stringify(payload) }),
      () => {
        const state = readState()
        const existing = state.workflows.find(workflow => workflow.id === workflowId)
        if (!existing) {
          throw new Error('workflow-not-found')
        }
        const workflow = {
          ...existing,
          name: payload.name,
          definition: payload.definition,
          updated_at: nowIso(),
        }
        state.workflows = [workflow, ...state.workflows.filter(item => item.id !== workflowId)]
        writeState(state)
        return workflow
      },
    )
    return normalizeWorkflow(data)
  },

  async deleteWorkflow(workflowId) {
    await withFallback(
      () => request(`/api/workflows/${workflowId}`, { method: 'DELETE' }),
      () => {
        const state = readState()
        state.workflows = state.workflows.filter(w => w.id !== workflowId)
        writeState(state)
      },
    )
  },

  async executeSession(payload, callbacks, signal) {
    const response = await fetch('/api/sessions/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })

    if (!response.ok) {
      const text = await response.text()
      let msg = `Session execution failed (${response.status})`
      try { msg = JSON.parse(text)?.message || msg } catch {}
      throw new Error(msg)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        // Handle both "event: name" (W3C standard) and "event:name" (Spring SseEmitter)
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim()
        } else if (line.startsWith('data:') && currentEvent) {
          try {
            const rawData = line.slice(5).trim()
            const data = JSON.parse(rawData)
            switch (currentEvent) {
              case 'session_started': callbacks.onSessionStarted?.(data); break
              case 'step_started':    callbacks.onStepStarted?.(data);    break
              case 'step_log':        callbacks.onStepLog?.(data);       break
              case 'step_done':       callbacks.onStepDone?.(data);       break
              case 'step_error':      callbacks.onStepError?.(data);      break
              case 'session_done':    callbacks.onSessionDone?.(data);    break
              case 'session_error':   callbacks.onSessionError?.(data);   break
            }
          } catch {}
          currentEvent = null
        } else if (line === '') {
          currentEvent = null
        }
      }
    }
  },
}
