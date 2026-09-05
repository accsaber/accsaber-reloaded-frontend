<script setup lang="ts">
import { ABOVE_CONTENT_TYPES, BLEED_TYPES, EFFECT_REGISTRY } from '@/components/cosmetics/effects/registry'
import { useOverlayMeasure } from '@/composables/useOverlayMeasure'
import type { Composition, ItemTypeKey, ModifierEffectSpec } from '@/types/api/items'
import type { ContentBox, EffectHostContext, EffectMeasure } from '@/utils/cosmetics/effects'
import type { ShapeMask } from '@/utils/shapeSilhouette'
import type { TokenContext } from '@/utils/items'
import { computed, ref, watchEffect, type Component } from 'vue'

const props = defineProps<{
  spec: ModifierEffectSpec | null | undefined
  context?: TokenContext
  typeKey?: ItemTypeKey
  stackIndex?: number
  measureSelector?: string
  contentMask?: ShapeMask | null
  hideStatCounters?: boolean
  host?: EffectHostContext
}>()

const compositions = computed<Composition[]>(() => props.spec?.compositions ?? [])
const ctx = computed<TokenContext>(() => props.context ?? {})

const overlayEl = ref<HTMLElement | null>(null)
const { overlayBox, box } = useOverlayMeasure(overlayEl, () => props.measureSelector)

const stack = computed(() => Math.max(0, Math.min(3, Math.round(props.stackIndex ?? 0))))
const bleeds = computed(() => compositions.value.some((c) => BLEED_TYPES.has(c.type)))
const above = computed(() => compositions.value.some((c) => ABOVE_CONTENT_TYPES.has(c.type)))

const frame = computed<ContentBox | null>(() => {
  const m = props.contentMask
  const b = box.value
  if (!m || !b.w || !b.h) return null
  return { x: b.x + b.w * m.bounds.x, y: b.y + b.h * m.bounds.y, w: b.w * m.bounds.w, h: b.h * m.bounds.h }
})

const clipRect = computed<ContentBox>(() => {
  const o = overlayBox.value
  const f = frame.value
  if (!f) return { x: 0, y: 0, w: o.w, h: o.h }
  const x = Math.min(0, f.x)
  const y = Math.min(0, f.y)
  return { x, y, w: Math.max(o.w, f.x + f.w) - x, h: Math.max(o.h, f.y + f.h) - y }
})

const measure = computed<EffectMeasure>(() => ({
  overlayBox: overlayBox.value,
  box: box.value,
  stack: stack.value,
  typeKey: props.typeKey,
  host: props.host,
  frame: frame.value ?? undefined,
}))

interface EffectLayer {
  index: number
  composition: Composition
  renderer: Component
}

const layers = computed<EffectLayer[]>(() => {
  const out: EffectLayer[] = []
  compositions.value.forEach((composition, index) => {
    if (props.hideStatCounters && composition.type === 'stat_counter') return
    const renderer = EFFECT_REGISTRY[composition.type]
    if (renderer) out.push({ index, composition, renderer })
  })
  return out
})

const isUnmasked = (type: string) => BLEED_TYPES.has(type) || type === 'stat_counter'
const maskedLayers = computed(() =>
  props.contentMask ? layers.value.filter((l) => !isUnmasked(l.composition.type)) : layers.value,
)
const unmaskedLayers = computed(() =>
  props.contentMask ? layers.value.filter((l) => isUnmasked(l.composition.type)) : [],
)

const maskStyle = computed<Record<string, string> | undefined>(() => {
  const m = props.contentMask
  const f = frame.value
  if (!m || !f) return undefined
  const r = clipRect.value
  return {
    left: `${r.x}px`,
    top: `${r.y}px`,
    width: `${r.w}px`,
    height: `${r.h}px`,
    maskImage: m.url,
    webkitMaskImage: m.url,
    maskSize: `${f.w}px ${f.h}px`,
    webkitMaskSize: `${f.w}px ${f.h}px`,
    maskPosition: `${f.x - r.x}px ${f.y - r.y}px`,
    webkitMaskPosition: `${f.x - r.x}px ${f.y - r.y}px`,
    maskRepeat: 'no-repeat',
    webkitMaskRepeat: 'no-repeat',
  }
})

const originStyle = computed<Record<string, string> | undefined>(() => {
  if (!frame.value) return undefined
  const r = clipRect.value
  const o = overlayBox.value
  return { left: `${-r.x}px`, top: `${-r.y}px`, width: `${o.w}px`, height: `${o.h}px` }
})

if (import.meta.env.DEV) {
  watchEffect(() => {
    for (const c of compositions.value) {
      if (!EFFECT_REGISTRY[c.type]) console.warn(`[effects] unknown composition type: ${c.type}`)
    }
  })
}
</script>

<template>
  <div
    v-if="compositions.length"
    ref="overlayEl"
    class="modifier-overlay"
    :class="{ 'modifier-overlay--bleed': bleeds, 'modifier-overlay--masked': !!contentMask, 'modifier-overlay--above': above }"
    aria-hidden="true"
  >
    <div v-if="maskedLayers.length" class="modifier-overlay__clip" :style="maskStyle">
      <div class="modifier-overlay__origin" :style="originStyle">
        <component
          :is="layer.renderer"
          v-for="layer in maskedLayers"
          :key="layer.index"
          :composition="layer.composition"
          :ctx="ctx"
          :measure="measure"
        />
      </div>
    </div>
    <component
      :is="layer.renderer"
      v-for="layer in unmaskedLayers"
      :key="layer.index"
      :composition="layer.composition"
      :ctx="ctx"
      :measure="measure"
    />
  </div>
</template>

<style scoped>
.modifier-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
}

.modifier-overlay--bleed,
.modifier-overlay--masked {
  overflow: visible;
}

.modifier-overlay--above {
  z-index: 2;
}

.modifier-overlay__clip,
.modifier-overlay__origin {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
