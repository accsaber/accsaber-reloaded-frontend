<script setup lang="ts">
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import { BACKDROP_RENDERERS, LANDSCAPE_BACKDROPS } from '@/components/cosmetics/backdrops/backdropRenderers'
import { useThemeStore } from '@/stores/theme'
import { themeCompositionLayers } from '@/utils/items'
import { readBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { computed } from 'vue'

const themeStore = useThemeStore()

const config = computed(() => readBackdropConfig(themeStore.activeTokens))
const configKey = computed(() => (config.value ? JSON.stringify(config.value) : ''))
const effectLayers = computed(() => themeCompositionLayers(themeStore.activeEffects))
const fxHost = computed(() => ({ backdropType: config.value?.type, viewport: true }))
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
