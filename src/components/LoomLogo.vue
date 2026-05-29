<script setup>
defineProps({
  size: { type: Number, default: 28 },
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 28 28" style="display:block;flex-shrink:0">
    <rect width="28" height="28" style="fill:var(--text)" />
    <text
      x="14"
      y="21"
      text-anchor="middle"
      style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:19px;letter-spacing:-0.04em;fill:var(--bg)"
    >L</text>
  </svg>
</template>
