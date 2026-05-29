// forge-workflow.jsx — Visual node-based workflow builder
const { useState, useEffect, useRef, useCallback } = React;

const NODE_TYPES = {
  input: { label: 'Prompt Input', color: '#00cc88', icon: 'inbox', bg: 'rgba(0,204,136,0.1)' },
  claude: { label: 'Claude Code', color: '#d9357a', icon: 'sparkles', bg: 'rgba(217,53,122,0.1)' },
  gemini: { label: 'Gemini', color: '#00b8d4', icon: 'search', bg: 'rgba(0,184,212,0.1)' },
  codex: { label: 'Codex', color: '#00cc88', icon: 'code', bg: 'rgba(0,204,136,0.1)' },
  shell: { label: 'Shell Command', color: '#e6c128', icon: 'terminal', bg: 'rgba(230,193,40,0.1)' },
  condition: { label: 'Condition', color: '#d93346', icon: 'git-branch', bg: 'rgba(217,51,70,0.1)' },
  memory: { label: 'Memory', color: '#00b8d4', icon: 'database', bg: 'rgba(0,184,212,0.1)' },
  file: { label: 'File Writer', color: '#e6c128', icon: 'file-text', bg: 'rgba(230,193,40,0.1)' },
  output: { label: 'Output', color: '#7878a8', icon: 'send', bg: 'rgba(120,120,168,0.1)' }
};

const DEFAULT_NODES = [
{ id: 'n1', type: 'input', x: 60, y: 180, label: 'User Prompt', status: 'done' },
{ id: 'n2', type: 'claude', x: 240, y: 80, label: 'Analyze Code', status: 'done' },
{ id: 'n3', type: 'gemini', x: 240, y: 280, label: 'Research Docs', status: 'running' },
{ id: 'n4', type: 'memory', x: 240, y: 400, label: 'Project Context', status: 'done' },
{ id: 'n5', type: 'condition', x: 440, y: 180, label: 'Route by Task', status: 'running' },
{ id: 'n6', type: 'codex', x: 620, y: 80, label: 'Generate Code', status: 'queued' },
{ id: 'n7', type: 'shell', x: 620, y: 280, label: 'Run Tests', status: 'queued' },
{ id: 'n8', type: 'file', x: 800, y: 180, label: 'Write to Repo', status: 'queued' },
{ id: 'n9', type: 'output', x: 980, y: 180, label: 'Final Output', status: 'queued' }];

// Shared global so Multi-Agent screen can read the workflow nodes without prop drilling
if (!window.__forgeWorkflowNodes) window.__forgeWorkflowNodes = DEFAULT_NODES;
const INIT_NODES = window.__forgeWorkflowNodes;


const EDGES = [
{ from: 'n1', to: 'n2' }, { from: 'n1', to: 'n3' }, { from: 'n1', to: 'n4' },
{ from: 'n2', to: 'n5' }, { from: 'n3', to: 'n5' }, { from: 'n4', to: 'n5' },
{ from: 'n5', to: 'n6' }, { from: 'n5', to: 'n7' },
{ from: 'n6', to: 'n8' }, { from: 'n7', to: 'n8' },
{ from: 'n8', to: 'n9' }];


const NODE_W = 148,NODE_H = 62;

function getCenter(node) {
  return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
}

function bezierPath(from, to) {
  const dx = to.x - from.x;
  const cx1 = from.x + dx * 0.55;
  const cx2 = to.x - dx * 0.55;
  return `M ${from.x} ${from.y} C ${cx1} ${from.y} ${cx2} ${to.y} ${to.x} ${to.y}`;
}

function WorkflowNode({ node, selected, onSelect, dragging, onMouseDown }) {
  const t = NODE_TYPES[node.type];
  const statusColors = { done: 'var(--green)', running: 'var(--blue)', queued: 'var(--text-3)' };
  const isRunning = node.status === 'running';
  return (
    <g transform={`translate(${node.x},${node.y})`}
    style={{ cursor: 'pointer' }}
    onMouseDown={(e) => onMouseDown(e, node.id)}
    onClick={(e) => {e.stopPropagation();onSelect(node);}}>
      {/* Shadow */}
      {selected && <rect x={-2} y={-2} width={NODE_W + 4} height={NODE_H + 4} rx={12} fill="none" stroke={t.color} strokeWidth={1.5} opacity={0.5} />}
      {/* Card bg */}
      <rect width={NODE_W} height={NODE_H} rx={10} fill="var(--surface)" stroke={selected ? t.color : 'var(--border)'} strokeWidth={selected ? 1.5 : 1} />
      {/* Left accent bar */}
      <rect width={3} height={NODE_H} rx={1.5} fill={t.color} opacity={0.8} />
      {/* Icon bg */}
      <rect x={10} y={14} width={34} height={34} rx={8} fill={t.bg} />
      {/* Content */}
      <foreignObject x={50} y={10} width={88} height={42}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
          <div style={{ fontSize: 10, color: t.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>{NODE_TYPES[node.type].label}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginTop: 2, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</div>
        </div>
      </foreignObject>
      {/* Status dot */}
      <circle cx={NODE_W - 10} cy={10} r={4} fill={statusColors[node.status]}>
        {isRunning && <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />}
      </circle>
      {/* Icon render via foreignObject */}
      <foreignObject x={10} y={14} width={34} height={34}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Icon name={t.icon} size={15} color={t.color} />
        </div>
      </foreignObject>
    </g>);

}

function WorkflowBuilderScreen() {
  const [nodes, setNodes] = useState(INIT_NODES);
  const [edges, setEdges] = useState(EDGES);
  const [selectedNode, setSelectedNode] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 20, y: 40 });
  const [addOpen, setAddOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const [saveFlash, setSaveFlash] = useState(false);
  const svgRef = useRef(null);
  const draggingRef = useRef(null);
  const containerRef = useRef(null);

  // Publish nodes to global so Multi-Agent screen stays in sync
  useEffect(() => {
    window.__forgeWorkflowNodes = nodes;
    window.dispatchEvent(new Event('forgeWorkflowUpdated'));
  }, [nodes]);

  // Reset draft when changing node
  useEffect(() => {
    if (selectedNode) {
      setPromptDraft(selectedNode.prompt || `You are ${selectedNode.label}.\nAnalyze the input and produce structured output.`);
    }
  }, [selectedNode?.id]);

  const handleMouseDown = useCallback((e, nodeId) => {
    e.preventDefault();
    draggingRef.current = { nodeId, startX: e.clientX, startY: e.clientY };
    const node = nodes.find((n) => n.id === nodeId);
    draggingRef.current.origX = node.x;
    draggingRef.current.origY = node.y;
    draggingRef.current.moved = false;
    const onMove = (me) => {
      const dx = me.clientX - draggingRef.current.startX;
      const dy = me.clientY - draggingRef.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) draggingRef.current.moved = true;
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, x: draggingRef.current.origX + dx, y: draggingRef.current.origY + dy } : n));
    };
    const onUp = () => {draggingRef.current = null;window.removeEventListener('mousemove', onMove);window.removeEventListener('mouseup', onUp);};
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [nodes]);

  const simulate = () => {
    setExecuting(true);
    // Walk through nodes and update statuses
    setNodes(prev => prev.map(n => ({ ...n, status: 'queued' })));
    setTimeout(() => {
      setNodes(prev => prev.map(n => ({ ...n, status: 'running' })));
      setTimeout(() => {
        setNodes(prev => prev.map(n => ({ ...n, status: 'done' })));
        setExecuting(false);
      }, 1800);
    }, 600);
  };

  const addNode = (type) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? (rect.width / 2) - panOffset.x - NODE_W/2 : 400;
    const cy = rect ? (rect.height / 2) - panOffset.y - NODE_H/2 : 200;
    const id = 'n' + Date.now();
    const newNode = {
      id, type,
      x: cx + Math.random() * 60 - 30,
      y: cy + Math.random() * 60 - 30,
      label: NODE_TYPES[type].label,
      status: 'queued',
    };
    setNodes(p => [...p, newNode]);
    setAddOpen(false);
    setSelectedNode(newNode);
  };

  const deleteNode = (id) => {
    setNodes(p => p.filter(n => n.id !== id));
    setEdges(p => p.filter(e => e.from !== id && e.to !== id));
    setSelectedNode(null);
  };

  const renameNode = (id, label) => {
    setNodes(p => p.map(n => n.id === id ? { ...n, label } : n));
    setSelectedNode(s => s && s.id === id ? { ...s, label } : s);
  };

  const savePrompt = () => {
    if (!selectedNode) return;
    setNodes(p => p.map(n => n.id === selectedNode.id ? { ...n, prompt: promptDraft } : n));
    setSelectedNode(s => s && ({ ...s, prompt: promptDraft }));
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1200);
  };

  const t = selectedNode && NODE_TYPES[selectedNode.type];
  const showInspector = !!selectedNode;
  const hasChanges = selectedNode && promptDraft !== (selectedNode.prompt || `You are ${selectedNode.label}.\nAnalyze the input and produce structured output.`);

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        
          <div style={{ position: 'absolute', top: 14, left: 18, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'none' }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>Code Review Pipeline</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{nodes.length} nodes · {edges.length} edges</div>
          </div>
        

        {/* Run controls */}
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 8 }}>
          <button onClick={simulate} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: executing ? 'var(--surface-3)' : 'var(--blue)', border: 'none', borderRadius: 3, fontSize: 13, color: executing ? 'var(--text-2)' : '#000', cursor: 'pointer', fontWeight: 600 }}>
            {executing ?
            <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Running…</> :
            <><Icon name="play" size={13} color={executing ? 'var(--text-2)' : '#000'} /> Run</>}
          </button>
        </div>

        {/* SVG Canvas */}
        <svg ref={svgRef} width="100%" height="100%" style={{ background: 'var(--bg)' }} onClick={() => setSelectedNode(null)}>
          <defs>
            <pattern id="wf-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="16" cy="16" r="1" fill="var(--border)" opacity="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wf-grid)" />

          <g transform={`translate(${panOffset.x},${panOffset.y})`}>
            {edges.map((e, i) => {
              const fromNode = nodes.find((n) => n.id === e.from);
              const toNode = nodes.find((n) => n.id === e.to);
              if (!fromNode || !toNode) return null;
              const from = { x: fromNode.x + NODE_W, y: fromNode.y + NODE_H / 2 };
              const to = { x: toNode.x, y: toNode.y + NODE_H / 2 };
              const isActive = executing && ['n1', 'n2', 'n3'].includes(e.from);
              return (
                <g key={i}>
                  <path d={bezierPath(from, to)} fill="none" stroke="var(--border-2)" strokeWidth={1.5} />
                  {isActive &&
                  <path d={bezierPath(from, to)} fill="none" stroke="var(--blue)" strokeWidth={2}
                  strokeDasharray="8 6" opacity={0.7}>
                      <animate attributeName="stroke-dashoffset" from="28" to="0" dur="0.8s" repeatCount="indefinite" />
                    </path>
                  }
                  <circle cx={to.x} cy={to.y} r={3} fill="var(--border-2)" />
                </g>);

            })}

            {nodes.map((node) =>
            <WorkflowNode key={node.id} node={node}
            selected={selectedNode?.id === node.id}
            onSelect={setSelectedNode}
            onMouseDown={handleMouseDown} />
            )}
          </g>
        </svg>

        {/* Floating + button */}
        <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 15 }}>
          {addOpen &&
          <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 4, padding: 6, width: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', maxHeight: 280, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 8px 8px', fontFamily: 'var(--mono)' }}>Add Node</div>
              {Object.entries(NODE_TYPES).map(([key, nt]) =>
            <button key={key} onClick={() => addNode(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', width: '100%', background: 'transparent', border: 'none', borderRadius: 3, cursor: 'pointer', color: 'var(--text)', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 22, height: 22, borderRadius: 3, background: nt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={nt.icon} size={12} color={nt.color} />
                  </div>
                  <span style={{ fontSize: 12 }}>{nt.label}</span>
                </button>
            )}
            </div>
          }
          <button onClick={() => setAddOpen((o) => !o)}
          style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--blue)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,184,212,0.4)', transition: 'transform 0.15s', transform: addOpen ? 'rotate(45deg)' : 'rotate(0)' }}>
            <Icon name="plus" size={18} color="#000" strokeWidth={2.5} />
          </button>
        </div>

        {/* Status legend */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 12, padding: '7px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3 }}>
          {[['done', 'var(--green)', 'Done'], ['running', 'var(--blue)', 'Running'], ['queued', 'var(--text-3)', 'Queued']].map(([s, c, l]) =>
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-2)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
              {l}
            </div>
          )}
        </div>
      </div>

      {/* Node inspector — visible only when needed */}
      {showInspector &&
      <div style={{ width: 260, borderLeft: '1px solid var(--border)', background: 'var(--surface)', overflowY: 'auto', animation: 'slideRight 0.18s ease' }} data-comment-anchor="f1d60e1617-div-216-9">
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {selectedNode ? 'Node Inspector' : 'Workflow'}
              </div>
              {selectedNode &&
            <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex' }}>
                  <Icon name="x" size={13} />
                </button>
            }
            </div>
            {!selectedNode &&
          <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Code Review Pipeline</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>Multi-agent workflow for automated code review, test generation, and deployment.</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  {[['Nodes', String(nodes.length)], ['Edges', String(edges.length)], ['Agents', String(new Set(nodes.map(n => n.type)).size)], ['Status', executing ? 'Running' : 'Ready']].map(([k, v]) =>
              <div key={k} style={{ background: 'var(--surface-2)', padding: '8px 10px', borderRadius: 7 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{k}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--mono)', marginTop: 2 }}>{v}</div>
                    </div>
              )}
                </div>
              </div>
          }
            {selectedNode && t &&
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 4, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.color}40` }}>
                    <Icon name={t.icon} size={18} color={t.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: t.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.label}</div>
                    <input value={selectedNode.label} onChange={(e) => renameNode(selectedNode.id, e.target.value)}
                      style={{ width: '100%', fontSize: 14, fontWeight: 600, background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', padding: 0, fontFamily: 'var(--font)' }}
                      onFocus={(e) => e.target.select()}/>
                  </div>
                </div>
                <StatusRow label="Status" value={selectedNode.status} color={selectedNode.status === 'done' ? 'var(--green)' : selectedNode.status === 'running' ? 'var(--blue)' : 'var(--text-3)'} />
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prompt Template</div>
                    {hasChanges && <span style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--mono)' }}>● unsaved</span>}
                  </div>
                  <textarea value={promptDraft} onChange={(e) => setPromptDraft(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: `1px solid ${hasChanges ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 3, padding: '9px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)', resize: 'vertical', minHeight: 100, outline: 'none', lineHeight: 1.55, transition: 'border-color 0.15s' }}/>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={savePrompt} disabled={!hasChanges}
                      style={{ flex: 1, padding: '7px 12px', background: saveFlash ? 'var(--green)' : hasChanges ? 'var(--blue)' : 'var(--surface-2)', border: 'none', borderRadius: 3, fontSize: 12, color: (saveFlash || hasChanges) ? '#000' : 'var(--text-3)', cursor: hasChanges ? 'pointer' : 'default', fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      {saveFlash ? <><Icon name="check" size={12} color="#000" strokeWidth={2.5}/>Saved</> : 'Save changes'}
                    </button>
                    <button onClick={() => deleteNode(selectedNode.id)}
                      title="Delete node"
                      style={{ padding: '7px 11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Icon name="x" size={13}/>
                    </button>
                  </div>
                </div>
              </div>
          }
          </div>
        </div>
      }
    </div>);

}

function StatusRow({ label, value, color, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: mono ? 'var(--mono)' : 'var(--font)', color: color || 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>);

}

Object.assign(window, { WorkflowBuilderScreen });