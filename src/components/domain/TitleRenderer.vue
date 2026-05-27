<script setup lang="ts">
import { useTimeline } from '@/composables/useTimeline'
import type { TitleStateValue, TitleValue } from '@/types/api/items'
import { darken } from '@/utils/color'
import {
  gradientToCss,
  interpolateTitleState,
  isAnimated,
  pickInterpolatedState,
} from '@/utils/items'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  value: TitleValue
}>()

const reducedMotion = ref(false)
let motionMedia: MediaQueryList | null = null
let motionMediaHandler: (() => void) | null = null

onMounted(() => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionMedia.matches
  motionMediaHandler = () => { reducedMotion.value = motionMedia!.matches }
  if (typeof motionMedia.addEventListener === 'function') {
    motionMedia.addEventListener('change', motionMediaHandler)
  }
})

onUnmounted(() => {
  if (motionMedia && motionMediaHandler && typeof motionMedia.removeEventListener === 'function') {
    motionMedia.removeEventListener('change', motionMediaHandler)
  }
  motionMedia = null
  motionMediaHandler = null
})

const isPixelFont = computed(() => props.value.font === 'pixel_8bit')

const needsTimeline = computed(() => {
  if (isAnimated(props.value)) return true
  if (reducedMotion.value) return false
  return props.value.states.some((s) => s.glisten?.enabled)
})

const { tMs } = useTimeline({ active: () => needsTimeline.value })

const state = computed<TitleStateValue>(() =>
  pickInterpolatedState(
    { states: props.value.states, durationMs: props.value.durationMs, loop: props.value.loop },
    tMs.value,
    interpolateTitleState,
  ),
)

const textStyle = computed(() => {
  const out: Record<string, string> = {}
  if (state.value.color) out.color = state.value.color
  if (state.value.fontWeight) out.fontWeight = String(state.value.fontWeight)
  if (state.value.fontStyle) out.fontStyle = state.value.fontStyle
  if (state.value.letterSpacingPx != null) out.letterSpacing = `${state.value.letterSpacingPx}px`
  if (isPixelFont.value && state.value.color) {
    const shadow = darken(state.value.color, 0.6)
    out.textShadow = `1px 1px 0 ${shadow}, 0 1px 0 ${shadow}, 1px 0 0 ${shadow}`
  }
  return out
})

const legacyGradientStyle = computed(() => {
  if (isPixelFont.value) return undefined
  if (!state.value.gradient) return undefined
  return {
    background: gradientToCss(state.value.gradient),
    webkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  } as Record<string, string>
})

const BAND_WIDTH_PCT = 16

const glistenPhase = computed<{ active: boolean; leftPct: number; highlight: string }>(() => {
  const g = state.value.glisten
  if (!g?.enabled || reducedMotion.value) return { active: false, leftPct: 0, highlight: '#ffffff' }
  const interval = g.intervalMs ?? 5000
  const duration = g.durationMs ?? 800
  const cyclePos = tMs.value % interval
  if (cyclePos > duration) return { active: false, leftPct: 0, highlight: g.highlight ?? '#ffffff' }
  const progress = cyclePos / duration
  const leftPct = -BAND_WIDTH_PCT + (100 + BAND_WIDTH_PCT * 2) * progress
  return { active: true, leftPct, highlight: g.highlight ?? '#ffffff' }
})

const glistenClipStyle = computed<Record<string, string> | undefined>(() => {
  const p = glistenPhase.value
  if (!p.active) return undefined
  const right = 100 - p.leftPct - BAND_WIDTH_PCT
  return {
    color: p.highlight,
    clipPath: `inset(0 ${right}% 0 ${p.leftPct}%)`,
    WebkitClipPath: `inset(0 ${right}% 0 ${p.leftPct}%)`,
  }
})
</script>

<template>
  <span
    class="title-renderer"
    :class="{ 'title-renderer--pixel': isPixelFont }"
    :style="textStyle"
  >
    <span class="title-renderer__text" :style="legacyGradientStyle">{{ value.text }}</span>
    <span
      v-if="glistenClipStyle"
      class="title-renderer__glint"
      :style="glistenClipStyle"
      aria-hidden="true"
    >{{ value.text }}</span>
  </span>
</template>

<style scoped>
.title-renderer {
  position: relative;
  display: inline-block;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.title-renderer--pixel {
  font-family: 'Silkscreen', ui-monospace, monospace;
  text-transform: none;
  letter-spacing: 0.02em;
  image-rendering: pixelated;
}

.title-renderer__text {
  position: relative;
  z-index: 1;
}

.title-renderer__glint {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  white-space: inherit;
}
</style>
