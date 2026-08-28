<script setup lang="ts">
import type { Composition } from '@/types/api/items'
import type { EffectMeasure } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { readHauntSpec } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

const spec = computed(() => readHauntSpec(props.composition))
const box = computed(() => props.measure.box)

const eyeStyle = computed(() => ({
  '--haunt-color': spec.value.color,
  left: `${box.value.x + box.value.w * 0.5}px`,
  top: `${box.value.y + box.value.h * 0.42}px`,
  gap: `${Math.max(3, box.value.w * 0.06)}px`,
  animationDelay: `${-props.measure.stack * 4}s`,
}))
</script>

<template>
  <span v-if="spec.eyes && box.w > 0 && box.h > 0" class="comp-fx-haunt-eyes" :style="eyeStyle" aria-hidden="true">
    <span class="comp-fx-haunt-eyes__eye" />
    <span class="comp-fx-haunt-eyes__eye" />
  </span>
</template>

<style scoped>
.comp-fx-haunt-eyes {
  position: absolute;
  display: flex;
  transform: translate(-50%, -50%);
  opacity: 0;
  pointer-events: none;
  animation: haunt-eyes 13s steps(1, end) infinite;
}

.comp-fx-haunt-eyes__eye {
  width: 3px;
  height: 3px;
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
  .comp-fx-haunt-eyes {
    animation: none;
  }
}
</style>
