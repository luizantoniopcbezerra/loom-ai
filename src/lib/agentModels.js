const ADAPTERS = {
  claude_local: {
    label: 'Claude Code (local)',
    shortLabel: 'Claude',
    color: '#d9357a',
    bgColor: 'rgba(217,53,122,0.08)',
    runtime: 'Node.js',
    caps: ['code', 'analysis', 'chat', 'tools'],
    role: 'Architecture Analyst',
    icon: 'sparkles',
    desc: 'Local Claude Code adapter with managed model and prompt configuration.',
    models: [
      'claude-opus-4-7',
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'claude-haiku-4-6',
      'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251001',
    ],
  },
  codex_local: {
    label: 'Codex (local)',
    shortLabel: 'Codex',
    color: '#00cc88',
    bgColor: 'rgba(0,204,136,0.08)',
    runtime: 'Node.js',
    caps: ['codegen', 'complete', 'test', 'exec'],
    role: 'Code Generator',
    icon: 'code',
    desc: 'Local Codex adapter with selectable model lane and command overrides.',
    models: ['gpt-5.4', 'gpt-5.3-codex', 'gpt-5.3-codex-spark', 'gpt-5', 'o3', 'o4-mini', 'gpt-5-mini', 'gpt-5-nano', 'o3-mini', 'codex-mini-latest'],
  },
  gemini_local: {
    label: 'Gemini CLI (local)',
    shortLabel: 'Gemini',
    color: '#00b8d4',
    bgColor: 'rgba(0,184,212,0.08)',
    runtime: 'Node.js',
    caps: ['research', 'vision', 'chat', 'multimodal'],
    role: 'Research & Docs',
    icon: 'search',
    desc: 'Local Gemini adapter for multimodal and large-context workflows.',
    models: ['gemini-3.1-pro', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  },
  opencode_local: {
    label: 'OpenCode (local)',
    shortLabel: 'OpenCode',
    color: '#d93346',
    bgColor: 'rgba(217,51,70,0.08)',
    runtime: 'Go binary',
    caps: ['interactive', 'edit', 'diff', 'lsp'],
    role: 'Diff Operator',
    icon: 'layers',
    desc: 'Local OpenCode adapter with provider/model routing.',
    models: ['opencode/big-pickle', 'opencode/deepseek-v4-flash-free', 'opencode/nemotron-3-super-free'],
  },
  aider_local: {
    label: 'Aider (local)',
    shortLabel: 'Aider',
    color: '#e6c128',
    bgColor: 'rgba(230,193,40,0.08)',
    runtime: 'Python',
    caps: ['edit', 'commit', 'refactor', 'chat'],
    role: 'Patch & Review',
    icon: 'git-merge',
    desc: 'Local aider adapter kept for compatibility with the previous machine scan flow.',
    models: ['sonnet', 'o3-mini', 'r1', 'deepseek/deepseek-chat', 'gpt-4o'],
  },
  copilot_local: {
    label: 'Copilot CLI (local)',
    shortLabel: 'Copilot',
    color: '#00b8d4',
    bgColor: 'rgba(0,184,212,0.08)',
    runtime: 'Go binary',
    caps: ['shell', 'git', 'suggest', 'explain'],
    role: 'Shell Assistant',
    icon: 'terminal',
    desc: 'Local Copilot CLI adapter kept for compatibility.',
    models: ['gpt-4.1', 'gpt-5.2', 'gpt-5.2-codex', 'gpt-5.4-mini', 'gpt-5-mini', 'claude-haiku-4.5'],
  },
  antigravity_local: {
    label: 'Antigravity CLI (local)',
    shortLabel: 'Antigravity',
    color: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.08)',
    runtime: 'Local',
    caps: ['automation', 'local', 'chat'],
    role: 'Local Automation',
    icon: 'cpu',
    desc: 'Local custom adapter for machine-native automation.',
    models: ['local-instruct-8b', 'qwen2.5-coder-14b'],
  },
  custom_local: {
    label: 'Custom Local',
    shortLabel: 'Custom',
    color: '#64748b',
    bgColor: 'rgba(100,116,139,0.08)',
    runtime: 'Custom',
    caps: ['local'],
    role: 'Local Agent',
    icon: 'agent',
    desc: 'Custom local adapter for unsupported or manually configured CLIs.',
    models: ['default'],
  },
}

const LEGACY_NAME_TO_ADAPTER = {
  'Claude Code': 'claude_local',
  'Codex CLI': 'codex_local',
  'Gemini CLI': 'gemini_local',
  OpenCode: 'opencode_local',
  Aider: 'aider_local',
  'Copilot CLI': 'copilot_local',
  'Antigravity CLI': 'antigravity_local',
}

export const AGENT_COLORS = Object.fromEntries(
  Object.values(ADAPTERS).map(meta => [meta.label, meta.color]),
)

export function getAdapterMeta(adapterType) {
  return ADAPTERS[adapterType] || ADAPTERS.custom_local
}

export function getAvailableAdapterOptions() {
  return Object.entries(ADAPTERS)
    .filter(([adapterType]) => adapterType !== 'custom_local')
    .map(([adapterType, meta]) => ({
      value: adapterType,
      label: meta.label,
      desc: meta.desc,
    }))
}

export function resolveAdapterType(agentOrName) {
  if (typeof agentOrName === 'object' && agentOrName) {
    return agentOrName.adapterType || agentOrName.adapter_type || LEGACY_NAME_TO_ADAPTER[agentOrName.name] || 'custom_local'
  }
  return LEGACY_NAME_TO_ADAPTER[agentOrName] || 'custom_local'
}

export function getModelsForAgent(agentOrName) {
  return getAdapterMeta(resolveAdapterType(agentOrName)).models
}

export function getDefaultModelForAgent(agentOrName) {
  return getModelsForAgent(agentOrName)[0]
}

export function getAgentSelection(agentOrName, storedModel) {
  const adapterType = resolveAdapterType(agentOrName)
  const models = getModelsForAgent(agentOrName)
  const agentName = typeof agentOrName === 'object' && agentOrName ? agentOrName.name : agentOrName
  const agentId = typeof agentOrName === 'object' && agentOrName ? agentOrName.id : null
  return {
    agent: agentName,
    agentId,
    adapterType,
    model: models.includes(storedModel) ? storedModel : models[0],
    models,
  }
}
