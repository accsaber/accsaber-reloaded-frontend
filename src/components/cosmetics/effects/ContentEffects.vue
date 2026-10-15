<script setup lang="ts">
import FragmentedContent from '@/components/cosmetics/effects/FragmentedContent.vue'
import HauntedContent from '@/components/cosmetics/effects/HauntedContent.vue'
import WornContent from '@/components/cosmetics/effects/WornContent.vue'
import {
  type EffectLayer,
  readFragmentFromLayers,
  readHauntFromLayers,
  readWearFromLayers,
} from '@/utils/cosmetics/effectLayers'
import { computed, type FunctionalComponent } from 'vue'

const props = withDefaults(
  defineProps<{
    layers?: EffectLayer[] | null
    seed?: string
    fill?: boolean
    subtle?: boolean
    measureSelector?: string
  }>(),
  { fill: true, subtle: false, seed: '' },
)

const Passthrough: FunctionalComponent = (_, { slots }) => slots.default?.()

const fragment = computed(() => readFragmentFromLayers(props.layers))
const wear = computed(() => readWearFromLayers(props.layers))
const haunt = computed(() => readHauntFromLayers(props.layers))
const wearSeed = computed(() => `${wear.value?.seed ?? ''}:${props.seed}`)

const fragmentProps = computed(() =>
  fragment.value
    ? {
        spec: fragment.value.spec,
        stack: fragment.value.count,
        seed: fragment.value.seed,
        fill: props.fill,
        subtle: props.subtle,
        measureSelector: props.measureSelector,
      }
    : {},
)
</script>

<template>
  <component :is="fragment ? FragmentedContent : Passthrough" v-bind="fragmentProps">
    <WornContent :spec="wear?.spec ?? null" :seed="wearSeed" :fill="fill">
      <HauntedContent :spec="haunt?.spec ?? null" :fill="fill">
        <slot />
      </HauntedContent>
    </WornContent>
  </component>
</template>
