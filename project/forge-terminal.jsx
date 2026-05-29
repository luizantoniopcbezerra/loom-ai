// forge-terminal.jsx — Split terminal view
const { useState, useEffect, useRef } = React;

const SESSIONS = [
{
  id: 's1', name: 'claude · auth-refactor', agent: 'claude',
  color: '#d9357a', active: true,
  history: [
  { type: 'cmd', text: 'claude --model claude-opus-4-5 --context auth.py' },
  { type: 'info', text: 'Claude Code v1.8.2 · context: 14,820 tokens · offline' },
  { type: 'gap' },
  { type: 'cmd', text: 'Analyze the auth.py file and suggest a refactoring plan' },
  { type: 'out', text: 'Analyzing auth.py (812 lines)...' },
  { type: 'out', text: 'Found 3 critical separation of concerns issues:' },
  { type: 'out-hi', text: '  [1] JWT operations mixed with DB queries (lines 45-220)' },
  { type: 'out-hi', text: '  [2] Session management embedded in request handlers (lines 221-450)' },
  { type: 'out-hi', text: '  [3] Rate limiting logic duplicated across 6 endpoints (lines 451-812)' },
  { type: 'out', text: '' },
  { type: 'success', text: 'Recommendation: Split into 5 modules. See refactoring plan above.' }]

},
{
  id: 's2', name: 'codex · test-gen', agent: 'codex',
  color: '#00cc88', active: false,
  history: [
  { type: 'cmd', text: 'codex --task "generate pytest suite for auth/jwt.py"' },
  { type: 'info', text: 'Codex CLI v0.2.1 · sandbox mode · offline' },
  { type: 'gap' },
  { type: 'out', text: 'Reading auth/jwt.py...' },
  { type: 'out', text: 'Generating test cases...' },
  { type: 'success', text: 'Generated 14 tests → tests/test_jwt.py' },
  { type: 'gap' },
  { type: 'cmd', text: 'python -m pytest tests/test_jwt.py -v' },
  { type: 'out', text: 'collected 14 items' },
  { type: 'out', text: '' },
  { type: 'success', text: 'tests/test_jwt.py::test_create_access_token PASSED' },
  { type: 'success', text: 'tests/test_jwt.py::test_decode_valid_token PASSED' },
  { type: 'success', text: 'tests/test_jwt.py::test_expired_token_raises PASSED' },
  { type: 'out', text: '...' },
  { type: 'success', text: '14 passed in 0.82s' }]

},
{
  id: 's3', name: 'shell · project', agent: 'shell',
  color: '#e6c128', active: false,
  history: [
  { type: 'cmd', text: 'tree -L 2 auth/' },
  { type: 'out', text: 'auth/' },
  { type: 'out', text: '├── __init__.py' },
  { type: 'out', text: '├── jwt.py' },
  { type: 'out', text: '├── session.py' },
  { type: 'out', text: '├── repository.py' },
  { type: 'out', text: '├── middleware.py' },
  { type: 'out', text: '├── rate_limit.py' },
  { type: 'out', text: '└── models.py' },
  { type: 'gap' },
  { type: 'cmd', text: 'wc -l auth/*.py' },
  { type: 'out', text: '   45 auth/__init__.py' },
  { type: 'out', text: '  124 auth/jwt.py' },
  { type: 'out', text: '  198 auth/session.py' },
  { type: 'out', text: '  312 auth/repository.py' },
  { type: 'out', text: '  156 auth/middleware.py' },
  { type: 'out', text: '   89 auth/rate_limit.py' },
  { type: 'out', text: '  812 total' }]

}];


const lineColors = {
  cmd: 'var(--blue)',
  info: 'var(--text-3)',
  out: 'var(--text-2)',
  'out-hi': 'var(--amber)',
  success: 'var(--green)',
  error: 'var(--red)'
};

function TerminalPane({ session, input, onInput, onSubmit }) {
  const endRef = useRef(null);
  const [lines, setLines] = useState(session.history);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {endRef.current?.scrollIntoView({ behavior: 'smooth' });}, [lines]);

  const submit = (cmd) => {
    if (!cmd.trim()) return;
    const newLines = [
    ...lines,
    { type: 'cmd', text: cmd },
    { type: 'info', text: 'Processing...' }];

    setLines(newLines);
    setStreaming(true);
    onSubmit('');
    setTimeout(() => {
      setLines((prev) => [...prev.slice(0, -1),
      { type: 'success', text: `Command executed. Output saved to loom-output.txt` }]
      );
      setStreaming(false);
    }, 1400);
  };

  const handleKey = (e) => {if (e.key === 'Enter') submit(input);};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', borderRadius: 0 }}>
      {/* Pane header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: session.color }} />
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-2)', fontWeight: 500 }}>{session.name}</span>
        <div style={{ flex: 1 }} />
        <Icon name="maximize" size={13} color="var(--text-3)" style={{ cursor: 'pointer' }} />
        <Icon name="x" size={13} color="var(--text-3)" style={{ cursor: 'pointer', marginLeft: 4 }} />
      </div>

      {/* Output */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.65 }}>
        {lines.map((line, i) =>
        line.type === 'gap' ?
        <div key={i} style={{ height: 8 }} /> :
        <div key={i} style={{ display: 'flex', gap: 8, animation: 'fadeIn 0.15s ease' }}>
                {line.type === 'cmd' && <span style={{ color: 'var(--text-3)', userSelect: 'none' }}>❯</span>}
                {line.type === 'info' && <span style={{ color: 'var(--text-3)', userSelect: 'none' }}>·</span>}
                {(line.type === 'out' || line.type === 'out-hi') && <span style={{ color: 'var(--text-3)', userSelect: 'none', minWidth: 8 }}> </span>}
                {line.type === 'success' && <span style={{ color: 'var(--green)', userSelect: 'none' }}>✓</span>}
                {line.type === 'error' && <span style={{ color: 'var(--red)', userSelect: 'none' }}>✗</span>}
                <span style={{ color: lineColors[line.type] || 'var(--text-2)' }}>{line.text}</span>
              </div>
        )}
        {streaming &&
        <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ color: 'var(--blue)' }}>·</span>
            <span style={{ color: 'var(--blue)' }}>
              <span style={{ animation: 'streamDot1 1.2s ease-in-out infinite' }}>▪</span>
              <span style={{ animation: 'streamDot2 1.2s 0.2s ease-in-out infinite' }}>▪</span>
              <span style={{ animation: 'streamDot3 1.2s 0.4s ease-in-out infinite' }}>▪</span>
            </span>
          </div>
        }
        <div ref={endRef} />
      </div>

      {/* Input line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: session.color }}>❯</span>
        <input value={input} onChange={(e) => onInput(e.target.value)} onKeyDown={handleKey}
        placeholder="Enter command…"
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12.5 }} />
        {/* Blinking cursor */}
        {!input && <span style={{ display: 'inline-block', width: 7, height: 13, background: 'var(--text-3)', animation: 'blink 1.2s step-end infinite', borderRadius: 1 }} />}
      </div>
    </div>);

}

function TerminalScreen() {
  const [activeSessions, setActiveSessions] = useState(['s1', 's2']);
  const [inputs, setInputs] = useState({ s1: '', s2: '', s3: '' });
  const [activeTab, setActiveTab] = useState('s1');

  const setInput = (id, val) => setInputs((p) => ({ ...p, [id]: val }));
  const setSubmit = (id, val) => setInputs((p) => ({ ...p, [id]: val }));

  const visibleSessions = SESSIONS.filter((s) => activeSessions.includes(s.id));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Tab bar */}
      <div style={{ height: 38, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'stretch', background: 'var(--bg)', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, overflowX: 'auto' }}>
          {SESSIONS.map((s) => {
            const active = activeSessions.includes(s.id);
            return (
              <button key={s.id} onClick={() => {if (!active) setActiveSessions((p) => [...p, s.id]);setActiveTab(s.id);}}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', background: activeTab === s.id ? 'var(--surface)' : 'transparent', border: 'none', borderRight: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: activeTab === s.id ? '2px solid ' + s.color : '2px solid transparent', transition: 'all 0.15s' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? s.color : 'var(--text-3)' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: activeTab === s.id ? 'var(--text)' : 'var(--text-2)' }}>{s.name}</span>
                {active &&
                <span onClick={(e) => {e.stopPropagation();setActiveSessions((p) => p.filter((id) => id !== s.id));}}
                style={{ marginLeft: 2, color: 'var(--text-3)', cursor: 'pointer', display: 'flex' }}>
                    <Icon name="x" size={11} />
                  </span>
                }
              </button>);
          })}
          <button title="New session" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>

      {/* Terminal panes — always split, focused tab first */}
      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden' }}>
        {visibleSessions.length <= 1 ? (
          (() => { const s = SESSIONS.find((x) => x.id === activeTab) || SESSIONS[0]; return (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <TerminalPane session={s} input={inputs[s.id]} onInput={(v) => setInput(s.id, v)} onSubmit={(v) => setSubmit(s.id, v)} />
            </div>);
          })()
        ) : (
          visibleSessions.slice(0, 2).map((s, i) =>
            <React.Fragment key={s.id}>
              {i > 0 && <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <TerminalPane session={s} input={inputs[s.id]} onInput={(v) => setInput(s.id, v)} onSubmit={(v) => setSubmit(s.id, v)} />
              </div>
            </React.Fragment>
          )
        )}
      </div>
    </div>);

}

Object.assign(window, { TerminalScreen });