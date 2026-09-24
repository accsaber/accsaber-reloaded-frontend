<script setup lang="ts">
import BorderArcadeOverlay from '@/components/cosmetics/borders/BorderArcadeOverlay.vue'
import BorderBlackHoleOverlay from '@/components/cosmetics/borders/BorderBlackHoleOverlay.vue'
import BorderBlueprintOverlay from '@/components/cosmetics/borders/BorderBlueprintOverlay.vue'
import BorderCoffinOverlay from '@/components/cosmetics/borders/BorderCoffinOverlay.vue'
import BorderDripOverlay from '@/components/cosmetics/borders/BorderDripOverlay.vue'
import BorderDryBonesOverlay from '@/components/cosmetics/borders/BorderDryBonesOverlay.vue'
import BorderRainOverlay from '@/components/cosmetics/borders/BorderRainOverlay.vue'
import BorderThermalOverlay from '@/components/cosmetics/borders/BorderThermalOverlay.vue'
import BorderUmbraOverlay from '@/components/cosmetics/borders/BorderUmbraOverlay.vue'
import type { BorderOverlayHost, BorderOverlaySpec, BorderOverlayType } from '@/types/api/items'
import type { Component } from 'vue'

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
