// forge-models.jsx — Local Models Dashboard
const { useState, useEffect } = React;

const MODELS = [
{ name: 'deepseek-r1:32b', family: 'DeepSeek', quant: 'Q4_K_M', size: '19.8 GB', ram: '22 GB', vram: '20 GB', speed: 38, ctx: 128, engine: 'Ollama', status: 'loaded', gpuUtil: 78, cpuUtil: 12, color: '#d93346' },
{ name: 'qwen2.5-coder:32b', family: 'Qwen', quant: 'Q4_K_M', size: '18.5 GB', ram: '21 GB', vram: '19 GB', speed: 42, ctx: 128, engine: 'Ollama', status: 'loaded', gpuUtil: 82, cpuUtil: 8, color: '#e6c128' },
{ name: 'llama3.3:70b', family: 'Meta', quant: 'Q2_K', size: '26.1 GB', ram: '28 GB', vram: '24 GB', speed: 18, ctx: 128, engine: 'Ollama', status: 'idle', gpuUtil: 0, cpuUtil: 0, color: '#00b8d4' },
{ name: 'phi-4:14b', family: 'Microsoft', quant: 'Q8_0', size: '15.6 GB', ram: '16 GB', vram: '14 GB', speed: 94, ctx: 16, engine: 'llama.cpp', status: 'idle', gpuUtil: 0, cpuUtil: 0, color: '#00cc88' },
{ name: 'mistral-small:24b', family: 'Mistral', quant: 'Q4_K_S', size: '14.2 GB', ram: '15 GB', vram: '13 GB', speed: 61, ctx: 128, engine: 'Ollama', status: 'idle', gpuUtil: 0, cpuUtil: 0, color: '#d9357a' }];


function MiniSparkline({ values, color }) {
  const max = Math.max(...values, 1);
  const w = 64,h = 24;
  const pts = values.map((v, i) => `${i / (values.length - 1) * w},${h - v / max * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" opacity={0.7} />
      <circle cx={(values.length - 1) / (values.length - 1) * w} cy={h - values[values.length - 1] / max * h} r={2.5} fill={color} />
    </svg>);

}

function GpuBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease',
          boxShadow: value > 0 ? `0 0 8px ${color}60` : 'none' }} />
      </div>
      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-2)', minWidth: 30, textAlign: 'right' }}>{value}%</span>
    </div>);

}

function ModelRow({ model, selected, onSelect }) {
  const isLoaded = model.status === 'loaded';
  const [gpuHistory] = useState(() => Array.from({ length: 12 }, (_, i) => Math.max(0, model.gpuUtil + (Math.random() - 0.5) * 20)));
  return (
    <div onClick={() => onSelect(model)}
    style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 100px 120px 90px 80px', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selected ? 'var(--surface-2)' : 'transparent', transition: 'background 0.15s' }}>
      {/* Name */}
      <div style={{ display: 'flex', align: 'center', gap: 10, alignItems: 'center', minWidth: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: model.color, flexShrink: 0,
          boxShadow: isLoaded ? `0 0 6px ${model.color}` : 'none',
          animation: isLoaded ? 'statusGlow 2s ease-in-out infinite' : 'none' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{model.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{model.family} · {model.engine}</div>
        </div>
      </div>
      {/* Quant */}
      <Badge variant={model.quant.startsWith('Q8') ? 'blue' : model.quant.startsWith('Q4') ? 'green' : 'amber'}>{model.quant}</Badge>
      {/* Size */}
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>{model.size}</span>
      {/* VRAM */}
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)' }}>{model.vram}</span>
      {/* Speed */}
      <div style={{ display: 'flex', align: 'center', gap: 6, alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: model.speed > 60 ? 'var(--green)' : model.speed > 30 ? 'var(--amber)' : 'var(--red)' }}>{model.speed}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>t/s</span>
      </div>
      {/* GPU sparkline */}
      <MiniSparkline values={gpuHistory} color={isLoaded ? model.color : 'var(--text-3)'} />
      {/* Status */}
      <div style={{ display: 'flex', align: 'center', gap: 5, alignItems: 'center' }}>
        <StatusDot status={isLoaded ? 'active' : 'idle'} />
        <span style={{ fontSize: 12, color: isLoaded ? 'var(--green)' : 'var(--text-3)' }}>{isLoaded ? 'Loaded' : 'Idle'}</span>
      </div>
      {/* Actions */}
      <div style={{ display: 'flex', gap: 5 }}>
        <button style={{ padding: '4px 9px', background: isLoaded ? 'transparent' : 'var(--blue)', border: `1px solid ${isLoaded ? 'var(--border)' : 'var(--blue)'}`, borderRadius: 5, fontSize: 11, color: isLoaded ? 'var(--text-3)' : '#fff', cursor: 'pointer' }}>
          {isLoaded ? 'Eject' : 'Load'}
        </button>
      </div>
    </div>);

}

function LocalModelsScreen() {
  const [selected, setSelected] = useState(MODELS[0]);
  const [tab, setTab] = useState('installed');
  const totalSize = MODELS.reduce((s, m) => s + parseFloat(m.size), 0).toFixed(1);
  const loadedCount = MODELS.filter((m) => m.status === 'loaded').length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Local Models</h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>{MODELS.length} installed · {loadedCount} in memory · {totalSize} GB on disk</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
              <Icon name="download" size={14} />
              Pull Model
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--blue)', border: 'none', borderRadius: 8, fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              <Icon name="plus" size={14} />
              Import
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {['installed', 'discover'].map((t) =>
          <button key={t} onClick={() => setTab(t)}
          style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'transparent'}`, cursor: 'pointer', fontSize: 13, color: tab === t ? 'var(--blue)' : 'var(--text-2)', fontWeight: tab === t ? 600 : 400, textTransform: 'capitalize', transition: 'all 0.15s' }}>
              {t}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 90px 100px 120px 90px 80px', gap: 12, padding: '9px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0 }}>
          {['Model', 'Quant', 'Size', 'VRAM', 'Speed', 'GPU Usage', 'Status', ''].map((h) =>
          <span key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          )}
        </div>
        {MODELS.map((m) =>
        <ModelRow key={m.name} model={m} selected={selected?.name === m.name} onSelect={setSelected} />
        )}
      </div>

      {/* Detail panel */}
      {selected &&
      <div style={{ height: 170, borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '16px 24px', flexShrink: 0, display: 'flex', gap: 32 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: selected.color, boxShadow: `0 0 8px ${selected.color}` }} />
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 15 }}>{selected.name}</span>
              <Badge variant="default">{selected.engine}</Badge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
              {[['Quantization', selected.quant], ['Context Window', `${selected.ctx}k tokens`], ['On-disk Size', selected.size], ['Inference Speed', `${selected.speed} t/s`]].map(([k, v]) =>
            <div key={k}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--mono)' }}>{v}</div>
                </div>
            )}
            </div>
          </div>
          <div style={{ width: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Live Utilization</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
                  <span>GPU</span><span style={{ fontFamily: 'var(--mono)' }}>{selected.gpuUtil}%</span>
                </div>
                <GpuBar value={selected.gpuUtil} color={selected.color} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
                  <span>CPU</span><span style={{ fontFamily: 'var(--mono)' }}>{selected.cpuUtil}%</span>
                </div>
                <GpuBar value={selected.cpuUtil} color="var(--blue)" />
              </div>
            </div>
          </div>
        </div>
      }
    </div>);

}

Object.assign(window, { LocalModelsScreen });