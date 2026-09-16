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

const THEME_CRACK_PX = 3.2

const spec = computed(() => readWearSpec(props.composition))
const theme = computed(() => props.measure.typeKey === 'theme')
const seed = computed(() => `${props.measure.typeKey ?? 'item'}:${props.measure.stack}`)
const box = computed(() => props.measure.box)
const unit = computed(() => Math.min(box.value.w, box.value.h))

const bites = computed<WearBite[]>(() => wearBites(seed.value, spec.value.chips))
const cracks = computed<WearCrack[]>(() => wearCracks(seed.value, bites.value, spec.value.cracks))

const crackWidth = computed(() => (theme.value ? THEME_CRACK_PX : Math.max(1.2, unit.value * 0.024)))
const shadowOffset = computed(() => (theme.value ? 1.5 : Math.max(0.6, unit.value * 0.008)))

function crackPx(c: WearCrack): string {
  return crackPath(c, box.value.w, box.value.h, crackWidth.value)
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
  <svg v-if="box.w > 0 && box.h > 0" class="comp-fx-wear" :class="{ 'comp-fx-wear--theme': theme }" :style="boxStyle" :viewBox="viewBox" aria-hidden="true">
    <g class="comp-fx-wear__light" :transform="`translate(${shadowOffset} ${shadowOffset})`">
      <path v-for="(c, i) in cracks" :key="`l${i}`" :d="crackPx(c)" />
    </g>
    <g class="comp-fx-wear__dark" :fill="spec.dark">
      <path v-for="(c, i) in cracks" :key="`d${i}`" :d="crackPx(c)" />
    </g>
    <template v-if="!theme">
      <rect x="0.5" y="0.5" :width="box.w - 1" :height="box.h - 1" fill="none" :stroke="spec.dark" stroke-width="1" opacity="0.4" />
      <path
        v-for="(d, i) in dents"
        :key="`n${i}`"
        :d="`M${px(d.x) + Math.cos(d.a) * d.r * unit},${py(d.y) + Math.sin(d.a) * d.r * unit} A${d.r * unit},${d.r * unit} 0 0 1 ${px(d.x) - Math.cos(d.a) * d.r * unit},${py(d.y) - Math.sin(d.a) * d.r * unit}`"
        fill="none"
        :stroke="spec.dark"
        :stroke-width="Math.max(1, unit * 0.014)"
        stroke-linecap="round"
        opacity="0.35"
      />
    </template>
  </svg>
</template>

<style scoped>
.comp-fx-wear {
  position: absolute;
  pointer-events: none;
  color: var(--text-primary);
}

.comp-fx-wear__light {
  fill: currentColor;
  opacity: 0.16;
}

.comp-fx-wear__dark {
  opacity: 0.85;
}

.comp-fx-wear--theme .comp-fx-wear__light {
  opacity: 0.22;
}
</style>
