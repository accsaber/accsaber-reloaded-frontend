<script setup lang="ts">
import type { Composition } from '@/types/api/items'
import { asNumber, asString, ringGeometry, type EffectMeasure } from '@/utils/cosmetics/effects'
import type { TokenContext } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

const color = computed(() => asString(props.composition.color) ?? 'currentColor')
const widthPx = computed(() => asNumber(props.composition.widthPx) ?? 2)
const glow = computed(() => !!props.composition.glow)

const outline = computed(() => {
  const box = props.measure.box
  if (!box.w || !box.h) return null
  if (!props.measure.host?.ring) {
    const r = Math.min(box.w, box.h) * 0.06
    return { rect: { x: box.x, y: box.y, w: box.w, h: box.h, r }, d: null }
  }
  const pts = ringGeometry(props.measure).outer.pts
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
  return { rect: null, d }
})
</script>

<template>
  <svg v-if="outline" class="comp-border-outline" aria-hidden="true">
    <template v-if="outline.d">
      <path v-if="glow" :d="outline.d" fill="none" :stroke="color" :stroke-width="widthPx * 4" stroke-opacity="0.3" stroke-linejoin="round" />
      <path :d="outline.d" fill="none" :stroke="color" :stroke-width="widthPx" stroke-linejoin="round" />
    </template>
    <template v-else-if="outline.rect">
      <rect v-if="glow" :x="outline.rect.x" :y="outline.rect.y" :width="outline.rect.w" :height="outline.rect.h" :rx="outline.rect.r" fill="none" :stroke="color" :stroke-width="widthPx * 4" stroke-opacity="0.3" />
      <rect :x="outline.rect.x + widthPx / 2" :y="outline.rect.y + widthPx / 2" :width="outline.rect.w - widthPx" :height="outline.rect.h - widthPx" :rx="outline.rect.r" fill="none" :stroke="color" :stroke-width="widthPx" />
    </template>
  </svg>
</template>

<style scoped>
.comp-border-outline {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
</style>
