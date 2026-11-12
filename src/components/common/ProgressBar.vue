<script setup lang="ts">
import { clamp01 } from '@/utils/math'
import { computed } from 'vue'

const props = defineProps<{
  value: number
  share?: number | null
}>()

const total = computed(() => clamp01(props.value))
const own = computed(() => (props.share == null ? null : Math.min(total.value, clamp01(props.share))))
</script>

<template>
  <div
    class="progress-bar"
    :class="{ 'progress-bar--shared': own !== null }"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round(total * 100)"
  >
    <div class="progress-bar__fill" :style="{ '--fill': total }" />
    <div v-if="own" class="progress-bar__fill progress-bar__fill--own" :style="{ '--fill': own }" />
  </div>
</template>

<style scoped>
.progress-bar {
  position: relative;
  flex: 1;
  height: var(--bar-height, 6px);
  border-radius: var(--radius-xs);
  background: var(--bg-overlay);
  overflow: hidden;
}

.progress-bar__fill {
  position: absolute;
  inset: 0;
  background: var(--bar-color, var(--page-accent, var(--accent)));
  transform: scaleX(var(--fill));
  transform-origin: left;
  transition: transform var(--dur-enter) var(--ease-out);
}

.progress-bar--shared .progress-bar__fill:not(.progress-bar__fill--own) {
  background: color-mix(in srgb, var(--bar-color, var(--page-accent, var(--accent))) 40%, var(--bg-overlay));
}
</style>
