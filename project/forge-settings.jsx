// forge-settings.jsx
const { useState } = React;

const SETTING_SECTIONS = [
  { id:'general',    icon:'home',       label:'General' },
  { id:'appearance', icon:'type',       label:'Appearance' },
  { id:'agents',     icon:'agent',      label:'Agents' },
  { id:'models',     icon:'cpu',        label:'Local Models' },
  { id:'terminal',   icon:'terminal',   label:'Terminal' },
  { id:'memory',     icon:'database',   label:'Memory' },
  { id:'security',   icon:'shield',     label:'Security' },
  { id:'privacy',    icon:'eye',        label:'Privacy' },
  { id:'integrations',icon:'puzzle',    label:'Integrations' },
  { id:'experimental',icon:'sparkles',  label:'Experimental' },
];

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width:40, height:22, borderRadius:11, background: value ? 'var(--blue)' : 'var(--surface-3)', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left: value ? 19 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
    </button>
  );
}

function Select({ value, options, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text)', padding:'5px 10px', borderRadius:6, fontSize:13, outline:'none', cursor:'pointer', fontFamily:'var(--font)' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function SettingRow({ label, desc, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
      <div style={{ flex:1, paddingRight:24 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>{label}</div>
        {desc && <div style={{ fontSize:12, color:'var(--text-2)', marginTop:3, lineHeight:1.5 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{title}</div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'0 20px' }}>
        {children}
      </div>
    </div>
  );
}

const CONTENT = {
  general: function GeneralSettings({ prefs, setPrefs }) {
    return (
      <div>
        <SettingsSection title="Workspace">
          <SettingRow label="Launch at startup" desc="Start Loom when you log in">
            <Toggle value={prefs.startup} onChange={v => setPrefs(p => ({...p, startup:v}))}/>
          </SettingRow>
          <SettingRow label="Default agent" desc="Agent used when starting new chats">
            <Select value={prefs.defaultAgent} onChange={v => setPrefs(p => ({...p, defaultAgent:v}))}
              options={[{value:'claude',label:'Claude Code'},{value:'gemini',label:'Gemini CLI'},{value:'codex',label:'Codex CLI'},{value:'aider',label:'Aider'}]}/>
          </SettingRow>
          <SettingRow label="Auto-detect agents" desc="Scan PATH for new CLI tools on launch">
            <Toggle value={prefs.autoDetect} onChange={v => setPrefs(p => ({...p, autoDetect:v}))}/>
          </SettingRow>
          <SettingRow label="Confirm before execution" desc="Ask before running shell commands">
            <Toggle value={prefs.confirmExec} onChange={v => setPrefs(p => ({...p, confirmExec:v}))}/>
          </SettingRow>
        </SettingsSection>
        <SettingsSection title="Storage">
          <SettingRow label="Chat history retention" desc="How long to keep conversation logs">
            <Select value={prefs.retention} onChange={v => setPrefs(p => ({...p, retention:v}))}
              options={[{value:'7',label:'7 days'},{value:'30',label:'30 days'},{value:'90',label:'90 days'},{value:'forever',label:'Forever'},{value:'session',label:'Session only'}]}/>
          </SettingRow>
          <SettingRow label="Max context per session" desc="Tokens to retain in working memory">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <input type="range" min={4} max={200} value={prefs.maxCtx} onChange={e => setPrefs(p => ({...p, maxCtx: Number(e.target.value)}))}
                style={{ width:100, accentColor:'var(--blue)' }}/>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--text-2)', minWidth:44 }}>{prefs.maxCtx}k</span>
            </div>
          </SettingRow>
        </SettingsSection>
      </div>
    );
  },
  appearance: function AppearanceSettings({ prefs, setPrefs }) {
    const themes = [
      { id:'dark', label:'Dark', bg:'#0c0c10' },
      { id:'darker', label:'Darker', bg:'#080809' },
      { id:'midnight', label:'Midnight', bg:'#0a0a14' },
    ];
    const accents = ['#00b8d4','#d9357a','#00cc88','#e6c128','#d93346'];
    return (
      <div>
        <SettingsSection title="Theme">
          <div style={{ padding:'16px 0', borderBottom:'1px solid var(--border)', display:'flex', gap:12 }}>
            {themes.map(t => (
              <div key={t.id} onClick={() => setPrefs(p => ({...p, theme:t.id}))}
                style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center', cursor:'pointer' }}>
                <div style={{ width:80, height:52, borderRadius:9, background:t.bg, border:`2px solid ${prefs.theme===t.id ? 'var(--blue)' : 'var(--border)'}`, transition:'border-color 0.15s', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:16, background:'rgba(255,255,255,0.04)' }}/>
                  <div style={{ position:'absolute', left:18, top:8, right:6, height:6, background:'rgba(255,255,255,0.08)', borderRadius:3 }}/>
                  <div style={{ position:'absolute', left:18, top:20, right:14, height:5, background:'rgba(255,255,255,0.05)', borderRadius:3 }}/>
                </div>
                <span style={{ fontSize:12, color: prefs.theme===t.id ? 'var(--blue)' : 'var(--text-2)' }}>{t.label}</span>
              </div>
            ))}
          </div>
          <SettingRow label="Accent color" desc="Color used for active states and highlights">
            <div style={{ display:'flex', gap:6 }}>
              {accents.map(c => (
                <button key={c} onClick={() => setPrefs(p => ({...p, accent:c}))}
                  style={{ width:24, height:24, borderRadius:'50%', background:c, border:`2px solid ${prefs.accent===c ? '#fff' : 'transparent'}`, cursor:'pointer', transition:'border-color 0.15s' }}/>
              ))}
            </div>
          </SettingRow>
        </SettingsSection>
        <SettingsSection title="Typography">
          <SettingRow label="Font size" desc="Base UI font size">
            <Select value={prefs.fontSize} onChange={v => setPrefs(p => ({...p, fontSize:v}))}
              options={[{value:'12',label:'Small (12px)'},{value:'13',label:'Default (13px)'},{value:'14',label:'Large (14px)'},{value:'15',label:'X-Large (15px)'}]}/>
          </SettingRow>
          <SettingRow label="Terminal font" desc="Monospace font for code and terminal">
            <Select value={prefs.monoFont} onChange={v => setPrefs(p => ({...p, monoFont:v}))}
              options={[{value:'jetbrains',label:'JetBrains Mono'},{value:'fira',label:'Fira Code'},{value:'ibm',label:'IBM Plex Mono'},{value:'cascadia',label:'Cascadia Code'}]}/>
          </SettingRow>
          <SettingRow label="Reduce motion" desc="Disable animations and transitions">
            <Toggle value={prefs.reduceMotion} onChange={v => setPrefs(p => ({...p, reduceMotion:v}))}/>
          </SettingRow>
        </SettingsSection>
      </div>
    );
  },
  security: function SecuritySettings({ prefs, setPrefs }) {
    return (
      <div>
        <SettingsSection title="Execution Safety">
          <SettingRow label="Sandbox shell commands" desc="Run agent-executed commands in an isolated sandbox">
            <Toggle value={prefs.sandbox} onChange={v => setPrefs(p => ({...p, sandbox:v}))}/>
          </SettingRow>
          <SettingRow label="Network isolation" desc="Block outbound connections by default">
            <Toggle value={prefs.netIsolate} onChange={v => setPrefs(p => ({...p, netIsolate:v}))}/>
          </SettingRow>
          <SettingRow label="Require confirmation for file writes" desc="Prompt before agents write or delete files">
            <Toggle value={prefs.confirmWrite} onChange={v => setPrefs(p => ({...p, confirmWrite:v}))}/>
          </SettingRow>
          <SettingRow label="Audit log" desc="Keep a detailed log of all agent actions">
            <Toggle value={prefs.auditLog} onChange={v => setPrefs(p => ({...p, auditLog:v}))}/>
          </SettingRow>
        </SettingsSection>
        <SettingsSection title="Keys & Credentials">
          <SettingRow label="API key storage" desc="Where agent API keys are stored">
            <Select value="keychain" onChange={() => {}}
              options={[{value:'keychain',label:'System Keychain'},{value:'env',label:'Environment variables'},{value:'file',label:'Encrypted file'}]}/>
          </SettingRow>
          <SettingRow label="Session lock" desc="Lock Loom after period of inactivity">
            <Select value="never" onChange={() => {}}
              options={[{value:'never',label:'Never'},{value:'5',label:'5 minutes'},{value:'15',label:'15 minutes'},{value:'30',label:'30 minutes'}]}/>
          </SettingRow>
        </SettingsSection>
      </div>
    );
  },
};

// Fallback for unimplemented sections
function PlaceholderSection({ section }) {
  return (
    <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>
      <Icon name={section.icon} size={32} color="var(--text-3)" style={{ marginBottom:12 }}/>
      <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>{section.label} Settings</div>
      <div style={{ fontSize:13, color:'var(--text-3)' }}>Configure {section.label.toLowerCase()} preferences here.</div>
    </div>
  );
}

function SettingsScreen() {
  const [active, setActive] = useState('general');
  const [search, setSearch] = useState('');
  const [prefs, setPrefs] = useState({
    startup:true, defaultAgent:'claude', autoDetect:true, confirmExec:false,
    retention:'30', maxCtx:64,
    theme:'dark', accent:'#00b8d4', fontSize:'13', monoFont:'jetbrains', reduceMotion:false,
    sandbox:true, netIsolate:true, confirmWrite:true, auditLog:true,
  });

  const activeSection = SETTING_SECTIONS.find(s => s.id === active);
  const ContentComponent = CONTENT[active] || null;

  const filteredSections = SETTING_SECTIONS.filter(s =>
    !search || s.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height:'100%', display:'flex', overflow:'hidden' }}>
      {/* Left nav */}
      <div style={{ width:220, borderRight:'1px solid var(--border)', background:'var(--surface)', overflowY:'auto', flexShrink:0 }}>
        <div style={{ padding:16 }}>
          <div style={{ position:'relative', marginBottom:16 }}>
            <div style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)' }}>
              <Icon name="search" size={13} color="var(--text-3)"/>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search settings…"
              style={{ width:'100%', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:7, padding:'7px 10px 7px 30px', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)' }}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {filteredSections.map(s => (
              <button key={s.id} onClick={() => setActive(s.id)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background: active===s.id ? 'var(--blue-dim)' : 'transparent', border:`1px solid ${active===s.id ? 'rgba(0,184,212,0.3)' : 'transparent'}`, borderRadius:7, cursor:'pointer', textAlign:'left', color: active===s.id ? 'var(--blue)' : 'var(--text-2)', transition:'all 0.15s' }}>
                <Icon name={s.icon} size={14} color={active===s.id ? 'var(--blue)' : 'var(--text-3)'}/>
                <span style={{ fontSize:13, fontWeight: active===s.id ? 600 : 400 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto' }}>
        <div style={{ maxWidth:680, margin:'0 auto', padding:32 }}>
          <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', marginBottom:24 }}>
            {activeSection?.label}
          </h2>
          {ContentComponent
            ? <ContentComponent prefs={prefs} setPrefs={setPrefs}/>
            : <PlaceholderSection section={activeSection || SETTING_SECTIONS[0]}/>
          }
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
