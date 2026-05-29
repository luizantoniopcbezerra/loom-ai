<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'default' },
})

const VARIANTS = {
  default: { background: 'var(--surface-3)', color: 'var(--text-2)' },
  blue:    { background: 'var(--blue-dim)',   color: 'var(--blue)' },
  green:   { background: 'var(--green-dim)',  color: 'var(--green)' },
  amber:   { background: 'rgba(230,193,40,0.12)', color: 'var(--amber)' },
  red:     { background: 'rgba(217,51,70,0.12)',  color: 'var(--red)' },
  purple:  { background: 'var(--purple-dim)', color: 'var(--purple)' },
}

const badgeStyle = computed(() => {
  const v = VARIANTS[props.variant] || VARIANTS.default
  return {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'var(--mono)',
    fontSize: '11px',
    padding: '2px 7px',
    borderRadius: '4px',
    lineHeight: '1.6',
    whiteSpace: 'nowrap',
    ...v,
  }
})
</script>

<template>
  <span :style="badgeStyle"><slot /></span>
</template>
