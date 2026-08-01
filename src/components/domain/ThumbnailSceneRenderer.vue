<script setup lang="ts">
import type { ThumbnailScene } from '@/types/api/items'
import type { Component } from 'vue'
import TorchlitScene from './TorchlitScene.vue'
import FacetVaultScene from './FacetVaultScene.vue'
import FusionScene from './FusionScene.vue'
import GroveScene from './GroveScene.vue'
import MonumentScene from './MonumentScene.vue'
import SanctumScene from './SanctumScene.vue'

const SCENE_RENDERERS: Record<ThumbnailScene['type'], Component> = {
  facet_vault: FacetVaultScene,
  grove: GroveScene,
  sanctum: SanctumScene,
  monument: MonumentScene,
  torchlit: TorchlitScene,
  fusion: FusionScene,
}

defineProps<{ scene: ThumbnailScene }>()
</script>

<template>
  <component :is="SCENE_RENDERERS[scene.type]" v-if="SCENE_RENDERERS[scene.type]" :scene="scene" />
</template>
