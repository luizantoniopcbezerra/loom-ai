// forge-workspace.jsx — Main chat workspace
const { useState, useRef, useEffect } = React;

const INIT_MESSAGES = [
{
  role: 'user', id: 1,
  content: 'Help me refactor my Python authentication module. It currently mixes JWT handling, session management, and DB calls all in one 800-line file.'
},
{
  role: 'assistant', id: 2, agent: 'Claude Code',
  content: `I can see the problem — that's a classic SRP violation. Here's how I'd decompose it:

**Proposed module structure:**

\`\`\`python
auth/
  __init__.py
  jwt.py          # Token encode/decode/validate
  session.py      # Session lifecycle management
  repository.py   # DB queries (users, tokens)
  middleware.py   # FastAPI/Flask request middleware
  models.py       # Pydantic schemas
\`\`\`

**jwt.py — clean, stateless:**

\`\`\`python
from datetime import datetime, timedelta
from typing import Optional
import jwt as pyjwt

SECRET_KEY = settings.JWT_SECRET
ALGORITHM  = "HS256"

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))
    payload = {"sub": subject, "exp": expire, "iat": datetime.utcnow()}
    return pyjwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return pyjwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
\`\`\`

This keeps JWT logic self-contained and easily unit-testable. Want me to continue with \`session.py\` and the repository layer?`,
  tools: ['read_file: auth.py', 'analyze_code']
},
{
  role: 'user', id: 3,
  content: 'Yes, and can you add rate limiting to the login endpoint? We\'re getting brute-forced.'
},
{
  role: 'assistant', id: 4, agent: 'Claude Code', streaming: true,
  content: `**Rate limiting strategy for login:**

I'll use a sliding window counter backed by an in-memory store (or Redis if you need distributed):

\`\`\`python
# auth/rate_limit.py
from collections import defaultdict
from time import time
from functools import wraps
from fastapi import HTTPException, Request

class SlidingWindowLimiter:
    def __init__(self, max_requests: int = 5, window_seconds: int = 300):
        self.max_requests = max_requests
        self.window = window_seconds
        self._store: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time()
        window_start = now - self.window
        hits = self._store[key]
        # Evict stale entries
        self._store[key] = [t for t in hits if t > window_start]
        if len(self._store[key]) >= self.max_requests:
            return False
        self._store[key].append(now)
        return True

login_limiter = SlidingWindowLimiter(max_requests=5, window_seconds=300)
\`\`\``,
  tools: ['write_file: auth/rate_limit.py']
}];


function CodeBlock({ code, lang }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 8, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>{lang || 'code'}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)', cursor: 'pointer' }}>copy</span>
      </div>
      <pre style={{ padding: '14px 16px', fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.65, overflowX: 'auto', whiteSpace: 'pre', color: 'var(--text)' }}>
        <code dangerouslySetInnerHTML={{ __html: colorize(code) }} />
      </pre>
    </div>);

}

function colorize(code) {
  return code.
  replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').
  replace(/(#[^\n]*)/g, '<span style="color:var(--text-3)">$1</span>').
  replace(/\b(def|class|import|from|return|if|else|elif|for|in|not|and|or|True|False|None|self|async|await|with)\b/g, '<span style="color:var(--purple)">$1</span>').
  replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span style="color:var(--green)">$1</span>').
  replace(/\b(\d+)\b/g, '<span style="color:var(--amber)">$1</span>');
}

function renderContent(text) {
  const parts = [];
  const codeRx = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0,m;
  while ((m = codeRx.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) });
    parts.push({ type: 'code', lang: m[1], content: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts.map((p, i) => p.type === 'code' ?
  <CodeBlock key={i} code={p.content.trim()} lang={p.lang} /> :
  <MdText key={i} text={p.content} />
  );
}

function MdText({ text }) {
  const html = text.
  replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').
  replace(/`([^`]+)`/g, `<code style="background:var(--surface-2);border:1px solid var(--border);padding:1px 5px;border-radius:4px;font-family:var(--mono);font-size:0.9em">$1</code>`).
  replace(/\n/g, '<br/>');
  return <p style={{ lineHeight: 1.7, fontSize: 14, color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: html }} />;
}

function ToolUsage({ tools }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
      {tools.map((t) =>
      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>
          <Icon name="zap" size={10} color="var(--amber)" />
          {t}
        </div>
      )}
    </div>);

}

function StreamDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, marginLeft: 4, verticalAlign: 'middle' }}>
      {[1, 2, 3].map((i) =>
      <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block',
        animation: `streamDot${i} 1.2s ${(i - 1) * 0.2}s ease-in-out infinite` }} />
      )}
    </span>);

}

function WorkspaceScreen() {
  const [messages, setMessages] = useState(INIT_MESSAGES);
  const [input, setInput] = useState('');
  const [agent, setAgent] = useState(window.__forgeNextAgent || 'Claude Code');
  const [rightPanel, setRightPanel] = useState(false);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {bottomRef.current?.scrollIntoView({ behavior: 'smooth' });}, [messages]);
  // Pick up agent selected from Agent Manager
  useEffect(() => {
    if (window.__forgeNextAgent) {
      setAgent(window.__forgeNextAgent);
      delete window.__forgeNextAgent;
    }
  }, []);

  const send = () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', id: Date.now(), content: input };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setTimeout(() => {
      setMessages((p) => [...p, { role: 'assistant', id: Date.now() + 1, agent, streaming: true,
        content: 'Analyzing your request', tools: ['analyze_code'] }]);
    }, 600);
  };

  const handleKey = (e) => {if (e.key === 'Enter' && !e.shiftKey) {e.preventDefault();send();}};

  const agents = ['Claude Code', 'Gemini CLI', 'Codex CLI', 'Aider'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', position: 'relative' }}>
      {/* Minimal top bar */}
      <div style={{ height: 44, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', flexShrink: 0, background: 'var(--bg)' }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setAgentMenuOpen((o) => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', color: 'var(--text)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{agent}</span>
            <Icon name="chevron-down" size={12} color="var(--text-3)" />
          </button>
          {agentMenuOpen &&
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 4, padding: 4, minWidth: 160, zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              {agents.map((a) =>
            <button key={a} onClick={() => {setAgent(a);setAgentMenuOpen(false);}}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', background: a === agent ? 'var(--blue-dim)' : 'transparent', border: 'none', cursor: 'pointer', color: a === agent ? 'var(--blue)' : 'var(--text)', fontSize: 13, borderRadius: 3, fontFamily: 'var(--font)' }}>
                  {a}
                </button>
            )}
            </div>
          }
        </div>
        <div style={{ flex: 1 }} />
        <span title="18,423 / 200,000 tokens" style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--mono)', cursor: 'help' }}>18.4k</span>
        <span title="Offline — running locally" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', cursor: 'help' }} />
        <button onClick={() => setRightPanel((p) => !p)}
        title="Context details"
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: rightPanel ? 'var(--blue-dim)' : 'transparent', border: `1px solid ${rightPanel ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 3, cursor: 'pointer', color: rightPanel ? 'var(--blue)' : 'var(--text-2)', fontSize: 12 }}>
          <Icon name="layers" size={12} />
          Context
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {messages.map((msg) =>
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, animation: 'fadeUp 0.25s ease' }}>
                  {msg.role === 'user' ?
                <div style={{ alignSelf: 'flex-end', maxWidth: '78%' }}>
                      <div style={{ background: 'var(--blue)', color: '#000', padding: '10px 16px', borderRadius: '14px 14px 4px 14px', fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
                        {msg.content}
                      </div>
                    </div> :

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 4, background: 'var(--purple-dim)', border: '1px solid rgba(217,53,122,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <Icon name="sparkles" size={14} color="var(--purple)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple)' }}>{msg.agent}</span>
                          {msg.streaming && <><StreamDots /><span style={{ fontSize: 11, color: 'var(--text-3)' }}>generating</span></>}
                        </div>
                        {renderContent(msg.content)}
                        {msg.tools && msg.streaming &&
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '3px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                            <Icon name="zap" size={10} color="var(--amber)" />
                            using {msg.tools.length} tool{msg.tools.length > 1 ? 's' : ''}
                          </div>
                    }
                      </div>
                    </div>
                }
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 6, padding: '10px 14px', transition: 'border-color 0.2s' }}>
                <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder={`Message ${agent}…`}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--text)', fontSize: 14, lineHeight: 1.6, minHeight: 22, maxHeight: 140, fontFamily: 'var(--font)', overflowY: 'auto' }}
                rows={1} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex' }}>
                    <Icon name="file-text" size={16} />
                  </button>
                  <button onClick={send} style={{ width: 32, height: 32, borderRadius: 4, background: input ? 'var(--blue)' : 'var(--surface-3)', border: 'none', cursor: input ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                    <Icon name="send" size={14} color={input ? '#000' : 'var(--text-3)'} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6, fontFamily: 'var(--mono)', letterSpacing: '0.04em' }}>
                ⏎ send · ⇧⏎ newline
              </div>
            </div>
          </div>
        </div>

        {/* Context drawer */}
        {rightPanel &&
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 300, background: 'var(--surface)', borderLeft: '1px solid var(--border-2)', overflowY: 'auto', zIndex: 20, boxShadow: '-8px 0 24px rgba(0,0,0,0.4)', animation: 'slideRight 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--mono)' }}>Context</span>
              <button onClick={() => setRightPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex' }}>
                <Icon name="x" size={14} />
              </button>
            </div>
            <PanelSection title="Active Tools" icon="zap">
              {[
            { name: 'read_file', path: 'auth.py', status: 'done' },
            { name: 'analyze_code', path: 'auth.py', status: 'running' },
            { name: 'write_file', path: 'auth/rate_limit.py', status: 'queued' }].
            map((t) =>
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 3, background: t.status === 'running' ? 'var(--blue-dim)' : t.status === 'done' ? 'var(--green-dim)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {t.status === 'running' ? <div style={{ width: 10, height: 10, border: '1.5px solid var(--blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : t.status === 'done' ? <Icon name="check" size={10} color="var(--green)" /> : <Icon name="clock" size={10} color="var(--text-3)" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 500, color: t.status === 'running' ? 'var(--blue)' : 'var(--text)' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.path}</div>
                  </div>
                </div>
            )}
            </PanelSection>
            <PanelSection title="Token Usage" icon="activity" collapsed>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>18,423</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>/ 200,000</span>
              </div>
              <div style={{ background: 'var(--surface-3)', height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: '9.2%', height: '100%', background: 'linear-gradient(90deg, var(--blue), var(--purple))', borderRadius: 3 }} />
              </div>
            </PanelSection>
            <PanelSection title="Context Memory" icon="memory" collapsed>
              {[
            { label: 'auth.py', lines: '~800 lines', icon: 'file-text', color: 'var(--blue)' },
            { label: 'requirements.txt', lines: '42 packages', icon: 'file-text', color: 'var(--text-2)' },
            { label: 'Project structure', lines: '18 files', icon: 'folder', color: 'var(--amber)' }].
            map((m) =>
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <Icon name={m.icon} size={13} color={m.color} />
                  <div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.lines}</div>
                  </div>
                </div>
            )}
            </PanelSection>
          </div>
        }
      </div>
    </div>);

}

function PanelSection({ title, icon, children, collapsed: initCollapsed = false }) {
  const [open, setOpen] = useState(!initCollapsed);
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen((p) => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', textAlign: 'left' }}>
        <Icon name={icon} size={13} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{title}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={12} />
      </button>
      {open && <div style={{ padding: '0 14px 12px' }}>{children}</div>}
    </div>);

}

Object.assign(window, { WorkspaceScreen });