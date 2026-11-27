<script setup lang="ts">
import ContentEffects from '@/components/cosmetics/effects/ContentEffects.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import TitleRenderer from '@/components/cosmetics/titles/TitleRenderer.vue'
import type { TitleValue } from '@/types/cosmetics/title'
import type { EffectHostContext } from '@/utils/cosmetics/effects'
import { absorbEffects, annotateEffectLayerStacks, type EffectLayer } from '@/utils/cosmetics/effectLayers'
import { computed } from 'vue'

const props = defineProps<{
  value: TitleValue
  effects?: EffectLayer[]
}>()

const host = computed<EffectHostContext>(() => {
  const state = props.value.states[0]
  return { auraType: props.value.aura?.type, color: state?.color ?? state?.gradient?.stops[0]?.hex }
})
const fx = computed(() => absorbEffects(annotateEffectLayerStacks(props.effects), host.value))
const layers = computed(() => fx.value.layers)
const shown = computed<TitleValue>(() => {
  const { aura } = props.value
  return fx.value.hues && aura?.type === 'aurora' ? { ...props.value, aura: { ...aura, hues: fx.value.hues } } : props.value
})
</script>

<template>
  <span class="title-fx">
    <ModifierCompositions
      v-for="layer in layers"
      :key="layer.key"
      class="title-fx__layer"
      :spec="layer.spec"
      type-key="title"
      measure-selector=".title-renderer"
      :stack-index="layer.stackIndex"
      :host="host"
      hide-stat-counters
    />
    <span class="title-fx__text">
      <ContentEffects :layers="effects ?? null" :fill="false" subtle seed="title">
        <TitleRenderer :value="shown" />
      </ContentEffects>
    </span>
  </span>
</template>

<style scoped>
.title-fx {
  position: relative;
  display: inline-block;
  box-sizing: content-box;
  padding: 0.45em 0.4em;
  margin: -0.45em -0.4em;
}

.title-fx__layer {
  z-index: 0;
}

.title-fx__text {
  position: relative;
  z-index: 1;
}
</style>
