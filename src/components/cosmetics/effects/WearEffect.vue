<script setup lang="ts">
import type { Composition } from '@/types/api/items'
import { type EffectMeasure } from '@/utils/cosmetics/effects'
import { crackPath, wearBites, wearCracks, type WearBite, type WearCrack } from '@/utils/cosmetics/wear'
import { readWearSpec, type TokenContext } from '@/utils/items'
import { hash01 } from '@/utils/random'
import { computed } from 'vue'

const props = defineProps<{
  composition: Composition
  ctx: TokenContext
  measure: EffectMeasure
}>()

const spec = computed(() => readWearSpec(props.composition))
const theme = computed(() => props.measure.typeKey === 'theme')
const seed = computed(() => `${props.measure.typeKey ?? 'item'}:${props.measure.stack}`)
const box = computed(() => props.measure.box)
const unit = computed(() => Math.min(box.value.w, box.value.h))

const bites = computed<WearBite[]>(() => wearBites(seed.value, spec.value.chips))
const cracks = computed<WearCrack[]>(() => wearCracks(seed.value, bites.value, spec.value.cracks))

function crackShadow(c: WearCrack): string {
  const off = unit.value * 0.006
  return 'M' + c.points.map(([x, y]) => `${x * box.value.w + off},${y * box.value.h + off}`).join(' L')
}

const dents = computed(() => {
  const s = seed.value.length * 17
  return Array.from({ length: 3 }, (_, i) => ({
    x: 0.15 + hash01(s + i * 5) * 0.7,
    y: 0.15 + hash01(s + i * 9) * 0.7,
    r: 0.04 + hash01(s + i * 13) * 0.04,
    a: hash01(s + i * 3) * Math.PI * 2,
  }))
})

const viewBox = computed(() => `0 0 ${Math.max(1, box.value.w)} ${Math.max(1, box.value.h)}`)
const boxStyle = computed(() => ({ left: `${box.value.x}px`, top: `${box.value.y}px`, width: `${box.value.w}px`, height: `${box.value.h}px` }))
const px = (u: number) => u * box.value.w
const py = (u: number) => u * box.value.h
</script>

<template>
  <svg v-if="theme && box.w > 0 && box.h > 0" class="comp-fx-wear comp-fx-wear--theme" :style="boxStyle" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
    <path v-for="(c, i) in cracks" :key="`s${i}`" :d="crackPath(c)" class="comp-fx-wear__crack-shadow" :stroke="spec.dark" />
    <path v-for="(c, i) in cracks" :key="`h${i}`" :d="crackPath(c)" class="comp-fx-wear__crack-light" />
  </svg>
  <svg v-else-if="box.w > 0 && box.h > 0" class="comp-fx-wear" :style="boxStyle" :viewBox="viewBox" aria-hidden="true">
    <rect x="0.5" y="0.5" :width="box.w - 1" :height="box.h - 1" fill="none" :stroke="spec.dark" stroke-width="1" opacity="0.4" />
    <path
      v-for="(c, i) in cracks"
      :key="`c${i}`"
      :d="crackShadow(c)"
      fill="none"
      :stroke="spec.dark"
      :stroke-width="Math.max(0.8, unit * 0.012)"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.55"
    />
    <path
      v-for="(d, i) in dents"
      :key="`d${i}`"
      :d="`M${px(d.x) + Math.cos(d.a) * d.r * unit},${py(d.y) + Math.sin(d.a) * d.r * unit} A${d.r * unit},${d.r * unit} 0 0 1 ${px(d.x) - Math.cos(d.a) * d.r * unit},${py(d.y) - Math.sin(d.a) * d.r * unit}`"
      fill="none"
      :stroke="spec.dark"
      :stroke-width="Math.max(1, unit * 0.014)"
      stroke-linecap="round"
      opacity="0.35"
    />
  </svg>
</template>

<style scoped>
.comp-fx-wear {
  position: absolute;
  pointer-events: none;
}

.comp-fx-wear--theme {
  color: var(--text-primary);
}

.comp-fx-wear__crack-shadow,
.comp-fx-wear__crack-light {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.comp-fx-wear__crack-shadow {
  stroke-width: 3px;
  opacity: 0.8;
}

.comp-fx-wear__crack-light {
  stroke: currentColor;
  stroke-width: 1px;
  opacity: 0.18;
  transform: translate(1px, 1px);
}
</style>
