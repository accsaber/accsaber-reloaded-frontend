<script setup lang="ts">
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import { BACKDROP_RENDERERS, LANDSCAPE_BACKDROPS } from '@/components/cosmetics/backdrops/backdropRenderers'
import { useThemeStore } from '@/stores/theme'
import { absorbEffects, themeCompositionLayers } from '@/utils/cosmetics/effectLayers'
import { readBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { computed } from 'vue'

const themeStore = useThemeStore()

const ownConfig = computed(() => readBackdropConfig(themeStore.activeTokens))
const fxHost = computed(() => ({ backdropType: ownConfig.value?.type, viewport: true }))
const fx = computed(() => absorbEffects(themeCompositionLayers(themeStore.activeEffects), fxHost.value))
const effectLayers = computed(() => fx.value.layers)
const config = computed(() => {
  const own = ownConfig.value
  return fx.value.hues && own?.type === 'aurora' ? { ...own, hues: fx.value.hues } : own
})
const configKey = computed(() => (config.value ? JSON.stringify(config.value) : ''))
</script>

<template>
  <div
    v-if="config"
    class="theme-backdrop"
    :class="{ 'theme-backdrop--landscape': LANDSCAPE_BACKDROPS.has(config.type) }"
  >
    <component :is="BACKDROP_RENDERERS[config.type]" :key="configKey" :config="config" />
  </div>
  <div v-if="effectLayers.length" class="backdrop-effects">
    <ModifierCompositions
      v-for="layer in effectLayers"
      :key="layer.key"
      :spec="layer.spec"
      :stack-index="layer.stackIndex"
      type-key="theme"
      :host="fxHost"
    />
  </div>
</template>

<style scoped>
.theme-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.theme-backdrop :deep(canvas) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
}

.theme-backdrop--landscape :deep(canvas) {
  right: auto;
  left: 50%;
  width: auto;
  min-width: 100%;
  aspect-ratio: 3 / 2;
  transform: translateX(-50%);
}

.backdrop-effects {
  position: fixed;
  top: var(--navbar-height);
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}
</style>
