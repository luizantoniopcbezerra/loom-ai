// forge-onboarding.jsx
const { useState, useEffect, useRef } = React;

const DETECTED_AGENTS = [
{ name: 'Claude Code', cli: 'claude', version: '1.8.2', color: '#d9357a', status: 'found', caps: ['code', 'analysis', 'chat'] },
{ name: 'Gemini CLI', cli: 'gemini', version: '0.1.9', color: '#00b8d4', status: 'found', caps: ['research', 'vision', 'chat'] },
{ name: 'Codex CLI', cli: 'codex', version: '0.2.1', color: '#00cc88', status: 'found', caps: ['codegen', 'complete'] },
{ name: 'Copilot CLI', cli: 'gh copilot', version: '2.0.1', color: '#00b8d4', status: 'found', caps: ['explain', 'suggest'] },
{ name: 'Aider', cli: 'aider', version: '0.50.1', color: '#e6c128', status: 'found', caps: ['edit', 'commit', 'chat'] },
{ name: 'OpenCode', cli: 'opencode', version: '0.1.4', color: '#d93346', status: 'found', caps: ['interactive', 'lsp'] }];


const SCAN_LINES = [
'> Initializing Loom runtime...',
'> Scanning PATH for AI CLIs...',
'> Detected: /usr/local/bin/claude (v1.8.2)',
'> Detected: /usr/local/bin/gemini (v0.1.9)',
'> Detected: /usr/local/bin/codex (v0.2.1)',
'> Detected: /usr/bin/aider (v0.50.1)',
'> Scanning ~/.config/loom/agents...',
'> Detected: opencode (v0.1.4)',
'> Checking GPU availability... NVIDIA RTX 4090 ✓',
'> Indexing local model store... 4 models found',
'> Scan complete. 6 agents ready.'];


function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const [scanLines, setScanLines] = useState([]);
  const [scanDone, setScanDone] = useState(false);
  const [agentsVisible, setAgentsVisible] = useState([]);
  const [progress, setProgress] = useState(0);
  const [username, setUsername] = useState('');
  const scanRef = useRef(null);
  const usernameInputRef = useRef(null);

  // Step 1: animate scan lines
  useEffect(() => {
    if (step !== 1) return;
    setScanLines([]);setScanDone(false);setAgentsVisible([]);setProgress(0);
    let i = 0;
    const iv = setInterval(() => {
      if (i >= SCAN_LINES.length) {
        clearInterval(iv);
        setScanDone(true);
        return;
      }
      // Capture by value — don't reference `i` inside the updater closure
      const line = SCAN_LINES[i];
      const pct = Math.round((i + 1) / SCAN_LINES.length * 100);
      setScanLines((prev) => [...prev, line]);
      setProgress(pct);
      i++;
      if (i >= SCAN_LINES.length) {
        clearInterval(iv);
        setScanDone(true);
      }
    }, 280);
    return () => clearInterval(iv);
  }, [step]);

  // Step 2: reveal agent cards
  useEffect(() => {
    if (step !== 2) return;
    setAgentsVisible([]);
    DETECTED_AGENTS.forEach((_, idx) => {
      setTimeout(() => setAgentsVisible((p) => [...p, idx]), idx * 140);
    });
  }, [step]);

  useEffect(() => {
    if (scanRef.current) scanRef.current.scrollTop = scanRef.current.scrollHeight;
  }, [scanLines]);

  // Step 4: autofocus username input
  useEffect(() => {
    if (step === 4) setTimeout(() => usernameInputRef.current?.focus(), 200);
  }, [step]);

  const steps = ['Welcome', 'Scanning', 'Agents Found', 'Permissions', 'Profile', 'Ready'];

  return (
    <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>

      {/* Top brand strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ForgeLogo size={20} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.16em', color: 'var(--text-2)', textTransform: 'uppercase' }}>LOOM / v0.1.0</span>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
          SETUP · {String(step + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
        </div>
      </div>

      {/* Bottom progress strip */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 2 }}>
        {steps.map((s, i) =>
        <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 0, background: i < step ? 'var(--blue)' : i === step ? 'var(--blue)' : 'var(--border-2)', transition: 'background 0.3s', flexShrink: 0, opacity: i === step ? 1 : i < step ? 0.6 : 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.10em', color: i === step ? 'var(--blue)' : i < step ? 'var(--text-2)' : 'var(--text-3)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              {String(i + 1).padStart(2, '0')} {s}
            </span>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />}
          </div>
        )}
      </div>

      {/* Card */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: step === 2 ? 820 : 560, padding: '0 24px', transition: 'max-width 0.3s ease' }}>

        {/* STEP 0: Welcome */}
        {step === 0 &&
        <div key="s0" style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeUp 0.35s ease both' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--blue)', textTransform: 'uppercase' }}>
                ▸ Local AI Command Center
              </span>
              <h1 style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.95, color: 'var(--text)' }}>
                Run every<br />agent. Locally.
              </h1>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button onClick={() => setStep(1)} style={{ padding: '14px 28px', background: 'var(--blue)', color: '#000', border: 'none', borderRadius: 0, fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
                Begin Setup →
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', border: '1px solid var(--border-2)', color: 'var(--text-2)', fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />
                Offline · No tracking
              </div>
            </div>
          </div>
        }

        {/* STEP 1: Scanning */}
        {step === 1 &&
        <div key="s1" style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.35s ease both' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                {!scanDone ?
              <div style={{ width: 18, height: 18, border: '2px solid var(--border-2)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> :
              <Icon name="check" size={18} color="var(--green)" />}
                <span style={{ fontSize: 13, color: scanDone ? 'var(--green)' : 'var(--blue)', fontFamily: 'var(--mono)' }}>
                  {scanDone ? 'Scan complete' : 'Scanning local environment...'}
                </span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {scanDone ? 'Found 6 AI agents' : 'Loom is indexing your local AI environment…'}
              </h2>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--blue), var(--purple))', transition: 'width 0.25s ease', borderRadius: 4 }} />
            </div>

            {/* Terminal-style output */}
            <div ref={scanRef} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, height: 200, overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: 12 }}>
              <div style={{ color: 'var(--text-3)', marginBottom: 8 }}>loom scan --all-paths --detect-gpu</div>
              {scanLines.filter(Boolean).map((line, i) =>
            <div key={i} style={{ color: line.includes('Detected') ? 'var(--green)' : line.includes('complete') ? 'var(--blue)' : 'var(--text-2)', marginBottom: 3, animation: 'fadeIn 0.2s ease' }}>
                  {line}
                </div>
            )}
              {!scanDone && <span style={{ display: 'inline-block', width: 7, height: 13, background: 'var(--blue)', animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom', marginLeft: 2 }} />}
            </div>
            {scanDone &&
          <button onClick={() => setStep(2)} style={{ alignSelf: 'flex-end', padding: '12px 24px', background: 'var(--blue)', color: '#000', border: 'none', borderRadius: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--mono)', textTransform: 'uppercase', cursor: 'pointer' }}>
                Review Agents →
              </button>
          }
          </div>
        }

        {/* STEP 2: Agents found */}
        {step === 2 &&
        <div key="s2" style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.35s ease both' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>6 agents detected on your machine</h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>All running locally — no cloud required.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {DETECTED_AGENTS.map((ag, i) =>
            <div key={ag.name} style={{
              padding: 16, background: 'var(--surface)', border: `1px solid var(--border)`,
              borderRadius: var_r_lg, display: 'flex', flexDirection: 'column', gap: 10,
              opacity: agentsVisible.includes(i) ? 1 : 0,
              transform: agentsVisible.includes(i) ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease'
            }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${ag.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${ag.color}40` }}>
                      <Icon name="agent" size={18} color={ag.color} />
                    </div>
                    <Badge variant="green">v{ag.version}</Badge>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ag.name}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{ag.cli}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {ag.caps.map((c) => <Badge key={c} style={{ fontSize: 10 }}>{c}</Badge>)}
                  </div>
                </div>
            )}
            </div>
            <button onClick={() => setStep(3)} style={{ alignSelf: 'flex-end', padding: '12px 24px', background: 'var(--blue)', color: '#000', border: 'none', borderRadius: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--mono)', textTransform: 'uppercase', cursor: 'pointer' }}>
              Configure Permissions →
            </button>
          </div>
        }

        {/* STEP 3: Permissions */}
        {step === 3 &&
        <div key="s3" style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.35s ease both' }}>
            <div>
              <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Permissions</h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>Forge runs entirely offline. These permissions stay on your machine.</p>
            </div>
            {[
          { icon: 'folder', label: 'File System Access', desc: 'Read/write files for agents and workflows', granted: true },
          { icon: 'terminal', label: 'Shell Execution', desc: 'Run CLI agents and terminal commands', granted: true },
          { icon: 'cpu', label: 'GPU Access', desc: 'Use local GPU for model inference', granted: true },
          { icon: 'wifi-off', label: 'Network Isolation', desc: 'Block external network calls by default', granted: true }].
          map(function (p) {return (
              <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: p.granted ? 'rgba(0,204,136,0.12)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={p.icon} size={17} color={p.granted ? 'var(--green)' : 'var(--text-3)'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{p.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.granted ?
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px rgba(0,204,136,0.6)' }} />
                        <span style={{ fontSize: 12, color: 'var(--green)' }}>Granted</span>
                      </span> :
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Optional</span>
                  }
                </div>
              </div>);
          })}
            <button onClick={() => setStep(4)} style={{ alignSelf: 'flex-end', padding: '12px 24px', background: 'var(--blue)', color: '#000', border: 'none', borderRadius: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--mono)', textTransform: 'uppercase', cursor: 'pointer' }}>
              Continue →
            </button>
          </div>
        }

        {/* STEP 4: Profile */}
        {step === 4 &&
        <div key="s4" style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 0.35s ease both' }}>
            <div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--blue)', textTransform: 'uppercase' }}>
                ▸ Profile
              </span>
              <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 8 }}>What should we call you?</h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 8, lineHeight: 1.55 }}>
                This is just for your local workspace — it never leaves your machine. Pick a name agents and chats will use to address you.
              </p>
            </div>

            {/* Avatar preview + input */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 0, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 24, color: '#000', fontWeight: 800, fontFamily: 'var(--mono)' }}>
                {(username.trim()[0] || '?').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Username</label>
                <input ref={usernameInputRef} value={username} onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && username.trim()) setStep(5); }}
                  placeholder="e.g. alex"
                  maxLength={32}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-2)', padding: '6px 0', color: 'var(--text)', fontSize: 20, fontWeight: 600, outline: 'none', fontFamily: 'var(--font)', letterSpacing: '-0.01em' }}/>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, fontFamily: 'var(--mono)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>local-only · stored on this machine</span>
                  <span>{username.length}/32</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setStep(3)}
                style={{ padding: '12px 18px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 0, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', fontFamily: 'var(--mono)', textTransform: 'uppercase', cursor: 'pointer' }}>
                ← Back
              </button>
              <button onClick={() => setStep(5)} disabled={!username.trim()}
                style={{ padding: '12px 24px', background: username.trim() ? 'var(--blue)' : 'var(--surface-2)', color: username.trim() ? '#000' : 'var(--text-3)', border: 'none', borderRadius: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--mono)', textTransform: 'uppercase', cursor: username.trim() ? 'pointer' : 'default' }}>
                Continue →
              </button>
            </div>
          </div>
        }

        {/* STEP 5: Ready */}
        {step === 5 &&
        <div key="s5" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, animation: 'fadeUp 0.35s ease both' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--green-dim)', border: '1.5px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'countIn 0.5s ease' }}>
              <Icon name="check" size={32} color="var(--green)" />
            </div>
            <div>
              <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>Welcome, {username || 'friend'}</h2>
              <p style={{ color: 'var(--text-2)', marginTop: 8, lineHeight: 1.6 }}>
                6 agents indexed · 4 local models ready · GPU acceleration active
              </p>
            </div>
            <button onClick={() => onComplete({ username: username.trim() || 'user' })} style={{ padding: '16px 40px', background: 'var(--blue)', color: '#000', border: 'none', borderRadius: 0, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>
              ▸ Launch Loom
            </button>
          </div>
        }
      </div>
    </div>);

}

// CSS var shims for JSX
const var_r = 'var(--r)';
const var_r_lg = 'var(--r-lg)';

Object.assign(window, { OnboardingScreen });