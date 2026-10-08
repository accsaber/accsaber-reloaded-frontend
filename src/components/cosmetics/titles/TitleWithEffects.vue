<script setup lang="ts">
import ContentEffects from '@/components/cosmetics/effects/ContentEffects.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import TitleRenderer from '@/components/cosmetics/titles/TitleRenderer.vue'
import type { TitleValue } from '@/types/api/items'
import type { EffectHostContext } from '@/utils/cosmetics/effects'
import { annotateEffectLayerStacks, type EffectLayer } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  value: TitleValue
  effects?: EffectLayer[]
}>()

const layers = computed(() => annotateEffectLayerStacks(props.effects))
const host = computed<EffectHostContext>(() => ({ auraType: props.value.aura?.type }))
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
        <TitleRenderer :value="value" />
      </ContentEffects>
    </span>
  </span>
</template>

<style scoped>
.title-fx {
  position: relative;
  display: inline-block;
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
