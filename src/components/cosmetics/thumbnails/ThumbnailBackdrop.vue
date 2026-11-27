<script setup lang="ts">
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import ThumbnailSceneRenderer from '@/components/cosmetics/thumbnails/ThumbnailSceneRenderer.vue'
import type { ProfileThumbnailBackgroundValue } from '@/types/cosmetics/background'
import { pickAssetUrl } from '@/utils/cosmetics/readers'
import { absorbEffects, type EffectLayer, themeCompositionLayers } from '@/utils/cosmetics/effectLayers'
import { computed } from 'vue'

const props = defineProps<{
  value: ProfileThumbnailBackgroundValue | null | undefined
  effects?: EffectLayer[] | null
}>()

const ownScene = computed(() => props.value?.scene ?? null)
const imageUrl = computed(() => pickAssetUrl(props.value?.asset))
const fxHost = computed(() => ({ sceneType: ownScene.value?.type, base: ownScene.value?.base ?? 'dark' }))
const fx = computed(() => absorbEffects(themeCompositionLayers(props.effects), fxHost.value))
const layers = computed(() => fx.value.layers)
const scene = computed(() => {
  const own = ownScene.value
  return fx.value.hues && own?.type === 'borealis' ? { ...own, hues: fx.value.hues } : own
})
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
