<script setup lang="ts">
import type {
  BorderOverlayHost,
  BorderOverlaySpec,
  BorderOverlayType,
} from '@/types/cosmetics/border'
import { defineAsyncComponent, type Component } from 'vue'

const BorderArcadeOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderArcadeOverlay.vue'))
const BorderBlackHoleOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderBlackHoleOverlay.vue'))
const BorderBlueprintOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderBlueprintOverlay.vue'))
const BorderCoffinOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderCoffinOverlay.vue'))
const BorderDripOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderDripOverlay.vue'))
const BorderDryBonesOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderDryBonesOverlay.vue'))
const BorderFrostOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderFrostOverlay.vue'))
const BorderGingerbreadOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderGingerbreadOverlay.vue'))
const BorderRainOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderRainOverlay.vue'))
const BorderScarfOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderScarfOverlay.vue'))
const BorderSnowGlobeOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderSnowGlobeOverlay.vue'))
const BorderThermalOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderThermalOverlay.vue'))
const BorderUmbraOverlay = defineAsyncComponent(() => import('@/components/cosmetics/borders/BorderUmbraOverlay.vue'))

const OVERLAY_RENDERERS: Record<BorderOverlayType, Component> = {
  rain: BorderRainOverlay,
  blackhole: BorderBlackHoleOverlay,
  arcade: BorderArcadeOverlay,
  thermal: BorderThermalOverlay,
  blueprint: BorderBlueprintOverlay,
  coffin: BorderCoffinOverlay,
  drip: BorderDripOverlay,
  drybones: BorderDryBonesOverlay,
  umbra: BorderUmbraOverlay,
  snowglobe: BorderSnowGlobeOverlay,
  gingerbread: BorderGingerbreadOverlay,
  frost: BorderFrostOverlay,
  scarf: BorderScarfOverlay,
}

defineProps<BorderOverlayHost & { overlay: BorderOverlaySpec }>()
</script>

<template>
  <component
    :is="OVERLAY_RENDERERS[overlay.type]"
    v-if="OVERLAY_RENDERERS[overlay.type]"
    class="border-overlay"
    :overlay="overlay"
    :avatar-url="avatarUrl"
    :avatar-mask="avatarMask"
    :color="color"
  />
</template>

<style scoped>
.border-overlay {
  position: absolute;
  inset: -20%;
  width: 140%;
  height: 140%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
