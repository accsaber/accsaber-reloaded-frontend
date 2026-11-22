<script setup lang="ts">
import TitleConstellationAura from '@/components/cosmetics/titles/TitleConstellationAura.vue'
import type { TitleAuraSpec, TitleAuraType } from '@/types/cosmetics/title'
import type { TitleAuraLinks } from '@/utils/cosmetics/titleAura'
import { computed, defineAsyncComponent, type Component } from 'vue'

const TitleAscensionAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleAscensionAura.vue'))
const TitleAuroraAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleAuroraAura.vue'))
const TitleBloodAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleBloodAura.vue'))
const TitleCoronaAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleCoronaAura.vue'))
const TitleCosmicAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleCosmicAura.vue'))
const TitleEarthAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleEarthAura.vue'))
const TitleFairyAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleFairyAura.vue'))
const TitleFlameAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleFlameAura.vue'))
const TitleGhostsAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleGhostsAura.vue'))
const TitleGraffitiAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleGraffitiAura.vue'))
const TitleHazeAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleHazeAura.vue'))
const TitleIceAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleIceAura.vue'))
const TitleInfernoAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleInfernoAura.vue'))
const TitleLanternAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleLanternAura.vue'))
const TitleLayerHost = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleLayerHost.vue'))
const TitleLightAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleLightAura.vue'))
const TitleRunesAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleRunesAura.vue'))
const TitleSigilAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleSigilAura.vue'))
const TitleSmokeAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleSmokeAura.vue'))
const TitleStormAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleStormAura.vue'))
const TitleVoidAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleVoidAura.vue'))
const TitleWaterAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleWaterAura.vue'))
const TitleWindAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleWindAura.vue'))
const TitleBloqsAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleBloqsAura.vue'))
const TitleSplatterAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleSplatterAura.vue'))
const TitleSpotlightAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleSpotlightAura.vue'))
const TitleStampsAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleStampsAura.vue'))
const TitleMeadowAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleMeadowAura.vue'))
const TitleHoardAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleHoardAura.vue'))
const TitleSeasonsAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleSeasonsAura.vue'))
const TitleCurioAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleCurioAura.vue'))
const TitleRadarAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleRadarAura.vue'))
const TitleWaypointsAura = defineAsyncComponent(() => import('@/components/cosmetics/titles/TitleWaypointsAura.vue'))

const AURA_RENDERERS: Record<TitleAuraType, Component> = {
  flame: TitleFlameAura,
  haze: TitleHazeAura,
  smoke: TitleSmokeAura,
  ascension: TitleAscensionAura,
  runes: TitleRunesAura,
  storm: TitleStormAura,
  sigil: TitleSigilAura,
  ghosts: TitleGhostsAura,
  lantern: TitleLanternAura,
  aurora: TitleAuroraAura,
  corona: TitleCoronaAura,
  earth: TitleEarthAura,
  wind: TitleWindAura,
  water: TitleWaterAura,
  fairy: TitleFairyAura,
  blood: TitleBloodAura,
  cosmic: TitleCosmicAura,
  light: TitleLightAura,
  void: TitleVoidAura,
  inferno: TitleInfernoAura,
  ice: TitleIceAura,
  bloqs: TitleBloqsAura,
  spotlight: TitleSpotlightAura,
  stamps: TitleStampsAura,
  meadow: TitleMeadowAura,
  hoard: TitleHoardAura,
  seasons: TitleSeasonsAura,
  curio: TitleCurioAura,
  radar: TitleRadarAura,
  waypoints: TitleWaypointsAura,
  splatter: TitleSplatterAura,
  constellation: TitleConstellationAura,
  graffiti: TitleGraffitiAura,
}

const LINKED: Partial<Record<TitleAuraType, keyof TitleAuraLinks>> = {
  ice: 'frost',
  blood: 'bleed',
  lantern: 'lantern',
  graffiti: 'boil',
  aurora: 'starlit',
}

const props = defineProps<{
  aura: TitleAuraSpec
  light: boolean
  links: TitleAuraLinks
}>()

const renderer = computed(() => AURA_RENDERERS[props.aura.type] ?? null)
const linked = computed(() => {
  const key = LINKED[props.aura.type]
  return key ? { [key]: props.links[key] } : {}
})
</script>

<template>
  <TitleLayerHost v-if="renderer">
    <component :is="renderer" :aura="aura" :light="light" v-bind="linked" />
  </TitleLayerHost>
</template>
