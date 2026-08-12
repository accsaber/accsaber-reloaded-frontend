<script setup lang="ts">
import type { CrateIconLayer, CrateIconPath, CrateIconValue } from '@/types/api/items'
import { computed } from 'vue'

const props = defineProps<{
  value?: CrateIconValue | null
}>()

const glowId = `crate-glow-${Math.random().toString(36).slice(2, 9)}`

const styleVars = computed<Record<string, string> | undefined>(() => {
  const v = props.value
  if (!v) return undefined
  const out: Record<string, string> = {}
  if (v.strap) out['--crate-strap'] = v.strap
  if (v.latch) out['--crate-latch'] = v.latch
  if (v.seam) out['--crate-seam'] = v.seam
  return Object.keys(out).length ? out : undefined
})

const glow = computed(() => props.value?.glow ?? null)

const layers = computed<Record<CrateIconLayer, CrateIconPath[]>>(() => {
  const out: Record<CrateIconLayer, CrateIconPath[]> = { back: [], lid: [], panel: [], front: [] }
  for (const p of props.value?.paths ?? []) out[p.layer ?? 'panel'].push(p)
  return out
})

function pathFill(p: CrateIconPath): string {
  if (!p.fill) return 'none'
  return p.fill === 'glow' ? `url(#${glowId})` : p.fill
}
</script>

<template>
  <svg class="crate-icon" viewBox="0 0 24 24" :style="styleVars" aria-hidden="true">
    <defs v-if="glow">
      <radialGradient
        :id="glowId"
        gradientUnits="userSpaceOnUse"
        :cx="glow.cx"
        :cy="glow.cy"
        :r="glow.r"
      >
        <stop v-for="(s, i) in glow.stops" :key="i" :offset="s.offset" :stop-color="s.color" />
      </radialGradient>
    </defs>

    <rect class="crate-icon__body" x="3" y="4.5" width="18" height="15" rx="1.6" />

    <path
      v-for="(p, i) in layers.back"
      :key="`back-${i}`"
      :d="p.d"
      :fill="pathFill(p)"
      :stroke="p.stroke"
      :stroke-width="p.strokeWidth"
      :fill-opacity="p.fillOpacity"
      :stroke-opacity="p.strokeOpacity"
      :transform="p.transform"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <path class="crate-icon__lid" d="M3,9 L3,6.1 Q3,4.5 4.6,4.5 L19.4,4.5 Q21,4.5 21,6.1 L21,9 Z" />

    <path
      v-for="(p, i) in layers.lid"
      :key="`lid-${i}`"
      :d="p.d"
      :fill="pathFill(p)"
      :stroke="p.stroke"
      :stroke-width="p.strokeWidth"
      :fill-opacity="p.fillOpacity"
      :stroke-opacity="p.strokeOpacity"
      :transform="p.transform"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <line class="crate-icon__seam" x1="3.4" y1="9" x2="20.6" y2="9" />

    <path
      v-for="(p, i) in layers.panel"
      :key="`panel-${i}`"
      :d="p.d"
      :fill="pathFill(p)"
      :stroke="p.stroke"
      :stroke-width="p.strokeWidth"
      :fill-opacity="p.fillOpacity"
      :stroke-opacity="p.strokeOpacity"
      :transform="p.transform"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <rect class="crate-icon__strap" x="6.05" y="5.4" width="1.9" height="13.2" rx="0.3" />
    <rect class="crate-icon__strap" x="16.05" y="5.4" width="1.9" height="13.2" rx="0.3" />
    <rect class="crate-icon__groove" x="6.85" y="5.4" width="0.3" height="13.2" />
    <rect class="crate-icon__groove" x="16.85" y="5.4" width="0.3" height="13.2" />
    <circle class="crate-icon__rivet" cx="7" cy="6.3" r="0.28" />
    <circle class="crate-icon__rivet" cx="7" cy="17.3" r="0.28" />
    <circle class="crate-icon__rivet" cx="17" cy="6.3" r="0.28" />
    <circle class="crate-icon__rivet" cx="17" cy="17.3" r="0.28" />
    <rect class="crate-icon__latch" x="5.5" y="8.35" width="3" height="1.3" rx="0.25" />
    <rect class="crate-icon__latch" x="15.5" y="8.35" width="3" height="1.3" rx="0.25" />
    <rect class="crate-icon__keyhole" x="6.85" y="8.6" width="0.3" height="0.8" />
    <rect class="crate-icon__keyhole" x="16.85" y="8.6" width="0.3" height="0.8" />

    <path
      v-for="(p, i) in layers.front"
      :key="`front-${i}`"
      :d="p.d"
      :fill="pathFill(p)"
      :stroke="p.stroke"
      :stroke-width="p.strokeWidth"
      :fill-opacity="p.fillOpacity"
      :stroke-opacity="p.strokeOpacity"
      :transform="p.transform"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <rect class="crate-icon__frame" x="3" y="4.5" width="18" height="15" rx="1.6" />
  </svg>
</template>

<style scoped>
.crate-icon {
  overflow: visible;
  --_strap: var(--crate-strap, color-mix(in srgb, var(--tier-gold) 65%, var(--tier-bronze)));
  --_latch: var(--crate-latch, var(--tier-gold));
  --_fitting-dark: color-mix(in srgb, var(--_strap) 62%, black);
}

.crate-icon__body {
  fill: var(--bg-elevated);
}

.crate-icon__lid {
  fill: var(--bg-overlay);
}

.crate-icon__seam {
  stroke: var(--crate-seam, var(--bg-base));
  stroke-width: 0.9;
  stroke-linecap: round;
}

.crate-icon__strap {
  fill: var(--_strap);
}

.crate-icon__groove,
.crate-icon__keyhole {
  fill: var(--_fitting-dark);
}

.crate-icon__rivet {
  fill: color-mix(in srgb, var(--_latch) 65%, white);
}

.crate-icon__latch {
  fill: var(--_latch);
}

.crate-icon__frame {
  fill: none;
  stroke: var(--text-secondary);
  stroke-width: 1;
  stroke-linejoin: round;
}
</style>
