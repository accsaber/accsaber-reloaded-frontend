<script setup lang="ts">
import type { ThumbnailScene } from '@/types/cosmetics/background'
import { defineAsyncComponent, type Component } from 'vue'

const TorchlitScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/TorchlitScene.vue'))
const HallwayScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/HallwayScene.vue'))
const GraveyardScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/GraveyardScene.vue'))
const PumpkinPatchScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/PumpkinPatchScene.vue'))
const BorealisScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/BorealisScene.vue'))
const FullMoonScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/FullMoonScene.vue'))
const FacetVaultScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/FacetVaultScene.vue'))
const FusionScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/FusionScene.vue'))
const GroveScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/GroveScene.vue'))
const MonumentScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/MonumentScene.vue'))
const SanctumScene = defineAsyncComponent(() => import('@/components/cosmetics/thumbnails/SanctumScene.vue'))

const SCENE_RENDERERS: Record<ThumbnailScene['type'], Component> = {
  facet_vault: FacetVaultScene,
  grove: GroveScene,
  sanctum: SanctumScene,
  monument: MonumentScene,
  torchlit: TorchlitScene,
  fusion: FusionScene,
  hallway: HallwayScene,
  graveyard: GraveyardScene,
  pumpkin_patch: PumpkinPatchScene,
  full_moon: FullMoonScene,
  borealis: BorealisScene,
}

defineProps<{ scene: ThumbnailScene }>()
</script>

<template>
  <component :is="SCENE_RENDERERS[scene.type]" v-if="SCENE_RENDERERS[scene.type]" class="thumbnail-scene" :scene="scene" />
</template>

<style scoped>
.thumbnail-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
