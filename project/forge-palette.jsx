// forge-palette.jsx — Command Palette overlay
const { useState, useEffect, useRef } = React;

const PALETTE_ITEMS = [
  { cat:'Recent', icon:'clock',    color:'var(--text-3)', label:'Auth module refactor',         sub:'Claude Code · 2m ago',        action:'workspace' },
  { cat:'Recent', icon:'clock',    color:'var(--text-3)', label:'Test generation session',       sub:'Codex · 18m ago',             action:'workspace' },
  { cat:'Agents', icon:'sparkles', color:'#d9357a',       label:'Open Claude Code',              sub:'v1.8.2 · active',             action:'agents' },
  { cat:'Agents', icon:'search',   color:'#00b8d4',       label:'Open Gemini CLI',               sub:'v0.1.9 · active',             action:'agents' },
  { cat:'Agents', icon:'code',     color:'#00cc88',       label:'Open Codex CLI',                sub:'v0.2.1 · active',             action:'agents' },
  { cat:'Actions', icon:'workflow',color:'var(--blue)',   label:'New Workflow',                  sub:'Open workflow builder',       action:'workflow' },
  { cat:'Actions', icon:'terminal',color:'var(--green)',  label:'New Terminal Session',          sub:'Open split terminal',         action:'terminal' },
  { cat:'Actions', icon:'users',   color:'var(--purple)', label:'Start Multi-Agent Session',    sub:'Collaborative workspace',     action:'multiagent' },
  { cat:'Actions', icon:'cpu',     color:'var(--amber)',  label:'Manage Local Models',           sub:'Download, load, monitor',     action:'models' },
  { cat:'Actions', icon:'package', color:'var(--text-2)', label:'Browse Marketplace',           sub:'MCP, workflows, tools',       action:'marketplace' },
  { cat:'Navigate', icon:'settings',color:'var(--text-2)',label:'Open Settings',                sub:'Preferences and configuration',action:'settings' },
  { cat:'Navigate', icon:'home',   color:'var(--text-2)', label:'Go to Chat Workspace',         sub:'Main conversation area',      action:'workspace' },
  { cat:'Models',  icon:'cpu',     color:'var(--red)',    label:'Load deepseek-r1:32b',          sub:'19.8 GB · Q4_K_M',           action:'models' },
  { cat:'Models',  icon:'cpu',     color:'var(--amber)',  label:'Load qwen2.5-coder:32b',        sub:'18.5 GB · Q4_K_M',           action:'models' },
  { cat:'Memory',  icon:'database',color:'var(--blue)',   label:'Search memory: auth',           sub:'14 relevant fragments',       action:'workspace' },
];

function PaletteScreen({ onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const filtered = query
    ? PALETTE_ITEMS.filter(i => i.label.toLowerCase().includes(query.toLowerCase()) || i.sub.toLowerCase().includes(query.toLowerCase()) || i.cat.toLowerCase().includes(query.toLowerCase()))
    : PALETTE_ITEMS;

  // Group by category
  const groups = [];
  const seen = new Set();
  filtered.forEach(item => {
    if (!seen.has(item.cat)) { seen.add(item.cat); groups.push({ cat: item.cat, items: [] }); }
    groups.find(g => g.cat === item.cat).items.push(item);
  });

  // Flat list for keyboard nav
  const flatItems = filtered;

  useEffect(() => { setActive(0); }, [query]);

  const handleKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(p => Math.min(p+1, flatItems.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(p => Math.max(p-1, 0)); }
    if (e.key === 'Enter')     { if (flatItems[active]) { onNavigate(flatItems[active].action); onClose(); } }
    if (e.key === 'Escape')    { onClose(); }
  };

  const select = (item) => { onNavigate(item.action); onClose(); };

  let flatIdx = 0;

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(12px)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:120, animation:'fadeIn 0.12s ease' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:620, background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:16, overflow:'hidden', boxShadow:'0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)', animation:'fadeUp 0.18s ease' }}>

        {/* Search input */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <Icon name="search" size={18} color="var(--text-3)"/>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder="Search agents, actions, files, models…"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:15, fontFamily:'var(--font)' }}/>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <kbd style={{ padding:'2px 7px', background:'var(--surface-3)', border:'1px solid var(--border-2)', borderRadius:5, fontSize:11, color:'var(--text-3)', fontFamily:'var(--font)' }}>↑↓</kbd>
            <kbd style={{ padding:'2px 7px', background:'var(--surface-3)', border:'1px solid var(--border-2)', borderRadius:5, fontSize:11, color:'var(--text-3)', fontFamily:'var(--font)' }}>⏎</kbd>
            <kbd style={{ padding:'2px 7px', background:'var(--surface-3)', border:'1px solid var(--border-2)', borderRadius:5, fontSize:11, color:'var(--text-3)', fontFamily:'var(--font)' }}>esc</kbd>
          </div>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight:420, overflowY:'auto' }}>
          {groups.length === 0 && (
            <div style={{ padding:32, textAlign:'center', color:'var(--text-3)', fontSize:14 }}>
              No results for "{query}"
            </div>
          )}
          {groups.map(group => (
            <div key={group.cat}>
              <div style={{ padding:'9px 18px 4px', fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                {group.cat}
              </div>
              {group.items.map(item => {
                const idx = flatIdx++;
                const isActive = idx === active;
                return (
                  <div key={item.label} onClick={() => select(item)}
                    onMouseEnter={() => setActive(idx)}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 16px', background: isActive ? 'var(--surface-2)' : 'transparent', borderLeft: `2px solid ${isActive ? item.color || 'var(--blue)' : 'transparent'}`, cursor:'pointer', transition:'all 0.1s' }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:`${isActive ? (item.color || 'var(--blue)') : 'var(--surface-3)'}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.1s' }}>
                      <Icon name={item.icon} size={14} color={isActive ? (item.color || 'var(--blue)') : 'var(--text-3)'}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--text)' : 'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{item.sub}</div>
                    </div>
                    {isActive && <Icon name="arrow-right" size={14} color="var(--text-3)"/>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding:'9px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:16, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--text-3)' }}>{flatItems.length} result{flatItems.length !== 1 ? 's' : ''}</span>
          <div style={{ flex:1 }}/>
          <span style={{ fontSize:11, color:'var(--text-3)' }}>
            <kbd style={{ padding:'1px 5px', background:'var(--surface-3)', border:'1px solid var(--border-2)', borderRadius:3, fontSize:10, fontFamily:'var(--font)', marginRight:5 }}>⌘K</kbd>
            to open anytime
          </span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PaletteScreen });
