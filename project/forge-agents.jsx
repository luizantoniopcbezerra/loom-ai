// forge-agents.jsx — Agent Manager
const { useState } = React;

const AGENTS = [
{
  name: 'Claude Code', cli: 'claude', version: '1.8.2', vendor: 'Anthropic',
  color: '#d9357a', bgColor: 'rgba(217,53,122,0.08)',
  status: 'active', runtime: 'Node.js', ctxK: 200,
  caps: ['code', 'analysis', 'chat', 'vision', 'tools'],
  latency: 210, gpu: 0, ram: 380, uptime: '99.8%',
  desc: 'World-class coding agent with extended thinking and tool use.',
  path: '/usr/local/bin/claude'
},
{
  name: 'Gemini CLI', cli: 'gemini', version: '0.1.9', vendor: 'Google',
  color: '#00b8d4', bgColor: 'rgba(0,184,212,0.08)',
  status: 'active', runtime: 'Node.js', ctxK: 1000,
  caps: ['research', 'vision', 'chat', 'code', 'multimodal'],
  latency: 340, gpu: 0, ram: 290, uptime: '98.4%',
  desc: 'Massive context window with native multimodal understanding.',
  path: '/usr/local/bin/gemini'
},
{
  name: 'Codex CLI', cli: 'codex', version: '0.2.1', vendor: 'OpenAI',
  color: '#00cc88', bgColor: 'rgba(0,204,136,0.08)',
  status: 'active', runtime: 'Node.js', ctxK: 128,
  caps: ['codegen', 'complete', 'explain', 'test'],
  latency: 180, gpu: 0, ram: 220, uptime: '97.1%',
  desc: 'Specialized code completion and generation in sandboxed env.',
  path: '/usr/local/bin/codex'
},
{
  name: 'Copilot CLI', cli: 'gh copilot', version: '2.0.1', vendor: 'GitHub',
  color: '#00b8d4', bgColor: 'rgba(0,184,212,0.08)',
  status: 'idle', runtime: 'Go binary', ctxK: 32,
  caps: ['explain', 'suggest', 'shell', 'git'],
  latency: 95, gpu: 0, ram: 110, uptime: '99.9%',
  desc: 'Terminal-native shell and git command assistant.',
  path: '/usr/local/bin/gh'
},
{
  name: 'Aider', cli: 'aider', version: '0.50.1', vendor: 'Community',
  color: '#e6c128', bgColor: 'rgba(230,193,40,0.08)',
  status: 'active', runtime: 'Python', ctxK: 128,
  caps: ['edit', 'commit', 'refactor', 'chat'],
  latency: 280, gpu: 0, ram: 460, uptime: '96.3%',
  desc: 'AI pair programmer that edits code in your local git repo.',
  path: '/usr/bin/aider'
},
{
  name: 'OpenCode', cli: 'opencode', version: '0.1.4', vendor: 'Community',
  color: '#d93346', bgColor: 'rgba(217,51,70,0.08)',
  status: 'idle', runtime: 'Go binary', ctxK: 64,
  caps: ['interactive', 'lsp', 'edit', 'diff'],
  latency: 120, gpu: 0, ram: 195, uptime: '94.7%',
  desc: 'LSP-aware terminal coding assistant with diff-first workflow.',
  path: '/usr/local/bin/opencode'
}];


function AgentCard({ agent, selected, onSelect, onAction }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onSelect(agent)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? agent.bgColor : 'var(--surface)',
        border: `1px solid ${selected ? agent.color + '60' : hovered ? 'var(--border-2)' : 'var(--border)'}`,
        borderRadius: 4,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: 'fadeUp 0.3s ease'
      }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 3, background: agent.bgColor, border: `1px solid ${agent.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="agent" size={16} color={agent.color} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>{agent.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{agent.vendor} · v{agent.version}</div>
          </div>
        </div>
        <StatusDot status={agent.status} />
      </div>

      {/* Description */}
      <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{agent.desc}</p>

      {/* Capabilities (max 3) */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {agent.caps.slice(0, 3).map((c) => <Badge key={c} style={{ fontSize: 10 }}>{c}</Badge>)}
      </div>

      {/* Footer — single primary action */}
      <button
        onClick={(e) => { e.stopPropagation(); onAction && onAction(agent); }}
        style={{ padding: '7px 12px', background: agent.status === 'active' ? agent.color : 'transparent', border: agent.status === 'active' ? 'none' : `1px solid ${agent.color}60`, borderRadius: 3, fontSize: 12, color: agent.status === 'active' ? '#000' : agent.color, cursor: 'pointer', fontWeight: 600, marginTop: 'auto' }}>
        {agent.status === 'active' ? 'Use agent' : 'Activate'}
      </button>
    </div>);

}

function AgentManagerScreen() {
  const [selected, setSelected] = useState(null);
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(AGENTS.map(a => [a.name, a.status]))
  );
  const [toast, setToast] = useState(null);

  const handleAction = (agent) => {
    if (statuses[agent.name] === 'active') {
      window.__forgeUseAgent && window.__forgeUseAgent(agent.name);
      window.__forgeNavigate && window.__forgeNavigate('workspace');
    } else {
      setStatuses(p => ({ ...p, [agent.name]: 'active' }));
      setToast(`${agent.name} activated`);
      setTimeout(() => setToast(null), 1800);
    }
  };

  const agentsWithStatus = AGENTS.map(a => ({ ...a, status: statuses[a.name] }));
  const activeCount = Object.values(statuses).filter(s => s === 'active').length;

  return (
    <div style={{ height: '100%', overflowY: 'auto', position: 'relative' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Agent Manager</h1>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 4 }}>
              {AGENTS.length} agents detected · {activeCount} active · fully offline
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button title="Re-scan local AI environment" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 3, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>
              <Icon name="refresh" size={13} />
              Re-scan
            </button>
          </div>
        </div>

        {/* Agent grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {agentsWithStatus.map((a) =>
            <AgentCard key={a.name} agent={a} selected={selected?.name === a.name} onSelect={setSelected} onAction={handleAction} />
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'var(--surface)', border:'1px solid var(--blue)', borderRadius:3, padding:'9px 18px', fontSize:13, color:'var(--blue)', fontFamily:'var(--mono)', boxShadow:'0 8px 32px rgba(0,184,212,0.2)', animation:'fadeUp 0.2s ease', zIndex:100 }}>
          ✓ {toast}
        </div>
      )}
    </div>);

}

Object.assign(window, { AgentManagerScreen });