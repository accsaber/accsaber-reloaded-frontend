<script setup lang="ts">
import type { CampaignNodeShape } from '@/types/api/campaigns'
import { shapeCorners } from '@/utils/campaignLayout'
import { computed } from 'vue'

type ShapeState = 'locked' | 'available' | 'current' | 'cleared'

const props = withDefaults(defineProps<{
  cx: number
  cy: number
  size: number
  state?: ShapeState
  shape?: CampaignNodeShape
  accentColor?: string
  accentBand?: number
  innerBorder?: number
}>(), {
  state: 'available',
  shape: 'hex',
  accentColor: 'var(--accent)',
  accentBand: 4,
  innerBorder: 2,
})

const outerPoints = computed(() =>
  shapeCorners(props.shape, props.cx, props.cy, props.size + props.accentBand),
)

const innerPoints = computed(() =>
  shapeCorners(props.shape, props.cx, props.cy, props.size),
)

const outerRadius = computed(() => props.size + props.accentBand)

const FILLS: Record<ShapeState, string> = {
  locked: 'var(--bg-base)',
  available: 'var(--bg-surface)',
  current: 'var(--bg-elevated)',
  cleared: 'var(--bg-elevated)',
}

const fillVar = computed(() => FILLS[props.state])

const accentOpacity = computed(() => (props.state === 'available' ? 0.85 : 1))

const accentFill = computed(() => {
  if (props.state === 'locked') {
    return `color-mix(in srgb, ${props.accentColor} 40%, var(--bg-base))`
  }
  return props.accentColor
})

const bodyStroke = computed(() => {
  if (props.state === 'locked') return 'var(--text-tertiary)'
  return 'var(--text-primary)'
})
</script>

<template>
  <g class="campaign-shape" :class="`campaign-shape--${state}`">
    <template v-if="shape === 'circle'">
      <circle
        class="campaign-shape__accent"
        :cx="cx"
        :cy="cy"
        :r="outerRadius"
        :fill="accentFill"
        :opacity="accentOpacity"
      />
      <circle
        class="campaign-shape__body"
        :cx="cx"
        :cy="cy"
        :r="size"
        :fill="fillVar"
        :stroke="bodyStroke"
        :stroke-width="innerBorder"
      />
      <circle
        v-if="state === 'current'"
        class="campaign-shape__pulse"
        :cx="cx"
        :cy="cy"
        :r="outerRadius"
        fill="none"
        :stroke="accentColor"
        stroke-width="1.5"
      />
    </template>
    <template v-else>
      <polygon
        class="campaign-shape__accent"
        :points="outerPoints"
        :fill="accentFill"
        :opacity="accentOpacity"
      />
      <polygon
        class="campaign-shape__body"
        :points="innerPoints"
        :fill="fillVar"
        :stroke="bodyStroke"
        :stroke-width="innerBorder"
        stroke-linejoin="miter"
      />
      <polygon
        v-if="state === 'current'"
        class="campaign-shape__pulse"
        :points="outerPoints"
        fill="none"
        :stroke="accentColor"
        stroke-width="1.5"
      />
    </template>
  </g>
</template>

<style scoped>
.campaign-shape {
  transition: opacity 160ms ease-out;
}

.campaign-shape__pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: shape-pulse 2.4s ease-in-out infinite;
}

@keyframes shape-pulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.04); }
}

@media (prefers-reduced-motion: reduce) {
  .campaign-shape__pulse {
    animation: none;
    opacity: 0.8;
  }
}
</style>
