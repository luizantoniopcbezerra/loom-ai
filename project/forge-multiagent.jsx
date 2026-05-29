// forge-multiagent.jsx — Multi-agent collaboration view
const { useState, useEffect, useRef } = React;

// Node types that represent actual AI agents in the workflow
const AGENT_NODE_TYPES = ['claude', 'gemini', 'codex'];

const AGENT_TYPE_META = {
  claude: { name:'Claude Code', color:'#d9357a', bg:'rgba(217,53,122,0.08)', icon:'sparkles' },
  gemini: { name:'Gemini',      color:'#00b8d4', bg:'rgba(0,184,212,0.08)', icon:'search'   },
  codex:  { name:'Codex',       color:'#00cc88', bg:'rgba(0,204,136,0.08)', icon:'code'     },
};

const AGENT_INITIAL_MESSAGES = {
  claude: [
    { from:'system', text:'Analyzing project architecture…' },
    { from:'agent', text:'I\'ve mapped the dependency graph. The auth module has 14 direct dependents. Refactoring to clean architecture will reduce coupling by ~60%.' },
    { from:'agent', text:'Proposed layer structure:\n→ Domain (entities, value objects)\n→ Application (use cases)\n→ Infrastructure (DB, JWT, sessions)\n→ Presentation (HTTP handlers)' },
  ],
  gemini: [
    { from:'system', text:'Searching documentation…' },
    { from:'agent', text:'Found FastAPI best practices for auth: OAuth2PasswordBearer + JWT is the standard pattern. Latest FastAPI 0.115 has improved dependency injection for auth middleware.' },
    { from:'agent', text:'Key refs:\n• OWASP Auth Cheatsheet 2024\n• FastAPI security docs\n• argon2-cffi for password hashing' },
  ],
  codex: [
    { from:'system', text:'Waiting for architecture spec…' },
    { from:'agent', text:'Received spec from Claude. Generating auth/domain/entities.py…' },
    { from:'agent', text:'Generated:\n✓ UserEntity (12 methods)\n✓ TokenValueObject\n✓ SessionAggregate\n⟳ Generating use cases…' },
  ],
};

// Scripted messages that fire as the session progresses — only targets agent types above
const UPCOMING_EVENTS = [
  { at: 38, agentId: 'codex',  from: 'agent',  text: 'Generated:\n✓ AuthenticateUser (use case)\n✓ RefreshToken (use case)\n✓ LogoutSession (use case)' },
  { at: 42, agentId: 'codex',  from: 'agent',  text: '⟳ Generating presentation layer (FastAPI routes)…' },
  { at: 49, agentId: 'gemini', from: 'agent',  text: 'Routing review task to Claude Code' },
  { at: 51, agentId: 'claude', from: 'system', text: 'Reviewing generated code…' },
  { at: 54, agentId: 'claude', from: 'agent',  text: 'Code looks solid. Minor suggestions:\n• Add type hints to RefreshToken\n• Extract magic numbers to constants\n• Add tests/test_auth_use_cases.py' },
  { at: 58, agentId: 'claude', from: 'agent',  text: '✓ All phases complete\n→ 12 files generated\n→ 8 use cases · 14 tests\n→ Ready for commit' },
];

const TIMELINE_EVENTS = [
  { t:0,  agentId:'claude', color:'#d9357a', label:'Session started'    },
  { t:12, agentId:'claude', color:'#d9357a', label:'Arch analysis'      },
  { t:18, agentId:'gemini', color:'#00b8d4', label:'Docs research'      },
  { t:26, agentId:'codex',  color:'#00cc88', label:'Entities generated' },
  { t:38, agentId:'codex',  color:'#00cc88', label:'Use cases'          },
  { t:46, agentId:'codex',  color:'#00cc88', label:'Generation done'    },
  { t:54, agentId:'claude', color:'#d9357a', label:'Code reviewed'      },
  { t:58, agentId:'claude', color:'#d9357a', label:'Complete'           },
];

const MAX_ELAPSED = 60;

function getWorkflowAgents() {
  const nodes = window.__forgeWorkflowNodes || [];
  const seen = new Set();
  const result = [];
  for (const node of nodes) {
    if (AGENT_NODE_TYPES.includes(node.type) && !seen.has(node.type)) {
      seen.add(node.type);
      const meta = AGENT_TYPE_META[node.type];
      result.push({
        id: node.type,
        name: meta.name,
        role: node.label,
        color: meta.color,
        bg: meta.bg,
        icon: meta.icon,
        messages: AGENT_INITIAL_MESSAGES[node.type] || [],
      });
    }
  }
  return result;
}

function buildMessageState(agents) {
  return Object.fromEntries(agents.map(a => [a.id, [...a.messages]]));
}

function AgentPane({ agent, streamingIdx, running }) {
  const endRef = useRef(null);
  const isStreaming = streamingIdx === agent.id && running;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [agent.messages, isStreaming]);
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Pane header */}
      <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)', background:'var(--surface)', flexShrink:0, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:24, height:24, borderRadius:3, background:agent.bg, border:`1px solid ${agent.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name={agent.icon} size={12} color={agent.color}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:agent.color }}>{agent.name}</div>
          <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{agent.role}</div>
        </div>
        {isStreaming && (
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:agent.color, animation:'pulse 1s ease-in-out infinite' }}/>
            <span style={{ fontSize:11, color:agent.color, fontFamily:'var(--mono)' }}>live</span>
          </div>
        )}
      </div>
      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
        {agent.messages.map((msg, i) => (
          <div key={i} style={{ animation:'fadeUp 0.2s ease' }}>
            {msg.from === 'system' ? (
              <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)', padding:'5px 0', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                ⟫ {msg.text}
              </div>
            ) : (
              <div style={{ background:agent.bg, borderRadius:8, padding:'10px 12px', border:`1px solid ${agent.color}20` }}>
                <pre style={{ fontFamily:'var(--font)', fontSize:12.5, lineHeight:1.6, color:'var(--text)', whiteSpace:'pre-wrap', margin:0 }}>{msg.text}</pre>
              </div>
            )}
          </div>
        ))}
        {isStreaming && (
          <div style={{ background:agent.bg, borderRadius:8, padding:'10px 12px', border:`1px solid ${agent.color}30` }}>
            <span style={{ animation:'streamDot1 1.2s ease-in-out infinite', color:agent.color }}>▪</span>
            <span style={{ animation:'streamDot2 1.2s 0.2s ease-in-out infinite', color:agent.color, marginLeft:3 }}>▪</span>
            <span style={{ animation:'streamDot3 1.2s 0.4s ease-in-out infinite', color:agent.color, marginLeft:3 }}>▪</span>
          </div>
        )}
        <div ref={endRef}/>
      </div>
    </div>
  );
}

function MultiAgentScreen() {
  const [agents, setAgents] = useState(() => getWorkflowAgents());
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(34);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [agentMessages, setAgentMessages] = useState(() => buildMessageState(getWorkflowAgents()));
  const [firedEventIds, setFiredEventIds] = useState(new Set());
  const [streamingIdx, setStreamingIdx] = useState(() => {
    const ag = getWorkflowAgents();
    return ag.find(a => a.id === 'codex')?.id || ag[0]?.id || null;
  });

  // Re-derive agents when workflow changes
  useEffect(() => {
    const handler = () => {
      const next = getWorkflowAgents();
      setAgents(next);
      setAgentMessages(buildMessageState(next));
      setFiredEventIds(new Set());
      setStreamingIdx(next.find(a => a.id === 'codex')?.id || next[0]?.id || null);
      setElapsed(34);
      setRunning(false);
    };
    window.addEventListener('forgeWorkflowUpdated', handler);
    return () => window.removeEventListener('forgeWorkflowUpdated', handler);
  }, []);

  // Tick: advance elapsed and fire scripted events while running
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        UPCOMING_EVENTS.forEach((ev, idx) => {
          if (ev.at <= next && !firedEventIds.has(idx)) {
            setAgentMessages(p => {
              if (p[ev.agentId] === undefined) return p;
              return { ...p, [ev.agentId]: [...p[ev.agentId], { from: ev.from, text: ev.text }] };
            });
            setStreamingIdx(ev.agentId);
            setFiredEventIds(p => { const n = new Set(p); n.add(idx); return n; });
          }
        });
        if (next >= MAX_ELAPSED) { setRunning(false); return MAX_ELAPSED; }
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [running, firedEventIds]);

  const reset = () => {
    const ag = getWorkflowAgents();
    setElapsed(34);
    setFiredEventIds(new Set());
    setAgentMessages(buildMessageState(ag));
    setStreamingIdx(ag.find(a => a.id === 'codex')?.id || ag[0]?.id || null);
    setRunning(false);
  };

  const agentsWithMessages = agents.map(a => ({ ...a, messages: agentMessages[a.id] || [] }));
  const activeAgentIds = new Set(agents.map(a => a.id));
  const filteredTimeline = TIMELINE_EVENTS.filter(e => activeAgentIds.has(e.agentId));
  const progressPct = Math.min((elapsed / MAX_ELAPSED) * 100, 100);
  const doneEvents = filteredTimeline.filter(e => e.t <= elapsed).length;
  const isComplete = elapsed >= MAX_ELAPSED;

  const cols = agents.length <= 1 ? 1 : 2;
  const rows = Math.ceil(agents.length / cols);

  if (agents.length === 0) {
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
        <div style={{ height:44, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, padding:'0 18px', background:'var(--bg)', flexShrink:0 }}>
          <span style={{ fontWeight:700, fontSize:14, letterSpacing:'-0.01em' }}>Multi-Agent</span>
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, color:'var(--text-3)' }}>
          <Icon name="users" size={36} color="var(--border-2)"/>
          <div style={{ fontSize:14, color:'var(--text-2)' }}>No agent nodes in the workflow</div>
          <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:'var(--mono)' }}>Add Claude, Gemini or Codex nodes in Workflow Builder</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
      {/* Top bar */}
      <div style={{ height:44, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, padding:'0 18px', background:'var(--bg)', flexShrink:0 }}>
        <span style={{ fontWeight:700, fontSize:14, letterSpacing:'-0.01em' }}>Multi-Agent</span>
        <span title="Offline — running locally" style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', cursor:'help' }}/>
        {isComplete && (
          <span style={{ padding:'2px 8px', background:'var(--green-dim)', border:'1px solid rgba(0,204,136,0.3)', borderRadius:3, fontSize:10, color:'var(--green)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>
            ✓ complete
          </span>
        )}
        <div style={{ flex:1 }}/>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-2)' }}>
          {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}
        </span>
        {isComplete ? (
          <button onClick={reset}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background:'transparent', border:'1px solid var(--border)', borderRadius:3, fontSize:12, color:'var(--text-2)', cursor:'pointer', fontWeight:600 }}>
            <Icon name="refresh" size={12}/>Restart
          </button>
        ) : (
          <button onClick={() => setRunning(p => !p)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background: running ? 'transparent' : 'var(--blue)', border: running ? '1px solid var(--border)' : 'none', borderRadius:3, fontSize:12, color: running ? 'var(--text-2)' : '#000', cursor:'pointer', fontWeight:600 }}>
            {running ? <><Icon name="pause" size={12}/>Pause</> : <><Icon name="play" size={12} color="#000"/>Resume</>}
          </button>
        )}
      </div>

      {/* Agent grid — derived from workflow nodes */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gridTemplateRows:`repeat(${rows}, 1fr)`, gap:1, background:'var(--border)', overflow:'hidden' }}>
        {agentsWithMessages.map(agent => (
          <div key={agent.id} style={{ background:'var(--bg)', overflow:'hidden' }}>
            <AgentPane agent={agent} streamingIdx={streamingIdx} running={running}/>
          </div>
        ))}
      </div>

      {/* Timeline — collapsible */}
      <div style={{ borderTop:'1px solid var(--border)', background:'var(--bg)', flexShrink:0 }}>
        {!timelineExpanded && (
          <button onClick={() => setTimelineExpanded(true)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 18px', width:'100%', background:'transparent', border:'none', cursor:'pointer', color:'var(--text-2)' }}>
            <div style={{ flex:1, height:3, background:'var(--surface-2)', borderRadius:1.5, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${progressPct}%`, background: isComplete ? 'var(--green)' : 'var(--blue)', borderRadius:1.5, transition:'width 0.3s, background 0.3s' }}/>
            </div>
            <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-3)' }}>{doneEvents}/{filteredTimeline.length}</span>
            <Icon name="chevron-up" size={13} color="var(--text-3)"/>
          </button>
        )}
        {timelineExpanded && (
          <div style={{ padding:'10px 18px 14px', animation:'fadeUp 0.18s ease' }}>
            <button onClick={() => setTimelineExpanded(false)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'transparent', border:'none', cursor:'pointer', color:'var(--text-2)', padding:0, marginBottom:8 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'var(--mono)' }}>Execution Timeline · {doneEvents}/{filteredTimeline.length}</span>
              <Icon name="chevron-down" size={13} color="var(--text-3)"/>
            </button>
            <TimelineTrack progressPct={progressPct} elapsed={elapsed} timelineEvents={filteredTimeline}/>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineTrack({ progressPct, elapsed, timelineEvents }) {
  return (
    <div style={{ position:'relative', height:32 }}>
      <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'var(--border-2)', transform:'translateY(-50%)' }}/>
      <div style={{ position:'absolute', top:'50%', left:0, width:`${progressPct}%`, height:2, background:'linear-gradient(90deg, var(--blue), var(--purple))', transform:'translateY(-50%)', borderRadius:1, transition:'width 0.3s' }}/>
      {timelineEvents.map((ev, i) => {
        const pct = (ev.t / MAX_ELAPSED) * 100;
        const done = ev.t <= elapsed;
        const running = ev.t > elapsed - 3 && ev.t <= elapsed;
        return (
          <div key={i} style={{ position:'absolute', left:`${pct}%`, top:'50%', transform:'translateX(-50%) translateY(-50%)' }}>
            <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background: done ? ev.color : 'var(--surface-3)', border:`1.5px solid ${done ? ev.color : 'var(--border-2)'}`,
                boxShadow: running ? `0 0 8px ${ev.color}` : 'none',
                animation: running ? 'statusGlowBlue 1.5s ease-in-out infinite' : 'none', transition:'background 0.3s, border-color 0.3s' }}/>
              <div style={{ position:'absolute', top:14, fontSize:9, color: done ? 'var(--text-2)' : 'var(--text-3)', whiteSpace:'nowrap', maxWidth:80, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis' }}>
                {ev.label}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ position:'absolute', left:`${progressPct}%`, top:-4, bottom:-4, width:2, background:'var(--blue)', borderRadius:1, boxShadow:'0 0 8px var(--blue-glow)', transition:'left 0.3s' }}/>
    </div>
  );
}

Object.assign(window, { MultiAgentScreen });
