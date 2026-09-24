<script setup lang="ts">
import type { Composition } from '@/types/api/items'
import { ringGeometry, ringPathD, type EffectMeasure } from '@/utils/cosmetics/effects'
import { crackPath, seedNumber, wearBites, wearCracks, type WearBite, type WearCrack } from '@/utils/cosmetics/wear'
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
const theme = computed(() => !!props.measure.host?.viewport)
const seed = computed(() => `${props.measure.typeKey ?? 'item'}:${props.measure.stack}`)
const box = computed(() => props.measure.box)
const unit = computed(() => Math.min(box.value.w, box.value.h))

const bites = computed<WearBite[]>(() => wearBites(seed.value, spec.value.chips))
const cracks = computed<WearCrack[]>(() => wearCracks(seed.value, bites.value, spec.value.cracks))

const crackWidth = computed(() => (theme.value ? THEME_CRACK_PX : Math.max(1.2, unit.value * 0.024)))
const shadowOffset = computed(() => (theme.value ? 1.5 : Math.max(0.6, unit.value * 0.008)))

const crackPaths = computed(() => cracks.value.map((c) => crackPath(c, box.value.w, box.value.h, crackWidth.value)))

const rimPath = computed(() =>
  ringPathD(ringGeometry(props.measure, { x: 0, y: 0, w: box.value.w, h: box.value.h }).outer),
)

const dentPaths = computed(() => {
  const s = seedNumber(seed.value)
  const u = unit.value
  return Array.from({ length: 3 }, (_, i) => {
    const x = (0.15 + hash01(s + i * 5) * 0.7) * box.value.w
    const y = (0.15 + hash01(s + i * 9) * 0.7) * box.value.h
    const r = (0.04 + hash01(s + i * 13) * 0.04) * u
    const a = hash01(s + i * 3) * Math.PI * 2
    const dx = Math.cos(a) * r
    const dy = Math.sin(a) * r
    return `M${x + dx},${y + dy} A${r},${r} 0 0 1 ${x - dx},${y - dy}`
  })
})

const viewBox = computed(() => `0 0 ${Math.max(1, box.value.w)} ${Math.max(1, box.value.h)}`)
const boxStyle = computed(() => ({ left: `${box.value.x}px`, top: `${box.value.y}px`, width: `${box.value.w}px`, height: `${box.value.h}px` }))
</script>

<template>
  <svg v-if="measure.typeKey !== 'title' && box.w > 0 && box.h > 0" class="comp-fx-wear" :class="{ 'comp-fx-wear--theme': theme }" :style="boxStyle" :viewBox="viewBox" aria-hidden="true">
    <g class="comp-fx-wear__light" :transform="`translate(${shadowOffset} ${shadowOffset})`">
      <path v-for="(d, i) in crackPaths" :key="`l${i}`" :d="d" />
    </g>
    <g class="comp-fx-wear__dark" :fill="spec.dark">
      <path v-for="(d, i) in crackPaths" :key="`d${i}`" :d="d" />
    </g>
    <template v-if="!theme">
      <path :d="rimPath" fill="none" :stroke="spec.dark" stroke-width="2" opacity="0.4" />
      <path
        v-for="(d, i) in dentPaths"
        :key="`n${i}`"
        :d="d"
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
