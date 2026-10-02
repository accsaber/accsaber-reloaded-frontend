<script setup lang="ts">
import BorderDecals from '@/components/cosmetics/borders/BorderDecals.vue'
import BorderOverlay from '@/components/cosmetics/borders/BorderOverlay.vue'
import ContentEffects from '@/components/cosmetics/effects/ContentEffects.vue'
import LevelBadgeAvatar from '@/components/domain/LevelBadgeAvatar.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import ProfileBorderRenderer from '@/components/cosmetics/borders/ProfileBorderRenderer.vue'
import { ABOVE_CONTENT_TYPES } from '@/components/cosmetics/effects/registry'
import type { BorderColorValue, BorderShapeValue } from '@/types/api/items'
import { DEFAULT_AVATAR_MASK, resolveAvatarImageBox } from '@/utils/avatarBox'
import type { EffectHostContext } from '@/utils/cosmetics/effects'
import { annotateEffectLayerStacks, type EffectLayer, type TokenContext } from '@/utils/items'
import { shapeRing, shapeSilhouetteMask } from '@/utils/shapeSilhouette'
import { computed } from 'vue'

const props = defineProps<{
  shape: BorderShapeValue | null
  color: BorderColorValue | null
  avatarUrl?: string | null
  avatarFallbackUrl?: string | null
  effects?: EffectLayer[] | null
  context?: TokenContext
  hideStatCounters?: boolean
}>()

const decals = computed(() => props.shape?.decals ?? [])
const overlay = computed(() => (props.shape?.overlay?.enabled ? props.shape.overlay : null))

const avatarMaskPath = computed(() => props.shape?.avatarMask ?? DEFAULT_AVATAR_MASK)
const avatarImageBox = computed(() => resolveAvatarImageBox(props.shape))
const avatarClipId = `bc-avatar-clip-${Math.random().toString(36).slice(2, 9)}`

const fxLayers = computed(() => annotateEffectLayerStacks(props.effects))
const isAbove = (layer: EffectLayer) => layer.spec.compositions?.some((c) => ABOVE_CONTENT_TYPES.has(c.type)) ?? false
const innerLayers = computed(() => fxLayers.value.filter((l) => !isAbove(l)))
const aboveLayers = computed(() => fxLayers.value.filter(isAbove))

const fxMask = computed(() => (fxLayers.value.length ? shapeSilhouetteMask(props.shape) : null))
const fxHost = computed<EffectHostContext>(() => ({
  ring: fxLayers.value.length ? shapeRing(props.shape) : null,
  fillType: props.color?.states?.[0]?.fill?.type,
  overlayType: overlay.value?.type,
}))
</script>

<template>
  <div class="border-composition">
    <ContentEffects :layers="effects" seed="border">
      <ProfileBorderRenderer :shape="shape" :color="color" />
      <ModifierCompositions
        v-for="layer in innerLayers"
        :key="layer.key"
        :spec="layer.spec"
        :context="context"
        :stack-index="layer.stackIndex"
        :content-mask="fxMask"
        :host="fxHost"
        :hide-stat-counters="hideStatCounters"
      />
      <LevelBadgeAvatar
        :avatar-url="avatarUrl"
        :fallback-url="avatarFallbackUrl"
        :clip-id="avatarClipId"
        :mask-path="avatarMaskPath"
        :image-box="avatarImageBox"
      />
    </ContentEffects>
    <BorderDecals v-if="decals.length" class="border-composition__decals" :decals="decals" />
    <BorderOverlay
      v-if="overlay"
      class="border-composition__overlay"
      :overlay="overlay"
      :avatar-url="avatarUrl ?? undefined"
      :avatar-mask="avatarMaskPath"
      :color="color"
    />
    <ModifierCompositions
      v-for="layer in aboveLayers"
      :key="layer.key"
      class="border-composition__fx-above"
      :spec="layer.spec"
      :context="context"
      :stack-index="layer.stackIndex"
      :content-mask="fxMask"
      :host="fxHost"
      :hide-stat-counters="hideStatCounters"
    />
  </div>
</template>

<style scoped>
.border-composition {
  position: relative;
  width: 140px;
  height: 140px;
  color: var(--text-secondary);
}

.border-composition__decals,
.border-composition__overlay {
  z-index: 3;
}

.border-composition__fx-above {
  z-index: 4;
}
</style>
