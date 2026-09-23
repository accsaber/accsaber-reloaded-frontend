<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

const PULSE_MS = 700

const props = withDefaults(
  defineProps<{
    value: number
    max: number
    tone?: 'attacker' | 'defender' | 'guard'
    size?: 'sm' | 'lg'
    broken?: boolean
  }>(),
  { tone: 'guard', size: 'sm' },
)

const pulsing = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function percent(): number {
  if (props.max <= 0) return 0
  return Math.max(0, Math.min(100, (props.value / props.max) * 100))
}

watch(
  () => props.value,
  (next, previous) => {
    if (next >= previous) return
    pulsing.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      pulsing.value = false
    }, PULSE_MS)
  },
)

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <span
    class="war-bar"
    :class="[`war-bar--${tone}`, `war-bar--${size}`, { 'war-bar--pulse': pulsing, 'war-bar--broken': broken }]"
    role="progressbar"
    :aria-valuenow="Math.round(value)"
    aria-valuemin="0"
    :aria-valuemax="Math.round(max)"
  >
    <span class="war-bar__fill" :style="{ width: `${percent()}%` }" />
  </span>
</template>

<style scoped>
.war-bar {
  --war-bar-fill: var(--success);
  display: block;
  width: 100%;
  height: 6px;
  overflow: hidden;
  background: var(--bg-overlay);
  border-radius: 2px;
}

.war-bar--lg {
  height: 14px;
  border-radius: 3px;
}

.war-bar--attacker {
  --war-bar-fill: var(--error);
}

.war-bar--defender {
  --war-bar-fill: var(--info);
}

.war-bar--broken {
  background: color-mix(in srgb, var(--error) 35%, var(--bg-overlay));
}

.war-bar__fill {
  display: block;
  height: 100%;
  background: var(--war-bar-fill);
  transition: width 300ms ease-out, background-color 200ms ease;
}

.war-bar--pulse .war-bar__fill {
  animation: war-bar-pulse 700ms ease-out;
}

@keyframes war-bar-pulse {
  0% {
    background: var(--text-primary);
  }
  100% {
    background: var(--war-bar-fill);
  }
}

@media (prefers-reduced-motion: reduce) {
  .war-bar__fill {
    transition: none;
  }

  .war-bar--pulse .war-bar__fill {
    animation: none;
    background: var(--text-primary);
  }
}
</style>
