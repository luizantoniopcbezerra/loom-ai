// forge-app.jsx — Main app shell, sidebar, title bar, tweaks
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#4f8eff",
  "sidebarExpanded": true,
  "density": "comfortable",
  "reduceMotion": false
}/*EDITMODE-END*/;

const NAV_ITEMS = [
  { id:'workspace',   icon:'chat',      label:'Chats',        group:'main' },
  { id:'agents',      icon:'agent',     label:'Agents',       group:'main' },
  { id:'workflow',    icon:'workflow',  label:'Workflows',    group:'main' },
  { id:'terminal',    icon:'terminal',  label:'Terminal',     group:'main' },
  { id:'multiagent',  icon:'users',     label:'Multi-Agent',  group:'main' },
  { id:'models',      icon:'cpu',       label:'Models',       group:'data' },
  { id:'marketplace', icon:'package',   label:'Marketplace',  group:'data' },
  { id:'settings',    icon:'settings',  label:'Settings',     group:'bottom' },
];

function TitleBar({ onPalette }) {
  return (
    <div style={{ height:'var(--titlebar-h)', background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', paddingLeft:16, paddingRight:16, flexShrink:0, WebkitAppRegion:'drag', userSelect:'none' }}>
      {/* Traffic lights */}
      <div style={{ display:'flex', gap:6, marginRight:16 }}>
        {['#ff5f57','#febc2e','#28c840'].map((c,i) => (
          <div key={i} style={{ width:12, height:12, borderRadius:'50%', background:c, cursor:'pointer', WebkitAppRegion:'no-drag' }}/>
        ))}
      </div>
      {/* App title */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <ForgeLogo size={18}/>
        <span style={{ fontSize:13, fontWeight:700, letterSpacing:'-0.01em', background:'linear-gradient(90deg, var(--text) 40%, var(--text-2))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Forge
        </span>
      </div>
      <div style={{ flex:1 }}/>
      {/* Command palette trigger */}
      <button onClick={onPalette}
        style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:7, cursor:'pointer', color:'var(--text-3)', fontSize:12, WebkitAppRegion:'no-drag', transition:'all 0.15s' }}>
        <Icon name="search" size={13}/>
        <span>Search or jump to…</span>
        <kbd style={{ display:'flex', alignItems:'center', gap:2, padding:'1px 5px', background:'var(--surface-3)', border:'1px solid var(--border-2)', borderRadius:4, fontSize:10, color:'var(--text-3)', fontFamily:'var(--font)' }}>
          <span>⌘</span><span>K</span>
        </kbd>
      </button>
      {/* Window controls placeholder */}
      <div style={{ display:'flex', gap:6, marginLeft:16 }}>
        <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', WebkitAppRegion:'no-drag', padding:4 }}>
          <Icon name="minimize" size={13}/>
        </button>
        <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', WebkitAppRegion:'no-drag', padding:4 }}>
          <Icon name="maximize" size={13}/>
        </button>
      </div>
    </div>
  );
}

function Sidebar({ screen, onScreen, onPalette, expanded, onToggle }) {
  const main  = NAV_ITEMS.filter(n => n.group === 'main');
  const data  = NAV_ITEMS.filter(n => n.group === 'data');
  const btm   = NAV_ITEMS.filter(n => n.group === 'bottom');

  function NavBtn({ item }) {
    const active = screen === item.id;
    const [hovered, setHovered] = useState(false);
    return (
      <button onClick={() => onScreen(item.id)}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        title={!expanded ? item.label : undefined}
        style={{
          display:'flex', alignItems:'center', gap:10,
          padding: expanded ? '8px 12px' : '9px 0',
          justifyContent: expanded ? 'flex-start' : 'center',
          width:'100%', border:'none', cursor:'pointer', borderRadius:8,
          background: active ? 'var(--blue-dim)' : hovered ? 'var(--surface-2)' : 'transparent',
          color: active ? 'var(--blue)' : hovered ? 'var(--text)' : 'var(--text-2)',
          transition:'all 0.15s ease', position:'relative',
        }}>
        {active && <div style={{ position:'absolute', left:0, top:'20%', bottom:'20%', width:2.5, background:'var(--blue)', borderRadius:'0 2px 2px 0' }}/>}
        <Icon name={item.icon} size={17} color={active ? 'var(--blue)' : hovered ? 'var(--text)' : 'var(--text-2)'}/>
        {expanded && <span style={{ fontSize:13, fontWeight: active ? 600 : 400 }}>{item.label}</span>}
      </button>
    );
  }

  function Divider() {
    return <div style={{ height:1, background:'var(--border)', margin:'6px 0' }}/>;
  }

  return (
    <div style={{ width: expanded ? 'var(--sidebar-w)' : 56, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--surface)', display:'flex', flexDirection:'column', overflow:'hidden', transition:'width 0.22s ease' }}>
      {/* Logo area */}
      <div style={{ padding: expanded ? '14px 14px 10px' : '14px 0 10px', display:'flex', alignItems:'center', gap:10, justifyContent: expanded ? 'flex-start' : 'center', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg, rgba(79,142,255,0.18), rgba(155,114,255,0.12))', border:'1px solid rgba(79,142,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <ForgeLogo size={20}/>
        </div>
        {expanded && (
          <div>
            <div style={{ fontSize:14, fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.1 }}>Forge</div>
            <div style={{ fontSize:10, color:'var(--text-3)', letterSpacing:'0.02em' }}>local AI center</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ flex:1, overflowY:'auto', padding: expanded ? '10px 10px' : '10px 8px', display:'flex', flexDirection:'column', gap:2 }}>
        {/* Search shortcut */}
        <button onClick={onPalette}
          style={{ display:'flex', alignItems:'center', gap:8, padding: expanded ? '7px 12px' : '8px 0', justifyContent: expanded ? 'flex-start' : 'center', width:'100%', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', color:'var(--text-3)', marginBottom:6, transition:'all 0.15s' }}>
          <Icon name="search" size={15} color="var(--text-3)"/>
          {expanded && <><span style={{ flex:1, fontSize:12, textAlign:'left' }}>Search…</span><kbd style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--font)', background:'var(--surface-3)', border:'1px solid var(--border-2)', borderRadius:3, padding:'1px 4px' }}>⌘K</kbd></>}
        </button>

        <Divider/>
        {main.map(item => <NavBtn key={item.id} item={item}/>)}
        <Divider/>
        {data.map(item => <NavBtn key={item.id} item={item}/>)}
      </div>

      {/* Bottom */}
      <div style={{ padding: expanded ? '8px 10px 12px' : '8px 8px 12px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:2 }}>
        {btm.map(item => <NavBtn key={item.id} item={item}/>)}
        {/* Collapse toggle */}
        <button onClick={onToggle}
          style={{ display:'flex', alignItems:'center', gap:8, padding: expanded ? '7px 12px' : '8px 0', justifyContent: expanded ? 'flex-start' : 'center', width:'100%', background:'transparent', border:'none', cursor:'pointer', color:'var(--text-3)', marginTop:2, borderRadius:8, transition:'all 0.15s' }}>
          <Icon name={expanded ? 'chevron-left' : 'chevron-right'} size={15}/>
          {expanded && <span style={{ fontSize:12 }}>Collapse</span>}
        </button>
        {/* User */}
        <div style={{ display:'flex', alignItems:'center', gap:9, padding: expanded ? '8px 10px' : '6px 0', justifyContent: expanded ? 'flex-start' : 'center', marginTop:2 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg, #4f8eff, #9b72ff)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, color:'#fff', fontWeight:700 }}>
            D
          </div>
          {expanded && (
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Dev User</div>
              <div style={{ fontSize:10, color:'var(--text-3)' }}>localhost</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ForgeApp() {
  const [onboarding, setOnboarding] = useState(true);
  const [screen, setScreen] = useState('workspace');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const expanded = tweaks.sidebarExpanded !== false;

  useEffect(() => {
    const handle = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(p => !p); }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  // Apply accent color to CSS variable
  useEffect(() => {
    const el = document.getElementById('forge-accent-override') || (() => {
      const s = document.createElement('style'); s.id = 'forge-accent-override';
      document.head.appendChild(s); return s;
    })();
    const c = tweaks.accentColor || '#4f8eff';
    // Parse hex to rgb for rgba usage
    const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
    el.textContent = `:root{--blue:${c};--blue-dim:rgba(${r},${g},${b},0.10);--blue-glow:rgba(${r},${g},${b},0.22);}`;
  }, [tweaks.accentColor]);

  const screens = {
    workspace:   <WorkspaceScreen/>,
    agents:      <AgentManagerScreen/>,
    workflow:    <WorkflowBuilderScreen/>,
    terminal:    <TerminalScreen/>,
    models:      <LocalModelsScreen/>,
    marketplace: <MarketplaceScreen/>,
    settings:    <SettingsScreen/>,
    multiagent:  <MultiAgentScreen/>,
  };

  if (onboarding) return <OnboardingScreen onComplete={() => setOnboarding(false)}/>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      <TitleBar onPalette={() => setPaletteOpen(true)}/>
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <Sidebar
          screen={screen} onScreen={setScreen}
          onPalette={() => setPaletteOpen(true)}
          expanded={expanded}
          onToggle={() => setTweak('sidebarExpanded', !expanded)}/>
        <main style={{ flex:1, overflow:'hidden', position:'relative', animation:'fadeIn 0.18s ease' }} key={screen}>
          {screens[screen] || <WorkspaceScreen/>}
        </main>
      </div>

      {paletteOpen && (
        <PaletteScreen
          onClose={() => setPaletteOpen(false)}
          onNavigate={s => { setScreen(s); setPaletteOpen(false); }}/>
      )}

      <TweaksPanel tweaks={tweaks} setTweak={setTweak}>
        <TweakSection label="Accent Color">
          <TweakColor id="accentColor" options={['#4f8eff','#9b72ff','#22d3a5','#f59e0b']}/>
        </TweakSection>
        <TweakSection label="Sidebar">
          <TweakToggle id="sidebarExpanded" label="Show labels"/>
        </TweakSection>
        <TweakSection label="Screen">
          <TweakSelect id="_screen" label="Navigate to"
            options={[
              {value:'workspace',label:'Chats'},
              {value:'agents',label:'Agents'},
              {value:'workflow',label:'Workflow Builder'},
              {value:'terminal',label:'Terminal'},
              {value:'multiagent',label:'Multi-Agent'},
              {value:'models',label:'Local Models'},
              {value:'marketplace',label:'Marketplace'},
              {value:'settings',label:'Settings'},
            ]}
            onChange={v => setScreen(v)}/>
        </TweakSection>
        <TweakSection label="Motion">
          <TweakToggle id="reduceMotion" label="Reduce motion"/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ForgeApp/>);
