<script setup lang="ts">
import type { ThumbnailScene } from '@/types/api/items'
import type { Component } from 'vue'
import TorchlitScene from '@/components/cosmetics/thumbnails/TorchlitScene.vue'
import HallwayScene from '@/components/cosmetics/thumbnails/HallwayScene.vue'
import GraveyardScene from '@/components/cosmetics/thumbnails/GraveyardScene.vue'
import PumpkinPatchScene from '@/components/cosmetics/thumbnails/PumpkinPatchScene.vue'
import FullMoonScene from '@/components/cosmetics/thumbnails/FullMoonScene.vue'
import FacetVaultScene from '@/components/cosmetics/thumbnails/FacetVaultScene.vue'
import FusionScene from '@/components/cosmetics/thumbnails/FusionScene.vue'
import GroveScene from '@/components/cosmetics/thumbnails/GroveScene.vue'
import MonumentScene from '@/components/cosmetics/thumbnails/MonumentScene.vue'
import SanctumScene from '@/components/cosmetics/thumbnails/SanctumScene.vue'

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
}

defineProps<{ scene: ThumbnailScene }>()
</script>

<template>
  <component :is="SCENE_RENDERERS[scene.type]" v-if="SCENE_RENDERERS[scene.type]" :scene="scene" />
</template>
