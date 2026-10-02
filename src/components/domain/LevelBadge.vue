<script setup lang="ts">
import BorderComposition from '@/components/domain/BorderComposition.vue'
import ContentEffects from '@/components/cosmetics/effects/ContentEffects.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
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
import type { EffectHostContext } from '@/utils/cosmetics/effects'
import { computed } from 'vue'

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

const titleFxLayers = computed(() =>
  props.plain ? [] : annotateEffectLayerStacks(props.titleEffects),
)
const titleFxHost = computed<EffectHostContext>(() => ({ auraType: title.value?.aura?.type }))

const fallbackTitleStyle = computed(() => {
  if (!props.fallbackTitleColor) return undefined
  return { color: props.fallbackTitleColor }
})
</script>

<template>
  <div class="level-badge">
    <BorderComposition
      class="level-badge__stack"
      :shape="borderShape"
      :color="borderColor"
      :avatar-url="avatarUrl"
      :avatar-fallback-url="avatarFallbackUrl"
      :effects="plain ? null : borderEffects"
      hide-stat-counters
    />

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
