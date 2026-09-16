<script setup lang="ts">
import type { Composition } from '@/types/api/items'
import type { EffectMeasure } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { readHauntSpec } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

const THEME_GHOST_PX = 200
const THEME_CYCLE_FACTOR = 3

const spec = computed(() => readHauntSpec(props.composition))
const theme = computed(() => props.measure.typeKey === 'theme')
const thumbnail = computed(() => props.measure.typeKey === 'profile_thumbnail_background')
const box = computed(() => props.measure.box)
const seedKey = computed(() => props.measure.stack * 31 + 7)

const ghost = computed(() => {
  const b = box.value
  if (theme.value) {
    const size = THEME_GHOST_PX
    return {
      x: b.x + b.w * (0.12 + hash01(seedKey.value) * 0.76),
      y: b.y + b.h + size * 0.6,
      size,
      rise: b.h + size * 1.4,
      cycle: spec.value.cycleS * THEME_CYCLE_FACTOR,
      peak: spec.value.opacity * 0.45,
    }
  }
  const size = Math.max(16, Math.min(b.w, b.h) * 0.6)
  return {
    x: b.x + b.w * 0.5,
    y: b.y + b.h * 0.7,
    size,
    rise: b.h * 0.7 + size * 0.9,
    cycle: spec.value.cycleS,
    peak: spec.value.opacity * 0.85,
  }
})

const ghostStyle = computed(() => ({
  '--haunt-color': spec.value.color,
  '--haunt-cycle': `${ghost.value.cycle}s`,
  '--haunt-rise': `${-ghost.value.rise}px`,
  '--haunt-peak': String(ghost.value.peak),
  left: `${ghost.value.x}px`,
  top: `${ghost.value.y}px`,
  width: `${ghost.value.size}px`,
  height: `${ghost.value.size * 1.2}px`,
  animationDelay: `${-props.measure.stack * 2.7}s`,
}))

const eyeAt = computed(() => {
  const b = box.value
  if (theme.value) {
    return { x: 0.08 + hash01(seedKey.value) * 0.84, y: 0.55 + hash01(seedKey.value * 3) * 0.35, size: 5, gap: 14 }
  }
  const size = thumbnail.value ? Math.max(3, Math.min(b.w, b.h) * 0.05) : 3
  return { x: 0.5, y: 0.42, size, gap: Math.max(3, b.w * 0.06) }
})

const eyeStyle = computed(() => ({
  '--haunt-color': spec.value.color,
  '--haunt-eye': `${eyeAt.value.size}px`,
  left: `${box.value.x + box.value.w * eyeAt.value.x}px`,
  top: `${box.value.y + box.value.h * eyeAt.value.y}px`,
  gap: `${eyeAt.value.gap}px`,
  animationDelay: `${-props.measure.stack * 4}s`,
}))
</script>

<template>
  <span v-if="(theme || thumbnail) && box.w > 0 && box.h > 0" class="comp-fx-haunt-ghost" :style="ghostStyle" aria-hidden="true">
    <svg class="comp-fx-haunt-ghost__sheet" viewBox="0 0 40 48">
      <path d="M20 3C10.5 3 6 12 6 22v23l4.7-4.4 4.6 4.4 4.7-4.4 4.7 4.4 4.6-4.4L34 45V22C34 12 29.5 3 20 3Z" />
      <ellipse class="comp-fx-haunt-ghost__hole" cx="14.5" cy="20" rx="2.6" ry="3.6" />
      <ellipse class="comp-fx-haunt-ghost__hole" cx="25.5" cy="20" rx="2.6" ry="3.6" />
      <ellipse class="comp-fx-haunt-ghost__hole" cx="20" cy="29.5" rx="2" ry="2.8" />
    </svg>
  </span>
  <span v-if="spec.eyes && box.w > 0 && box.h > 0" class="comp-fx-haunt-eyes" :style="eyeStyle" aria-hidden="true">
    <span class="comp-fx-haunt-eyes__eye" />
    <span class="comp-fx-haunt-eyes__eye" />
  </span>
</template>

<style scoped>
.comp-fx-haunt-ghost {
  position: absolute;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.7);
  pointer-events: none;
  animation: haunt-rise var(--haunt-cycle, 8s) ease-in-out infinite;
}

.comp-fx-haunt-ghost__sheet {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  fill: var(--haunt-color);
  filter: blur(0.4px);
  animation: haunt-sway 2.6s ease-in-out infinite;
}

.comp-fx-haunt-ghost__hole {
  fill: rgb(0 0 0 / 0.55);
}

@keyframes haunt-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(0) scale(0.7);
  }
  7% {
    opacity: var(--haunt-peak, 0.6);
  }
  30% {
    opacity: var(--haunt-peak, 0.6);
  }
  38%,
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(var(--haunt-rise, -60px)) scale(1);
  }
}

@keyframes haunt-sway {
  0%,
  100% {
    transform: translateX(-9%) rotate(-4deg);
  }
  50% {
    transform: translateX(9%) rotate(4deg);
  }
}

.comp-fx-haunt-eyes {
  position: absolute;
  display: flex;
  transform: translate(-50%, -50%);
  opacity: 0;
  pointer-events: none;
  animation: haunt-eyes 13s steps(1, end) infinite;
}

.comp-fx-haunt-eyes__eye {
  width: var(--haunt-eye, 3px);
  height: var(--haunt-eye, 3px);
  border-radius: 50%;
  background: var(--haunt-color);
  box-shadow: 0 0 4px var(--haunt-color);
}

@keyframes haunt-eyes {
  0%,
  100% {
    opacity: 0;
  }
  91% {
    opacity: 1;
  }
  99% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comp-fx-haunt-ghost,
  .comp-fx-haunt-ghost__sheet,
  .comp-fx-haunt-eyes {
    animation: none;
  }
}
</style>
