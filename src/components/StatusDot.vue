<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: 'active' },
  size: { type: Number, default: 7 },
})

const COLOR_MAP = {
  active: 'var(--green)',
  idle: 'var(--amber)',
  offline: 'var(--text-3)',
  error: 'var(--red)',
  running: 'var(--blue)',
}

const dotStyle = computed(() => {
  const color = COLOR_MAP[props.status] || COLOR_MAP.offline
  const style = {
    display: 'inline-block',
    width: props.size + 'px',
    height: props.size + 'px',
    borderRadius: '50%',
    background: color,
    flexShrink: '0',
  }
  if (props.status === 'active') {
    style.animation = 'statusGlow 2s ease-in-out infinite'
  } else if (props.status === 'running') {
    style.animation = 'statusGlowBlue 2s ease-in-out infinite'
  }
  return style
})
</script>

<template>
  <span :style="dotStyle" />
</template>
