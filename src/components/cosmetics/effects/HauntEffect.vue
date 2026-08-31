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

const spec = computed(() => readHauntSpec(props.composition))
const theme = computed(() => props.measure.typeKey === 'theme')
const box = computed(() => props.measure.box)

const eyeAt = computed(() => {
  if (!theme.value) return { x: 0.5, y: 0.42, size: 3 }
  const k = props.measure.stack * 31 + 7
  return { x: 0.08 + hash01(k) * 0.84, y: 0.55 + hash01(k * 3) * 0.35, size: 5 }
})

const eyeStyle = computed(() => ({
  '--haunt-color': spec.value.color,
  '--haunt-eye': `${eyeAt.value.size}px`,
  left: `${box.value.x + box.value.w * eyeAt.value.x}px`,
  top: `${box.value.y + box.value.h * eyeAt.value.y}px`,
  gap: `${theme.value ? 14 : Math.max(3, box.value.w * 0.06)}px`,
  animationDelay: `${-props.measure.stack * 4}s`,
}))

const veilStyle = computed(() => ({
  '--haunt-color': spec.value.color,
  '--haunt-cycle': `${spec.value.cycleS}s`,
  '--haunt-veil': String(spec.value.opacity * 0.2),
}))
</script>

<template>
  <span v-if="theme" class="comp-fx-haunt-veil" :style="veilStyle" aria-hidden="true" />
  <span v-if="spec.eyes && box.w > 0 && box.h > 0" class="comp-fx-haunt-eyes" :style="eyeStyle" aria-hidden="true">
    <span class="comp-fx-haunt-eyes__eye" />
    <span class="comp-fx-haunt-eyes__eye" />
  </span>
</template>

<style scoped>
.comp-fx-haunt-veil {
  position: absolute;
  inset: 0;
  background: var(--haunt-color);
  opacity: 0;
  pointer-events: none;
  animation: haunt-veil var(--haunt-cycle, 8s) linear infinite;
}

@keyframes haunt-veil {
  0%,
  100% {
    opacity: 0;
  }
  4% {
    opacity: var(--haunt-veil, 0.14);
  }
  33% {
    opacity: var(--haunt-veil, 0.14);
  }
  37% {
    opacity: 0;
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
  .comp-fx-haunt-veil,
  .comp-fx-haunt-eyes {
    animation: none;
  }
}
</style>
