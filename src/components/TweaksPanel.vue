<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Tweaks' },
})

const open = ref(false)
const pos = ref({ x: 16, y: 16 })
const dragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

function onMessage(e) {
  if (e.data === '__activate_edit_mode') open.value = true
  if (e.data === '__deactivate_edit_mode') open.value = false
}

function close() {
  open.value = false
  window.postMessage('__edit_mode_dismissed', '*')
}

function onMouseDown(e) {
  dragging.value = true
  dragOffset.value = {
    x: e.clientX - (window.innerWidth - pos.value.x - 260),
    y: e.clientY - (window.innerHeight - pos.value.y - 40),
  }
  e.preventDefault()
}

function onMouseMove(e) {
  if (!dragging.value) return
  const newRight = window.innerWidth - e.clientX + dragOffset.value.x
  const newBottom = window.innerHeight - e.clientY + dragOffset.value.y
  pos.value = {
    x: Math.max(8, Math.min(window.innerWidth - 268, newRight)),
    y: Math.max(8, Math.min(window.innerHeight - 48, newBottom)),
  }
}

function onMouseUp() {
  dragging.value = false
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.postMessage('__edit_mode_available', '*')
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div
    v-if="open"
    class="twk-panel"
    :style="{
      right: pos.x + 'px',
      bottom: pos.y + 'px',
      cursor: dragging ? 'grabbing' : 'default',
    }"
  >
    <div class="twk-header" @mousedown="onMouseDown" :style="{ cursor: dragging ? 'grabbing' : 'grab' }">
      <span class="twk-title">{{ title }}</span>
      <button class="twk-close" @click="close" @mousedown.stop>✕</button>
    </div>
    <div class="twk-body">
      <slot />
    </div>
  </div>
</template>

<style>
.twk-panel {
  position: fixed;
  width: 260px;
  background: var(--surface);
  border: 1px solid var(--border-2);
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  z-index: 9999;
  font-family: var(--mono);
  font-size: 12px;
  user-select: none;
  overflow: hidden;
}
.twk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
}
.twk-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.twk-close {
  background: none;
  border: none;
  color: var(--text-3);
  font-size: 13px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}
.twk-close:hover { color: var(--text); }
.twk-body {
  padding: 8px 0;
  max-height: 420px;
  overflow-y: auto;
}
.twk-sect {
  padding: 6px 12px 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.twk-row {
  display: flex;
  align-items: center;
  padding: 5px 12px;
  gap: 8px;
  min-height: 30px;
}
.twk-row-h {
  align-items: center;
}
.twk-lbl {
  width: 72px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-2);
}
.twk-chips {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.twk-chip {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.1s;
}
.twk-chip:hover { transform: scale(1.15); }
.twk-chip[data-on="1"] {
  border-color: var(--text);
  transform: scale(1.1);
}
.twk-seg {
  display: flex;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}
.twk-seg-btn {
  flex: 1;
  padding: 4px 8px;
  font-size: 11px;
  font-family: var(--mono);
  background: none;
  border: none;
  color: var(--text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.twk-seg-btn:hover { background: var(--surface-3); }
.twk-seg-btn[data-on="1"] {
  background: var(--surface-3);
  color: var(--text);
}
.twk-slider-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}
.twk-slider {
  flex: 1;
  -webkit-appearance: none;
  height: 3px;
  background: var(--border-2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.twk-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--text);
  border-radius: 50%;
  cursor: pointer;
}
.twk-val {
  font-size: 10px;
  color: var(--text-3);
  width: 26px;
  text-align: right;
}
.twk-tog-wrap {
  display: flex;
  gap: 4px;
}
.twk-tog {
  padding: 3px 8px;
  font-size: 11px;
  font-family: var(--mono);
  background: none;
  border: 1px solid var(--border-2);
  border-radius: 3px;
  color: var(--text-2);
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.twk-tog:hover { background: var(--surface-3); }
.twk-tog[data-on="1"] {
  background: var(--green-dim);
  border-color: var(--green);
  color: var(--green);
}
.twk-divider {
  height: 1px;
  background: #1a1a1a;
  margin: 6px 0;
}
</style>
