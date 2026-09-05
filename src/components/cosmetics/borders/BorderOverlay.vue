<script setup lang="ts">
import BorderArcadeOverlay from '@/components/cosmetics/borders/BorderArcadeOverlay.vue'
import BorderBlackHoleOverlay from '@/components/cosmetics/borders/BorderBlackHoleOverlay.vue'
import BorderBlueprintOverlay from '@/components/cosmetics/borders/BorderBlueprintOverlay.vue'
import BorderRainOverlay from '@/components/cosmetics/borders/BorderRainOverlay.vue'
import BorderThermalOverlay from '@/components/cosmetics/borders/BorderThermalOverlay.vue'
import type { BorderColorValue, BorderOverlaySpec, BorderOverlayType } from '@/types/api/items'
import type { Component } from 'vue'

import BorderDryBonesOverlay from '@/components/cosmetics/borders/BorderDryBonesOverlay.vue'
import BorderDripOverlay from './BorderDripOverlay.vue'
import BorderCoffinOverlay from '@/components/cosmetics/borders/BorderCoffinOverlay.vue'
import BorderUmbraOverlay from '@/components/cosmetics/borders/BorderUmbraOverlay.vue'

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

defineProps<{
  overlay: BorderOverlaySpec
  avatarUrl?: string | null
  color?: BorderColorValue | null
}>()
</script>

<template>
  <component
    :is="OVERLAY_RENDERERS[overlay.type]"
    v-if="OVERLAY_RENDERERS[overlay.type]"
    :overlay="overlay"
    :avatar-url="avatarUrl"
    :color="color"
  />
</template>
