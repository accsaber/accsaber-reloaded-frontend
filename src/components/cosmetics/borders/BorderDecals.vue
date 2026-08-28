<script setup lang="ts">
import type { BorderDecal } from '@/types/api/items'

defineProps<{
  decals: BorderDecal[]
}>()

function pulseVars(decal: BorderDecal): Record<string, string> | undefined {
  if (!decal.pulse) return undefined
  return {
    '--decal-pulse-period': `${decal.pulse.periodMs ?? 1100}ms`,
    '--decal-pulse-scale': String(1 + (decal.pulse.scaleAmp ?? 0.12)),
  }
}

function swingVars(decal: BorderDecal): Record<string, string> | undefined {
  if (!decal.swing) return undefined
  return {
    '--decal-swing-period': `${decal.swing.periodMs ?? 3000}ms`,
    '--decal-swing-deg': `${decal.swing.deg ?? 6}deg`,
  }
}
</script>

<template>
  <span class="border-decals" aria-hidden="true">
    <svg
      v-for="(decal, i) in decals"
      :key="i"
      class="border-decals__item"
      :viewBox="decal.viewBox"
      :style="{
        left: `${decal.xPct}%`,
        top: `${decal.yPct}%`,
        width: `${decal.sizePct}%`,
        opacity: decal.opacity ?? 1,
        transform: `translate(-50%, -50%) rotate(${decal.rotateDeg ?? 0}deg)`,
      }"
    >
      <g
        :class="{ 'border-decals__swing': !!decal.swing }"
        :style="swingVars(decal)"
      >
        <g
          :class="{ 'border-decals__pulse': !!decal.pulse }"
          :style="pulseVars(decal)"
        >
          <path
            v-for="(p, pi) in decal.paths"
            :key="pi"
            :d="p.d"
            :fill="p.fill ?? 'none'"
            :stroke="p.stroke"
            :stroke-width="p.strokeWidth"
            :stroke-linecap="p.strokeLinecap"
            :stroke-linejoin="p.strokeLinejoin"
            :stroke-dasharray="p.strokeDasharray"
            :stroke-opacity="p.strokeOpacity"
            :fill-opacity="p.fillOpacity"
            :transform="p.transform"
          />
        </g>
      </g>
    </svg>
  </span>
</template>

<style scoped>
.border-decals {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.border-decals__item {
  position: absolute;
  aspect-ratio: 1 / 1;
  height: auto;
  overflow: visible;
}

.border-decals__pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: decal-pulse var(--decal-pulse-period, 1100ms) ease-in-out infinite;
}

@keyframes decal-pulse {
  0%, 100% { transform: scale(1); }
  38% { transform: scale(var(--decal-pulse-scale, 1.12)); }
  55% { transform: scale(1.02); }
}

.border-decals__swing {
  transform-box: fill-box;
  transform-origin: 50% 0;
  animation: decal-swing var(--decal-swing-period, 3000ms) ease-in-out infinite;
}

@keyframes decal-swing {
  0%, 100% { transform: rotate(calc(-1 * var(--decal-swing-deg, 6deg))); }
  50% { transform: rotate(var(--decal-swing-deg, 6deg)); }
}

@media (prefers-reduced-motion: reduce) {
  .border-decals__pulse,
  .border-decals__swing {
    animation: none;
  }
}
</style>
