<script setup lang="ts">
import type { Composition } from '@/types/api/items'
import { useThemeStore } from '@/stores/theme'
import { asNumber, asString, isFieldKey, type EffectMeasure } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

const themeStore = useThemeStore()

interface MistConfig {
  color: string
  count: number
  heightPct: number
  driftSecs: number
  fromLeft: boolean
  intensity: number
}

function readMist(c: Composition, light: boolean): MistConfig {
  const dark = asString(c.color) ?? '#c9c4d8'
  return {
    color: light ? asString(c.lightColor) ?? '#6d6787' : dark,
    count: Math.max(3, Math.min(16, Math.round(asNumber(c.count) ?? 6))),
    heightPct: Math.max(10, Math.min(80, asNumber(c.heightPct) ?? 30)),
    driftSecs: Math.max(4, asNumber(c.driftSecs) ?? 14),
    fromLeft: asString(c.from) !== 'right',
    intensity: Math.max(0.1, Math.min(1, asNumber(c.intensity) ?? 0.8)),
  }
}

interface Puff {
  x: number
  y: number
  w: number
  h: number
  dur: number
  delay: number
  travel: number
  bob: number
  blur: number
  opacity: number
}

const light = computed(() => (props.measure.host?.base ?? themeStore.resolvedBase) === 'light')
const cfg = computed(() => readMist(props.composition, light.value))

const field = computed(() => isFieldKey(props.measure.typeKey))
const isTitle = computed(() => props.measure.typeKey === 'title')

const fogTop = computed(() => {
  const box = props.measure.box
  if (isTitle.value) return box.y + box.h * 0.55
  return box.y + box.h * (1 - cfg.value.heightPct / 100)
})

const fogBottom = computed(() => {
  const box = props.measure.box
  return box.y + box.h + (isTitle.value ? box.h * 0.3 : 0)
})

const puffs = computed<Puff[]>(() => {
  const box = props.measure.box
  if (!box.w || !box.h) return []
  const c = cfg.value
  const stack = props.measure.stack
  const fogH = Math.max(6, fogBottom.value - fogTop.value)
  const span = box.w
  const out: Puff[] = []
  for (let i = 0; i < c.count; i++) {
    const s = i * 13 + stack * 101 + 5
    const w = span * (field.value ? 0.22 + hash01(s) * 0.2 : 0.34 + hash01(s) * 0.3)
    const h = fogH * (0.55 + hash01(s + 1) * 0.5)
    const startX = c.fromLeft ? box.x - w * 0.6 : box.x + box.w - w * 0.4
    out.push({
      x: startX,
      y: fogBottom.value - h * (0.35 + hash01(s + 2) * 0.55),
      w,
      h,
      dur: c.driftSecs * (0.8 + hash01(s + 3) * 0.5),
      delay: hash01(s + 4) * c.driftSecs * 1.2,
      travel: (c.fromLeft ? 1 : -1) * (span + w * 0.2),
      bob: 2 + hash01(s + 5) * Math.min(8, fogH * 0.12),
      blur: Math.max(2, Math.min(10, fogH * 0.1)),
      opacity: c.intensity * (0.35 + hash01(s + 6) * 0.4),
    })
  }
  return out
})

const bedStyle = computed(() => {
  const box = props.measure.box
  const c = cfg.value
  return {
    left: `${box.x - 4}px`,
    width: `${box.w + 8}px`,
    top: `${fogTop.value}px`,
    height: `${Math.max(0, fogBottom.value - fogTop.value)}px`,
    '--mist-color': c.color,
    opacity: (c.intensity * (isTitle.value ? 0.25 : 0.42)).toFixed(2),
  }
})
</script>

<template>
  <div class="comp-fx-region">
    <span class="comp-fx-mist-bed" :style="bedStyle"></span>
    <span
      v-for="(p, j) in puffs"
      :key="j"
      class="comp-fx-mist-puff"
      :style="{
        left: `${p.x.toFixed(1)}px`,
        top: `${p.y.toFixed(1)}px`,
        width: `${p.w.toFixed(1)}px`,
        height: `${p.h.toFixed(1)}px`,
        '--mist-color': cfg.color,
        '--mdur': `${p.dur.toFixed(2)}s`,
        '--mdelay': `-${p.delay.toFixed(2)}s`,
        '--mtravel': `${p.travel.toFixed(1)}px`,
        '--mbob': `${p.bob.toFixed(1)}px`,
        '--mop': p.opacity.toFixed(2),
        filter: `blur(${p.blur.toFixed(1)}px)`,
      }"
    ></span>
  </div>
</template>

<style scoped>
.comp-fx-region {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%);
}

.comp-fx-mist-bed {
  position: absolute;
  background: linear-gradient(to bottom, transparent 0%, var(--mist-color) 70%, var(--mist-color) 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%);
  mix-blend-mode: var(--fx-blend, screen);
}

.comp-fx-mist-puff {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 60%,
    color-mix(in srgb, var(--mist-color) 85%, transparent) 0%,
    color-mix(in srgb, var(--mist-color) 40%, transparent) 45%,
    transparent 72%);
  mix-blend-mode: var(--fx-blend, screen);
  opacity: 0;
  animation: comp-fx-mist-drift var(--mdur, 14s) linear infinite;
  animation-delay: var(--mdelay, 0s);
}

@keyframes comp-fx-mist-drift {
  0%   { opacity: 0; transform: translate(0, 0); }
  12%  { opacity: var(--mop, 0.5); }
  35%  { transform: translate(calc(var(--mtravel) * 0.35), calc(-1 * var(--mbob, 4px))); }
  65%  { transform: translate(calc(var(--mtravel) * 0.65), var(--mbob, 4px)); }
  88%  { opacity: var(--mop, 0.5); }
  100% { opacity: 0; transform: translate(var(--mtravel), 0); }
}

@media (prefers-reduced-motion: reduce) {
  .comp-fx-mist-puff {
    animation: none;
    opacity: var(--mop, 0.5);
    transform: translate(calc(var(--mtravel) * 0.5), 0);
  }
}
</style>
