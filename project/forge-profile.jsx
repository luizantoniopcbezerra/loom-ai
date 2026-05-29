// forge-profile.jsx — Simple profile modal
const { useState: useProfileState } = React;

function ProfileModal({ user, onSave, onClose }) {
  const [username, setUsername] = useProfileState(user?.username || '');
  const [color, setColor] = useProfileState(user?.color || 'var(--blue)');

  const colors = [
    { val: 'var(--blue)',   hex: '#00b8d4' },
    { val: 'var(--purple)', hex: '#d9357a' },
    { val: 'var(--green)',  hex: '#00cc88' },
    { val: 'var(--amber)',  hex: '#e6c128' },
    { val: 'var(--red)',    hex: '#d93346' },
    { val: 'var(--text)',   hex: 'mono'    },
  ];

  const save = () => {
    if (!username.trim()) return;
    onSave({ username: username.trim(), color });
    onClose();
  };

  const initial = (username.trim()[0] || '?').toUpperCase();

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', animation:'fadeIn 0.12s ease' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:440, background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:6, animation:'fadeUp 0.18s ease', boxShadow:'0 32px 64px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Profile</span>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', padding:0 }}>
            <Icon name="x" size={14}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:22, display:'flex', flexDirection:'column', gap:20 }}>
          {/* Avatar preview */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <div style={{ width:72, height:72, background: color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, color: color === 'var(--text)' ? 'var(--bg)' : '#000', fontWeight:800, fontFamily:'var(--mono)', borderRadius:4 }}>
              {initial}
            </div>
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Avatar preview</span>
          </div>

          {/* Color picker */}
          <div>
            <label style={{ display:'block', fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Avatar color</label>
            <div style={{ display:'flex', gap:8 }}>
              {colors.map(c => (
                <button key={c.val} onClick={() => setColor(c.val)}
                  style={{ width:34, height:34, background:c.val, border:`2px solid ${color === c.val ? 'var(--text)' : 'transparent'}`, cursor:'pointer', borderRadius:3, padding:0, transition:'border-color 0.15s' }}/>
              ))}
            </div>
          </div>

          {/* Username input */}
          <div>
            <label style={{ display:'block', fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && username.trim()) save(); }}
              maxLength={32} autoFocus
              style={{ width:'100%', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:3, padding:'10px 12px', color:'var(--text)', fontSize:14, fontWeight:500, outline:'none', fontFamily:'var(--font)' }}/>
            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:6, fontFamily:'var(--mono)', display:'flex', justifyContent:'space-between' }}>
              <span>stored locally · never leaves this machine</span>
              <span>{username.length}/32</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose}
            style={{ padding:'8px 14px', background:'transparent', border:'1px solid var(--border)', borderRadius:3, fontSize:12, color:'var(--text-2)', cursor:'pointer', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>
            Cancel
          </button>
          <button onClick={save} disabled={!username.trim()}
            style={{ padding:'8px 18px', background: username.trim() ? 'var(--blue)' : 'var(--surface-2)', border:'none', borderRadius:3, fontSize:12, color: username.trim() ? '#000' : 'var(--text-3)', cursor: username.trim() ? 'pointer' : 'default', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700 }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProfileModal });
