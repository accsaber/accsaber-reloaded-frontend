<script setup lang="ts">
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import ThumbnailSceneRenderer from '@/components/cosmetics/thumbnails/ThumbnailSceneRenderer.vue'
import type { ProfileThumbnailBackgroundValue } from '@/types/api/items'
import { pickAssetUrl, themeCompositionLayers, type EffectLayer } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  value: ProfileThumbnailBackgroundValue | null | undefined
  effects?: EffectLayer[] | null
}>()

const scene = computed(() => props.value?.scene ?? null)
const imageUrl = computed(() => pickAssetUrl(props.value?.asset))
const layers = computed(() => themeCompositionLayers(props.effects))
const fxHost = computed(() => ({ sceneType: scene.value?.type, base: scene.value?.base ?? 'dark' }))
const layerStyle = computed<Record<string, string> | undefined>(() => {
  const opacity = props.value?.opacity
  return opacity != null ? { opacity: String(opacity) } : undefined
})
</script>

<template>
  <div v-if="scene || imageUrl" class="thumbnail-backdrop" :style="layerStyle" aria-hidden="true">
    <ThumbnailSceneRenderer v-if="scene" :scene="scene" />
    <img v-else-if="imageUrl" class="thumbnail-backdrop__img" :src="imageUrl" alt="" />
    <div v-if="layers.length" class="thumbnail-backdrop__effects">
      <ModifierCompositions
        v-for="layer in layers"
        :key="layer.key"
        :spec="layer.spec"
        :stack-index="layer.stackIndex"
        type-key="profile_thumbnail_background"
        :host="fxHost"
      />
    </div>
  </div>
</template>

<style scoped>
.thumbnail-backdrop {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}

.thumbnail-backdrop__img {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: cover;
  display: block;
}

.thumbnail-backdrop__effects {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
</style>
