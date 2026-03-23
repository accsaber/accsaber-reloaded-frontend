<script setup lang="ts">
defineProps<{
  count?: number
}>()

const positions = [
  { top: '20%', left: '12%', delay: '0s', duration: '2.8s' },
  { top: '60%', left: '38%', delay: '1s', duration: '3.2s' },
  { top: '25%', left: '65%', delay: '2s', duration: '2.5s' },
  { top: '70%', left: '82%', delay: '0.5s', duration: '3.5s' },
  { top: '35%', left: '50%', delay: '2.8s', duration: '3s' },
]
</script>

<template>
  <span class="glint-overlay" aria-hidden="true">
    <span
      v-for="(pos, i) in positions.slice(0, count ?? 5)"
      :key="i"
      class="glint-overlay__dot"
      :style="{
        top: pos.top,
        left: pos.left,
        animationDelay: pos.delay,
        animationDuration: pos.duration,
      }"
    />
  </span>
</template>

<style scoped>
.glint-overlay {
  position: absolute;
  inset: -8px;
  pointer-events: none;
}

.glint-overlay__dot {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #fffdf5;
  box-shadow: 0 0 6px 2px rgba(255, 250, 235, 0.85), 0 0 12px 4px rgba(255, 250, 235, 0.3);
  opacity: 0;
  animation: glint-pulse ease-in-out infinite;
}

@keyframes glint-pulse {
  0%, 100% { opacity: 0; transform: scale(0); }
  10% { opacity: 1; transform: scale(1.5); }
  20% { opacity: 0.8; transform: scale(1); }
  35% { opacity: 0; transform: scale(0); }
}

@media (prefers-reduced-motion: reduce) {
  .glint-overlay__dot {
    animation: none;
    display: none;
  }
}
</style>
