<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import { ringGeometry, type EffectFrame, type EffectMeasure } from '@/utils/cosmetics/effects'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  measure: EffectMeasure
  pad: number
  draw: (frame: EffectFrame) => boolean | void
}>()

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

const paddedBox = computed(() => {
  const b = props.measure.box
  return { x: b.x + props.pad, y: b.y + props.pad, w: b.w, h: b.h }
})

const ring = computed(() => ringGeometry(props.measure, paddedBox.value))

const canvasStyle = computed(() => {
  const p = props.pad
  const o = props.measure.overlayBox
  return {
    left: `${-p}px`,
    top: `${-p}px`,
    width: `${o.w + p * 2}px`,
    height: `${o.h + p * 2}px`,
  }
})

let dirty = true

useElementCanvas(canvasRef, {
  init() {
    dirty = true
  },
  draw(g, w, h, nowMs, reduced) {
    if (dirty) g.clearRect(0, 0, w, h)
    dirty = false
    const box = paddedBox.value
    if (!box.w || !box.h) return
    dirty = props.draw({ g, t: nowMs / 1000, reduced, box, ring: ring.value }) !== false
  },
})
</script>

<template>
  <div class="comp-fx-region">
    <canvas ref="canvas" class="comp-fx-canvas" :style="canvasStyle" aria-hidden="true"></canvas>
  </div>
</template>

<style scoped>
.comp-fx-region {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.comp-fx-canvas {
  position: absolute;
  display: block;
  max-width: none;
  max-height: none;
}
</style>
