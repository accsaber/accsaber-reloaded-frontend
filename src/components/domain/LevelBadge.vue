<script setup lang="ts">
import BorderDecals from '@/components/cosmetics/borders/BorderDecals.vue'
import BorderOverlay from '@/components/cosmetics/borders/BorderOverlay.vue'
import ContentEffects from '@/components/cosmetics/effects/ContentEffects.vue'
import LevelBadgeAvatar from '@/components/domain/LevelBadgeAvatar.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import ProfileBorderRenderer from '@/components/cosmetics/borders/ProfileBorderRenderer.vue'
import TitleRenderer from '@/components/cosmetics/titles/TitleRenderer.vue'
import type {
  BorderColorValue,
  BorderShapeValue,
  TitleValue,
} from '@/types/api/items'
import {
  annotateEffectLayerStacks,
  fillToCss,
  type EffectLayer,
} from '@/utils/items'
import { DEFAULT_AVATAR_MASK, resolveAvatarImageBox } from '@/utils/avatarBox'
import { shapeRing, shapeSilhouetteMask } from '@/utils/shapeSilhouette'
import type { EffectHostContext } from '@/utils/cosmetics/effects'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  level: number
  currentXp: number
  requiredXp: number
  avatarUrl?: string
  avatarFallbackUrl?: string | null
  fallbackTitle?: string | null
  fallbackTitleColor?: string | null
  hideProgress?: boolean
  plain?: boolean
  equippedTitle?: TitleValue | null
  equippedBorderShape?: BorderShapeValue | null
  equippedBorderColor?: BorderColorValue | null
  titleEffects?: EffectLayer[]
  borderEffects?: EffectLayer[]
}>()

const progressPercent = computed(() => {
  if (props.requiredXp <= 0) return 100
  return Math.min((props.currentXp / props.requiredXp) * 100, 100)
})

const progressBackground = computed(() => {
  const fill = borderColor.value?.states?.[0]?.fill
  if (fill) return fillToCss(fill)
  return 'var(--accent-overall)'
})

const PLAIN_BORDER_COLOR: BorderColorValue = {
  states: [{ atMs: 0, fill: { type: 'solid', hex: 'var(--bg-overlay)' } }],
}

const borderShape = computed(() => (props.plain ? null : props.equippedBorderShape ?? null))
const borderColor = computed(() =>
  props.plain ? PLAIN_BORDER_COLOR : props.equippedBorderColor ?? null,
)
const title = computed(() => (props.plain ? null : props.equippedTitle ?? null))

const borderFxLayers = computed(() =>
  props.plain ? [] : annotateEffectLayerStacks(props.borderEffects),
)
const titleFxLayers = computed(() =>
  props.plain ? [] : annotateEffectLayerStacks(props.titleEffects),
)
const borderFxMask = computed(() => shapeSilhouetteMask(borderShape.value))
const borderFxHost = computed<EffectHostContext>(() => ({
  ring: shapeRing(borderShape.value),
  fillType: borderColor.value?.states?.[0]?.fill?.type,
  overlayType: borderShape.value?.overlay?.enabled ? borderShape.value.overlay.type : undefined,
}))
const titleFxHost = computed<EffectHostContext>(() => ({ auraType: title.value?.aura?.type }))

const hasShapeOverride = computed(() => !!borderShape.value)

const decals = computed(() => borderShape.value?.decals ?? [])

const overlay = computed(() =>
  borderShape.value?.overlay?.enabled ? borderShape.value.overlay : null,
)

const avatarMaskPath = computed(() => borderShape.value?.avatarMask ?? DEFAULT_AVATAR_MASK)

const avatarImageBox = ref({ x: 0, y: 0, size: 100 })

watch(
  borderShape,
  (shape) => {
    avatarImageBox.value = resolveAvatarImageBox(shape)
  },
  { immediate: true, deep: false },
)

let avatarClipCounter = 0
const avatarClipId = `lb-avatar-clip-${++avatarClipCounter}-${Math.random().toString(36).slice(2, 8)}`

const fallbackTitleStyle = computed(() => {
  if (!props.fallbackTitleColor) return undefined
  return { color: props.fallbackTitleColor }
})
</script>

<template>
  <div class="level-badge">
    <div class="level-badge__stack" :class="{ 'level-badge__stack--shaped': hasShapeOverride }">
      <ContentEffects :layers="plain ? null : borderEffects" seed="border">
        <ProfileBorderRenderer :shape="borderShape" :color="borderColor" />
        <LevelBadgeAvatar
          v-if="avatarUrl"
          :avatar-url="avatarUrl"
          :fallback-url="avatarFallbackUrl"
          :clip-id="avatarClipId"
          :mask-path="avatarMaskPath"
          :image-box="avatarImageBox"
        />
      </ContentEffects>
      <BorderDecals v-if="decals.length" class="level-badge__decals" :decals="decals" />
      <BorderOverlay
        v-if="overlay"
        class="level-badge__overlay"
        :overlay="overlay"
        :avatar-url="avatarUrl"
        :color="equippedBorderColor ?? null"
      />
      <ModifierCompositions
        v-for="layer in borderFxLayers"
        :key="layer.key"
        class="level-badge__border-fx"
        :spec="layer.spec"
        :stack-index="layer.stackIndex"
        :content-mask="borderFxMask"
        :host="borderFxHost"
        hide-stat-counters
      />
    </div>

    <div v-if="!plain" class="level-badge__below">
      <span class="level-badge__title-line">
        <span class="level-badge__level">Lv. {{ level }}</span>
        <span v-if="title" class="level-badge__title-fx">
          <ModifierCompositions
            v-for="layer in titleFxLayers"
            :key="layer.key"
            class="level-badge__title-fx-layer"
            :spec="layer.spec"
            type-key="title"
            measure-selector=".title-renderer"
            :stack-index="layer.stackIndex"
            :host="titleFxHost"
            hide-stat-counters
          />
          <span class="level-badge__title-fx-text">
            <ContentEffects :layers="plain ? null : titleEffects" :fill="false" subtle seed="title">
              <TitleRenderer :value="title" />
            </ContentEffects>
          </span>
        </span>
        <span
          v-else-if="fallbackTitle"
          class="level-badge__fallback-title"
          :style="fallbackTitleStyle"
        >{{ fallbackTitle }}</span>
      </span>
      <div v-if="!hideProgress" class="level-badge__bar-wrap">
        <div class="level-badge__bar">
          <div
            class="level-badge__fill"
            :style="{ '--progress': progressPercent / 100, background: progressBackground }"
          />
        </div>
        <span class="level-badge__xp">
          {{ Math.round(currentXp).toLocaleString() }} / {{ Math.round(requiredXp).toLocaleString() }} XP
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.level-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.level-badge__stack {
  position: relative;
  width: 140px;
  height: 140px;
}

.level-badge__decals {
  z-index: 3;
}

.level-badge__overlay {
  z-index: 3;
}

.level-badge__below {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  width: 100%;
}

.level-badge__title-line {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  white-space: nowrap;
}

.level-badge__border-fx {
  z-index: 4;
}

.level-badge__title-fx {
  position: relative;
  display: inline-block;
  padding: 0.45em 0.4em;
  margin: -0.45em -0.4em;
}

.level-badge__title-fx-layer {
  z-index: 0;
}

.level-badge__title-fx-text {
  position: relative;
  z-index: 1;
}

.level-badge__level {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--text-primary);
}

.level-badge__fallback-title {
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.level-badge__bar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
  padding: 0 var(--space-xs);
}

.level-badge__bar {
  height: 4px;
  background: var(--bg-overlay);
  border-radius: 2px;
  overflow: hidden;
  width: 100%;
}

.level-badge__fill {
  width: 100%;
  height: 100%;
  border-radius: 2px;
  transform-origin: left;
  transform: scaleX(var(--progress, 0));
  transition: transform 300ms ease-out;
}

.level-badge__xp {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .level-badge__fill {
    transition: none;
  }
}
</style>
