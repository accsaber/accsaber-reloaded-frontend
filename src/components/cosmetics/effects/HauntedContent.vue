<script setup lang="ts">
import type { HauntSpec } from '@/utils/cosmetics/wear'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    spec: HauntSpec | null
    fill?: boolean
  }>(),
  { fill: true },
)

const style = computed(() => {
  if (!props.spec) return undefined
  return {
    '--haunt-color': props.spec.color,
    '--haunt-opacity': String(props.spec.opacity),
    '--haunt-cycle': `${props.spec.cycleS}s`,
  }
})
</script>

<template>
  <span class="haunted-content" :class="{ 'haunted-content--intrinsic': !fill, 'haunted-content--on': !!spec }" :style="style">
    <span class="haunted-content__inner">
      <slot />
    </span>
  </span>
</template>

<style scoped>
.haunted-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.haunted-content--intrinsic {
  display: inline-flex;
  width: auto;
  height: auto;
  vertical-align: middle;
}

.haunted-content__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.haunted-content--intrinsic .haunted-content__inner {
  display: inline-flex;
  width: auto;
  height: auto;
}

.haunted-content--on .haunted-content__inner {
  animation: haunt-spectral var(--haunt-cycle, 8s) linear infinite;
}

@keyframes haunt-spectral {
  0%,
  100% {
    opacity: 1;
    filter: none;
  }
  4% {
    opacity: var(--haunt-opacity, 0.7);
    filter: grayscale(1) sepia(1) hue-rotate(95deg) saturate(2) brightness(1.1) drop-shadow(0 0 1px var(--haunt-color)) drop-shadow(0 -4px 0 color-mix(in srgb, var(--haunt-color) 25%, transparent));
  }
  33% {
    opacity: var(--haunt-opacity, 0.7);
    filter: grayscale(1) sepia(1) hue-rotate(95deg) saturate(2) brightness(1.1) drop-shadow(0 0 1px var(--haunt-color)) drop-shadow(0 -4px 0 color-mix(in srgb, var(--haunt-color) 25%, transparent));
  }
  37% {
    opacity: 1;
    filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .haunted-content--on .haunted-content__inner {
    animation: none;
  }
}
</style>
