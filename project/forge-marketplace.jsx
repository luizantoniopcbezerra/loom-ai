// forge-marketplace.jsx
const { useState } = React;

const INTEGRATIONS = [
  { name:'Sequential Thinking', author:'Anthropic', cat:'MCP', icon:'sparkles', color:'#d9357a', downloads:'48.2k', stars:'4.9', verified:true, local:true, desc:'Structured chain-of-thought reasoning server for complex problem decomposition.' },
  { name:'Filesystem MCP', author:'ModelContextProtocol', cat:'MCP', icon:'folder', color:'#00b8d4', downloads:'102k', stars:'4.8', verified:true, local:true, desc:'Read, write, and navigate the local filesystem with full path safety controls.' },
  { name:'Git MCP Server', author:'Community', cat:'MCP', icon:'git-branch', color:'#00cc88', downloads:'61.3k', stars:'4.7', verified:true, local:true, desc:'Git operations, diff viewing, commit history, and branch management.' },
  { name:'Browser Tools MCP', author:'AgentDesk', cat:'MCP', icon:'monitor', color:'#e6c128', downloads:'39.8k', stars:'4.6', verified:false, local:true, desc:'Headless browser automation with screenshot capture and DOM inspection.' },
  { name:'Docker Agent', author:'Community', cat:'Workflow', icon:'box', color:'#00b8d4', downloads:'28.1k', stars:'4.5', verified:false, local:true, desc:'Manage Docker containers, images, and compose stacks from within Forge.' },
  { name:'Code Review Flow', author:'LoomHub', cat:'Workflow', icon:'git-branch', color:'#00cc88', downloads:'17.4k', stars:'4.8', verified:true, local:true, desc:'Pre-built multi-agent workflow: analyze → test → lint → suggest → approve.' },
  { name:'RAG Memory', author:'LangGraph', cat:'Tool', icon:'database', color:'#d9357a', downloads:'53.6k', stars:'4.9', verified:true, local:true, desc:'Vector-search memory layer backed by a local embedding model and SQLite.' },
  { name:'Python REPL', author:'Anthropic', cat:'Tool', icon:'code', color:'#00cc88', downloads:'88.9k', stars:'4.9', verified:true, local:true, desc:'Sandboxed Python execution environment for agents to run and test code.' },
  { name:'Slack Notifier', author:'Community', cat:'Integration', icon:'send', color:'#00b8d4', downloads:'12.3k', stars:'4.2', verified:false, local:false, desc:'Post workflow results and agent outputs to Slack channels via webhook.' },
  { name:'Playwright Agent', author:'LoomHub', cat:'Tool', icon:'monitor', color:'#e6c128', downloads:'24.7k', stars:'4.6', verified:true, local:true, desc:'Browser automation and end-to-end test generation with Playwright.' },
  { name:'DeepSeek R1', author:'DeepSeek', cat:'Model', icon:'cpu', color:'#d93346', downloads:'41.1k', stars:'4.7', verified:true, local:true, desc:'32B local reasoning model. Best-in-class math and code. Runs on 24GB VRAM.' },
  { name:'Qwen2.5 Coder', author:'Alibaba', cat:'Model', icon:'cpu', color:'#e6c128', downloads:'36.8k', stars:'4.6', verified:true, local:true, desc:'32B coding-specialized model with strong multilingual code generation.' },
];

const CATS = ['All','MCP','Workflow','Tool','Model','Integration'];

function IntegrationCard({ item }) {
  const [installed, setInstalled] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'var(--surface-2)' : 'var(--surface)', border:`1px solid ${hovered ? 'var(--border-2)' : 'var(--border)'}`, borderRadius:12, padding:18, display:'flex', flexDirection:'column', gap:14, transition:'all 0.18s', cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ display:'flex', gap:11, alignItems:'center' }}>
          <div style={{ width:40, height:40, borderRadius:10, background:`${item.color}18`, border:`1px solid ${item.color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name={item.icon} size={18} color={item.color}/>
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontWeight:700, fontSize:14 }}>{item.name}</span>
              {item.verified && (
                <div style={{ width:14, height:14, borderRadius:'50%', background:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="check" size={9} color="#fff" strokeWidth={3}/>
                </div>
              )}
            </div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{item.author}</div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
          <Badge variant={
            item.cat==='MCP' ? 'blue' :
            item.cat==='Workflow' ? 'green' :
            item.cat==='Model' ? 'purple' :
            item.cat==='Tool' ? 'amber' : 'default'
          }>{item.cat}</Badge>
          {item.local && <Badge variant="green" style={{ fontSize:9 }}>local</Badge>}
        </div>
      </div>

      <p style={{ fontSize:12.5, color:'var(--text-2)', lineHeight:1.55, margin:0, flex:1 }}>{item.desc}</p>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:12, alignItems:'center', fontSize:11, color:'var(--text-3)' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <Icon name="download" size={11}/>
            {item.downloads}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <Icon name="star" size={11} color="var(--amber)"/>
            {item.stars}
          </span>
        </div>
        <button onClick={() => setInstalled(p => !p)}
          style={{ padding:'5px 14px', background: installed ? 'var(--green-dim)' : 'var(--blue)', border: installed ? '1px solid rgba(0,204,136,0.3)' : 'none', borderRadius:6, fontSize:12, color: installed ? 'var(--green)' : '#fff', cursor:'pointer', fontWeight:500, transition:'all 0.2s', display:'flex', alignItems:'center', gap:5 }}>
          {installed ? <><Icon name="check" size={12} color="var(--green)"/>Installed</> : <>Install</>}
        </button>
      </div>
    </div>
  );
}

function MarketplaceScreen() {
  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = INTEGRATIONS.filter(i =>
    (cat === 'All' || i.cat === cat) &&
    (!search || i.name.toLowerCase().includes(search.toLowerCase()) || i.desc.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ height:'100%', overflowY:'auto' }}>
      <div style={{ maxWidth:1100, margin:'0 auto', padding:28 }}>
        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.02em', marginBottom:4 }}>Marketplace</h1>
          <p style={{ color:'var(--text-2)', fontSize:14 }}>MCP servers, workflows, tools, and local models — all run on-device.</p>
        </div>

        {/* Search + filters */}
        <div style={{ display:'flex', gap:12, marginBottom:24, alignItems:'center' }}>
          <div style={{ position:'relative', flex:1, maxWidth:380 }}>
            <div style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}>
              <Icon name="search" size={15} color="var(--text-3)"/>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search integrations…"
              style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:9, padding:'9px 12px 9px 34px', color:'var(--text)', fontSize:14, outline:'none', fontFamily:'var(--font)' }}/>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)}
                style={{ padding:'7px 14px', background: cat===c ? 'var(--blue-dim)' : 'transparent', border:`1px solid ${cat===c ? 'var(--blue)' : 'var(--border)'}`, borderRadius:20, fontSize:12, color: cat===c ? 'var(--blue)' : 'var(--text-2)', cursor:'pointer', fontWeight: cat===c ? 600 : 400 }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ flex:1 }}/>
          <span style={{ fontSize:12, color:'var(--text-3)' }}>{filtered.length} results</span>
        </div>

        {/* Featured banner */}
        {cat === 'All' && !search && (
          <div style={{ marginBottom:24, padding:20, borderRadius:6, background:'#c5ff3a', display:'flex', gap:20, alignItems:'center' }}>
            <div style={{ width:52, height:52, borderRadius:4, background:'#000', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="sparkles" size={24} color="#c5ff3a"/>
            </div>
            <div style={{ flex:1, color:'#000' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:16, fontWeight:800, letterSpacing:'-0.01em' }}>Sequential Thinking MCP</span>
                <span style={{ padding:'2px 7px', borderRadius:3, fontSize:10, fontWeight:700, fontFamily:'var(--mono)', background:'#000', color:'#c5ff3a', letterSpacing:'0.04em' }}>FEATURED</span>
              </div>
              <p style={{ fontSize:13, lineHeight:1.5, color:'rgba(0,0,0,0.7)' }}>
                The most powerful reasoning pattern for complex tasks. Gives agents structured thinking chains with branching and reflection.
              </p>
            </div>
            <button style={{ padding:'9px 20px', background:'#000', border:'none', borderRadius:4, fontSize:13, color:'#c5ff3a', cursor:'pointer', fontWeight:700, flexShrink:0, fontFamily:'var(--mono)', letterSpacing:'0.02em' }}>
              INSTALL FREE
            </button>
          </div>
        )}

        {/* Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))', gap:14 }}>
          {filtered.map(item => <IntegrationCard key={item.name} item={item}/>)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MarketplaceScreen });
