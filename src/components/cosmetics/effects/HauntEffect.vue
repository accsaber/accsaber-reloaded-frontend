<script setup lang="ts">
import type { Composition } from '@/types/api/items'
import { isFieldKey, type EffectMeasure } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { readHauntSpec } from '@/utils/items'
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
const VIEWPORT_PEAK = 0.28
const TILE_PEAK = 0.5

interface GhostRoll {
  x: number
  size: number
  speed: number
}

const spec = computed(() => readHauntSpec(props.composition))
const viewport = computed(() => !!props.measure.host?.viewport)
const field = computed(() => viewport.value || isFieldKey(props.measure.typeKey))
const box = computed(() => props.measure.box)
const ghostCount = computed(() => (viewport.value ? VIEWPORT_GHOSTS : TILE_GHOSTS))

const clipEl = ref<HTMLElement | null>(null)
const staticHost = ref(false)

function rollGhost(): GhostRoll {
  return { x: 0.06 + Math.random() * 0.88, size: 0.75 + Math.random() * 0.5, speed: 0.75 + Math.random() * 0.4 }
}

const ghostRolls = ref<GhostRoll[]>(Array.from({ length: VIEWPORT_GHOSTS }, rollGhost))

onMounted(() => {
  staticHost.value = !!clipEl.value?.closest('[data-fx-static]')
})

function isOwnAnimation(e: AnimationEvent): boolean {
  return e.target === e.currentTarget
}

function onGhostLoop(i: number, e: AnimationEvent) {
  if (isOwnAnimation(e)) ghostRolls.value[i] = rollGhost()
}

const clipStyle = computed(() => ({
  left: `${box.value.x}px`,
  top: `${box.value.y}px`,
  width: `${box.value.w}px`,
  height: `${box.value.h}px`,
}))

const ghostCycle = computed(() => spec.value.cycleS * (viewport.value ? 3 : 1.6))

const ghosts = computed(() => {
  const b = box.value
  const count = ghostCount.value
  const base = viewport.value ? VIEWPORT_GHOST_PX : Math.max(TILE_GHOST_MIN_PX, Math.min(b.w, b.h) * TILE_GHOST_PCT)
  const peak = spec.value.opacity * (viewport.value ? VIEWPORT_PEAK : TILE_PEAK)
  return ghostRolls.value.slice(0, count).map((roll, i) => {
    const size = base * roll.size
    const cycle = ghostCycle.value * roll.speed
    return {
      key: i,
      style: {
        '--haunt-color': spec.value.color,
        '--haunt-cycle': `${cycle}s`,
        '--haunt-rise': `${-(b.h + size * 2.6)}px`,
        '--haunt-peak': String(peak),
        left: `${b.w * roll.x}px`,
        top: `${b.h + size * 1.3}px`,
        width: `${size}px`,
        height: `${size * 1.2}px`,
        animationDelay: `${-(i / count) * ghostCycle.value - props.measure.stack * 1.7}s`,
      },
    }
  })
})
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
    <span
      v-for="g in ghosts"
      :key="g.key"
      class="comp-fx-haunt-ghost"
      :style="g.style"
      @animationiteration="onGhostLoop(g.key, $event)"
    >
      <svg class="comp-fx-haunt-ghost__sheet" viewBox="0 0 40 48">
        <path d="M20 3C10.5 3 6 12 6 22v23l4.7-4.4 4.6 4.4 4.7-4.4 4.7 4.4 4.6-4.4L34 45V22C34 12 29.5 3 20 3Z" />
        <ellipse class="comp-fx-haunt-ghost__hole" cx="14.5" cy="20" rx="2.6" ry="3.6" />
        <ellipse class="comp-fx-haunt-ghost__hole" cx="25.5" cy="20" rx="2.6" ry="3.6" />
        <ellipse class="comp-fx-haunt-ghost__hole" cx="20" cy="29.5" rx="2" ry="2.8" />
      </svg>
    </span>
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
  fill: rgb(0 0 0 / 0.45);
}

@keyframes haunt-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(0);
  }
  20% {
    opacity: var(--haunt-peak, 0.4);
  }
  65% {
    opacity: var(--haunt-peak, 0.4);
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

@media (prefers-reduced-motion: reduce) {
  .comp-fx-haunt-ghost,
  .comp-fx-haunt-ghost__sheet {
    animation: none;
  }
}
</style>
