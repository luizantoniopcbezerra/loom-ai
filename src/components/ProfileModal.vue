<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  user: { type: Object, default: null },
})
const emit = defineEmits(['save', 'close'])

const COLORS = [
  { val: 'var(--blue)',   hex: '#00b8d4' },
  { val: 'var(--purple)', hex: '#d9357a' },
  { val: 'var(--green)',  hex: '#00cc88' },
  { val: 'var(--amber)',  hex: '#e6c128' },
  { val: 'var(--red)',    hex: '#d93346' },
  { val: 'var(--text)',   hex: 'mono'    },
]

const username = ref(props.user?.username || '')
const color = ref(props.user?.color || 'var(--blue)')

const canSave = computed(() => username.value.trim().length > 0)
const avatarInitial = computed(() => username.value.trim()[0]?.toUpperCase() || '?')

function save() {
  if (!canSave.value) return
  emit('save', { username: username.value.trim(), color: color.value })
  emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

function onInputKeydown(e) {
  if (e.key === 'Enter') save()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <!-- Backdrop -->
  <div
    style="position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center"
    @click.self="emit('close')"
  >
    <!-- Modal card -->
    <div
      style="width:440px;background:var(--surface);border:1px solid var(--border-2);border-radius:var(--r-xl);overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,0.6);animation:fadeUp 0.18s ease"
    >
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border)">
        <span style="font-family:var(--mono);font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.1em">Profile</span>
        <button
          style="background:transparent;border:none;color:var(--text-3);cursor:pointer;display:flex;align-items:center;padding:2px"
          @click="emit('close')"
        >
          <AppIcon name="x" :size="16" color="var(--text-3)" />
        </button>
      </div>

      <!-- Body -->
      <div style="padding:20px 20px 16px;display:flex;flex-direction:column;gap:20px">
        <!-- Avatar preview -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
          <div
            :style="{
              width:'72px',height:'72px',borderRadius:'var(--r-lg)',
              background: color,
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'28px',fontWeight:700,color:'#000',
              flexShrink:0,
              transition:'background 0.2s',
            }"
          >{{ avatarInitial }}</div>
        </div>

        <!-- Color picker -->
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Accent color</div>
          <div style="display:flex;gap:8px;justify-content:center">
            <button
              v-for="c in COLORS"
              :key="c.val"
              :style="{
                width:'32px',height:'32px',borderRadius:'50%',
                background: c.hex === 'mono' ? 'var(--text)' : c.hex,
                border: color === c.val ? '3px solid var(--text)' : '3px solid transparent',
                cursor:'pointer',
                padding:0,
                transition:'transform 0.15s,border-color 0.15s',
                transform: color === c.val ? 'scale(1.1)' : 'scale(1)',
                outline: color === c.val ? '2px solid var(--bg)' : 'none',
                outlineOffset:'1px',
              }"
              @click="color = c.val"
            />
          </div>
        </div>

        <!-- Username input -->
        <div>
          <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Username</div>
          <input
            v-model="username"
            placeholder="Enter username"
            style="width:100%;background:var(--surface-2);border:1px solid var(--border-2);border-radius:var(--r);padding:9px 12px;font-size:13px;color:var(--text);outline:none;font-family:var(--font);transition:border-color 0.15s"
            @keydown="onInputKeydown"
            @focus="e => e.target.style.borderColor='var(--blue)'"
            @blur="e => e.target.style.borderColor='var(--border-2)'"
          />
        </div>
      </div>

      <!-- Footer -->
      <div style="display:flex;gap:8px;padding:14px 20px;border-top:1px solid var(--border)">
        <button
          style="flex:1;padding:8px 0;border-radius:var(--r);font-size:13px;cursor:pointer;background:transparent;border:1px solid var(--border-2);color:var(--text-2)"
          @click="emit('close')"
        >Cancel</button>
        <button
          :style="{
            flex:2,padding:'8px 0',borderRadius:'var(--r)',fontSize:'13px',fontWeight:600,cursor:canSave?'pointer':'not-allowed',border:'none',
            background: canSave ? 'var(--blue)' : 'var(--surface-3)',
            color: canSave ? '#000' : 'var(--text-3)',
            transition:'background 0.15s',
          }"
          :disabled="!canSave"
          @click="save"
        >Save</button>
      </div>
    </div>
  </div>
</template>
