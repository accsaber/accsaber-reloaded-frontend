<script setup lang="ts">
import TitleAscensionAura from '@/components/cosmetics/titles/TitleAscensionAura.vue'
import TitleBloodAura from '@/components/cosmetics/titles/TitleBloodAura.vue'
import TitleCoronaAura from '@/components/cosmetics/titles/TitleCoronaAura.vue'
import TitleCosmicAura from '@/components/cosmetics/titles/TitleCosmicAura.vue'
import TitleEarthAura from '@/components/cosmetics/titles/TitleEarthAura.vue'
import TitleFairyAura from '@/components/cosmetics/titles/TitleFairyAura.vue'
import TitleFlameAura from '@/components/cosmetics/titles/TitleFlameAura.vue'
import TitleGhostsAura from '@/components/cosmetics/titles/TitleGhostsAura.vue'
import TitleHazeAura from '@/components/cosmetics/titles/TitleHazeAura.vue'
import TitleIceAura from '@/components/cosmetics/titles/TitleIceAura.vue'
import TitleInfernoAura from '@/components/cosmetics/titles/TitleInfernoAura.vue'
import TitleLanternAura from '@/components/cosmetics/titles/TitleLanternAura.vue'
import TitleLayerHost from '@/components/cosmetics/titles/TitleLayerHost.vue'
import TitleLightAura from '@/components/cosmetics/titles/TitleLightAura.vue'
import TitleRunesAura from '@/components/cosmetics/titles/TitleRunesAura.vue'
import TitleSigilAura from '@/components/cosmetics/titles/TitleSigilAura.vue'
import TitleSmokeAura from '@/components/cosmetics/titles/TitleSmokeAura.vue'
import TitleStormAura from '@/components/cosmetics/titles/TitleStormAura.vue'
import TitleVoidAura from '@/components/cosmetics/titles/TitleVoidAura.vue'
import TitleWaterAura from '@/components/cosmetics/titles/TitleWaterAura.vue'
import TitleWindAura from '@/components/cosmetics/titles/TitleWindAura.vue'
import TitleBloqsAura from '@/components/cosmetics/titles/TitleBloqsAura.vue'
import TitleSpotlightAura from '@/components/cosmetics/titles/TitleSpotlightAura.vue'
import TitleStampsAura from '@/components/cosmetics/titles/TitleStampsAura.vue'
import TitleMeadowAura from '@/components/cosmetics/titles/TitleMeadowAura.vue'
import TitleHoardAura from '@/components/cosmetics/titles/TitleHoardAura.vue'
import TitleSeasonsAura from '@/components/cosmetics/titles/TitleSeasonsAura.vue'
import TitleCurioAura from '@/components/cosmetics/titles/TitleCurioAura.vue'
import TitleRadarAura from '@/components/cosmetics/titles/TitleRadarAura.vue'
import TitleWaypointsAura from '@/components/cosmetics/titles/TitleWaypointsAura.vue'
import type { TitleAuraSpec, TitleAuraType } from '@/types/api/items'
import type { TitleAuraLinks } from '@/utils/cosmetics/titleAura'
import { computed, type Component } from 'vue'

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
}

const LINKED: Partial<Record<TitleAuraType, keyof TitleAuraLinks>> = {
  ice: 'frost',
  blood: 'bleed',
  lantern: 'lantern',
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
