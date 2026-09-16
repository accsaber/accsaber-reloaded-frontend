<script setup lang="ts">
import type { Composition } from '@/types/api/items'
import { isFieldKey, type EffectMeasure } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { readHauntSpec } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

const VIEWPORT_GHOSTS = 5
const VIEWPORT_GHOST_PX = 44
const TILE_GHOSTS = 3
const TILE_GHOST_PCT = 0.16
const TILE_GHOST_MIN_PX = 8

const spec = computed(() => readHauntSpec(props.composition))
const viewport = computed(() => !!props.measure.host?.viewport)
const field = computed(() => viewport.value || isFieldKey(props.measure.typeKey))
const box = computed(() => props.measure.box)
const seedKey = computed(() => props.measure.stack * 31 + 7)

const clipEl = ref<HTMLElement | null>(null)
const staticHost = ref(false)

onMounted(() => {
  staticHost.value = !!clipEl.value?.closest('[data-fx-static]')
})

const clipStyle = computed(() => ({
  left: `${box.value.x}px`,
  top: `${box.value.y}px`,
  width: `${box.value.w}px`,
  height: `${box.value.h}px`,
}))

const ghosts = computed(() => {
  const b = box.value
  const count = viewport.value ? VIEWPORT_GHOSTS : TILE_GHOSTS
  const base = viewport.value ? VIEWPORT_GHOST_PX : Math.max(TILE_GHOST_MIN_PX, Math.min(b.w, b.h) * TILE_GHOST_PCT)
  const slowest = spec.value.cycleS * (viewport.value ? 3 : 1.6)
  return Array.from({ length: count }, (_, i) => {
    const k = seedKey.value + i * 131
    const size = base * (0.75 + hash01(k * 3) * 0.5)
    const cycle = slowest * (0.75 + hash01(k * 5) * 0.4)
    const lane = (i + 0.2 + hash01(k * 7) * 0.6) / count
    return {
      key: i,
      style: {
        '--haunt-color': spec.value.color,
        '--haunt-cycle': `${cycle}s`,
        '--haunt-rise': `${-(b.h + size * 2.6)}px`,
        '--haunt-peak': String(spec.value.opacity * (viewport.value ? 0.5 : 0.8)),
        left: `${b.w * lane}px`,
        top: `${b.h + size * 1.3}px`,
        width: `${size}px`,
        height: `${size * 1.2}px`,
        animationDelay: `${-(i / count) * cycle - props.measure.stack * 1.7}s`,
      },
    }
  })
})

const eyeAt = computed(() => {
  const b = box.value
  if (viewport.value) {
    return { x: 0.08 + hash01(seedKey.value) * 0.84, y: 0.55 + hash01(seedKey.value * 3) * 0.35, size: 5, gap: 14 }
  }
  const size = field.value ? Math.max(3, Math.min(b.w, b.h) * 0.05) : 3
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
  <span
    v-if="field && box.w > 0 && box.h > 0"
    ref="clipEl"
    class="comp-fx-haunt-clip"
    :class="{ 'comp-fx-haunt-clip--off': staticHost }"
    :style="clipStyle"
    aria-hidden="true"
  >
    <span v-for="g in ghosts" :key="g.key" class="comp-fx-haunt-ghost" :style="g.style">
      <svg class="comp-fx-haunt-ghost__sheet" viewBox="0 0 40 48">
        <path d="M20 3C10.5 3 6 12 6 22v23l4.7-4.4 4.6 4.4 4.7-4.4 4.7 4.4 4.6-4.4L34 45V22C34 12 29.5 3 20 3Z" />
        <ellipse class="comp-fx-haunt-ghost__hole" cx="14.5" cy="20" rx="2.6" ry="3.6" />
        <ellipse class="comp-fx-haunt-ghost__hole" cx="25.5" cy="20" rx="2.6" ry="3.6" />
        <ellipse class="comp-fx-haunt-ghost__hole" cx="20" cy="29.5" rx="2" ry="2.8" />
      </svg>
    </span>
  </span>
  <span v-if="spec.eyes && box.w > 0 && box.h > 0" class="comp-fx-haunt-eyes" :style="eyeStyle" aria-hidden="true">
    <span class="comp-fx-haunt-eyes__eye" />
    <span class="comp-fx-haunt-eyes__eye" />
  </span>
</template>

<style scoped>
.comp-fx-haunt-clip {
  position: absolute;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.comp-fx-haunt-clip--off {
  display: none;
}

.comp-fx-haunt-ghost {
  position: absolute;
  opacity: 0;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: haunt-rise var(--haunt-cycle, 8s) linear infinite;
}

.comp-fx-haunt-ghost__sheet {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  fill: var(--haunt-color);
  animation: haunt-sway 2.6s ease-in-out infinite;
}

.comp-fx-haunt-ghost__hole {
  fill: rgb(0 0 0 / 0.55);
}

@keyframes haunt-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(0);
  }
  15% {
    opacity: var(--haunt-peak, 0.6);
  }
  75% {
    opacity: var(--haunt-peak, 0.6);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(var(--haunt-rise, -60px));
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
