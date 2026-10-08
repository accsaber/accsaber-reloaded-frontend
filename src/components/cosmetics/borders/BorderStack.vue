<script setup lang="ts">
import BorderDecals from '@/components/cosmetics/borders/BorderDecals.vue'
import BorderOverlay from '@/components/cosmetics/borders/BorderOverlay.vue'
import ProfileBorderRenderer from '@/components/cosmetics/borders/ProfileBorderRenderer.vue'
import ContentEffects from '@/components/cosmetics/effects/ContentEffects.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import LevelBadgeAvatar from '@/components/domain/LevelBadgeAvatar.vue'
import type { BorderColorValue, BorderShapeValue } from '@/types/api/items'
import { DEFAULT_AVATAR_MASK, resolveAvatarImageBox } from '@/utils/avatarBox'
import type { EffectHostContext } from '@/utils/cosmetics/effects'
import { annotateEffectLayerStacks, type EffectLayer } from '@/utils/items'
import { shapeRing, shapeSilhouetteMask } from '@/utils/shapeSilhouette'
import { computed } from 'vue'

const props = defineProps<{
  shape: BorderShapeValue | null
  color: BorderColorValue | null
  avatarUrl?: string | null
  avatarFallbackUrl?: string | null
  effects?: EffectLayer[]
}>()

const decals = computed(() => props.shape?.decals ?? [])
const overlay = computed(() => (props.shape?.overlay?.enabled ? props.shape.overlay : null))
const avatarMaskPath = computed(() => props.shape?.avatarMask ?? DEFAULT_AVATAR_MASK)
const avatarImageBox = computed(() => resolveAvatarImageBox(props.shape))
const fxLayers = computed(() => annotateEffectLayerStacks(props.effects))
const fxMask = computed(() => shapeSilhouetteMask(props.shape))
const fxHost = computed<EffectHostContext>(() => ({
  ring: shapeRing(props.shape),
  fillType: props.color?.states?.[0]?.fill?.type,
  overlayType: overlay.value?.type,
}))

const avatarClipId = `border-stack-clip-${Math.random().toString(36).slice(2, 9)}`
</script>

<template>
  <div class="border-stack" :class="{ 'border-stack--shaped': !!shape }">
    <ContentEffects :layers="effects ?? null" seed="border">
      <ProfileBorderRenderer :shape="shape" :color="color" />
      <LevelBadgeAvatar
        v-if="avatarUrl"
        :avatar-url="avatarUrl"
        :fallback-url="avatarFallbackUrl"
        :clip-id="avatarClipId"
        :mask-path="avatarMaskPath"
        :image-box="avatarImageBox"
      />
      <slot v-else :mask-path="avatarMaskPath" :clip-id="avatarClipId" />
    </ContentEffects>
    <BorderDecals v-if="decals.length" class="border-stack__decals" :decals="decals" />
    <BorderOverlay v-if="overlay" class="border-stack__overlay" :overlay="overlay" :avatar-url="avatarUrl" :color="color" />
    <ModifierCompositions
      v-for="layer in fxLayers"
      :key="layer.key"
      class="border-stack__fx"
      :spec="layer.spec"
      :stack-index="layer.stackIndex"
      :content-mask="fxMask"
      :host="fxHost"
      hide-stat-counters
    />
  </div>
</template>

<style scoped>
.border-stack {
  position: relative;
  width: 140px;
  height: 140px;
  color: var(--text-secondary);
}

.border-stack__decals,
.border-stack__overlay {
  z-index: 3;
}

.border-stack__fx {
  z-index: 4;
}
</style>
