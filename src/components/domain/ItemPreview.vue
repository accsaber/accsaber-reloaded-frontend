<script setup lang="ts">
import ProfileBorderRenderer from '@/components/domain/ProfileBorderRenderer.vue'
import type {
  BorderColorValue,
  BorderShapeValue,
  ItemResponse,
  ThemeValue,
  TitleStateValue,
  TitleValue,
} from '@/types/api/items'
import {
  fillToCss,
  gradientToCss,
  pickAssetUrl,
  readBackgroundValue,
  readBadgeValue,
  readBorderColorValue,
  readBorderShapeValue,
  readThemeValue,
  readTitleValue,
  tokenize,
} from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  item: ItemResponse
  selected?: boolean
}>()

const typeKey = computed(() => props.item.typeKey)

const titleValue = computed<TitleValue | null>(() =>
  typeKey.value === 'title' ? readTitleValue(props.item.value) : null,
)
const titleState = computed<TitleStateValue | null>(() => titleValue.value?.states?.[0] ?? null)
const titleStyle = computed<Record<string, string> | undefined>(() => {
  if (!props.selected) return undefined
  const state = titleState.value
  if (!state) return undefined
  const out: Record<string, string> = {}
  if (state.gradient) {
    out.background = gradientToCss(state.gradient)
    out.webkitBackgroundClip = 'text'
    out.backgroundClip = 'text'
    out.color = 'transparent'
  } else if (state.color) {
    out.color = state.color
  }
  if (state.fontWeight) out.fontWeight = String(state.fontWeight)
  if (state.fontStyle) out.fontStyle = state.fontStyle
  return out
})

const borderColorValue = computed<BorderColorValue | null>(() =>
  typeKey.value === 'profile_border_color' ? readBorderColorValue(props.item.value) : null,
)
const borderColorBackground = computed<string | null>(() => {
  const fill = borderColorValue.value?.states?.[0]?.fill
  return fill ? fillToCss(fill) : null
})

const borderShapeValue = computed<BorderShapeValue | null>(() =>
  typeKey.value === 'profile_border_shape' ? readBorderShapeValue(props.item.value) : null,
)

const badgeValue = computed(() =>
  typeKey.value === 'badge' ? readBadgeValue(props.item.value) : null,
)
const badgeUrl = computed(() => pickAssetUrl(badgeValue.value?.asset) ?? props.item.iconUrl)
const badgeAlt = computed(() => badgeValue.value?.asset.altText ?? props.item.name)

const backgroundValue = computed(() =>
  typeKey.value === 'profile_background' || typeKey.value === 'profile_thumbnail_background'
    ? readBackgroundValue(props.item.value)
    : null,
)
const backgroundUrl = computed(() => pickAssetUrl(backgroundValue.value?.asset) ?? props.item.iconUrl)

const themeValue = computed<ThemeValue | null>(() =>
  typeKey.value === 'theme' ? readThemeValue(props.item.value) : null,
)
const themeStyleVars = computed<Record<string, string> | undefined>(() => {
  const tokens = themeValue.value?.tokens
  if (!tokens) return undefined
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(tokens)) {
    out[`--${tokenize(key)}`] = val
  }
  return out
})

const PERK_RE = /^([+-]\d+)/
const perkAmount = computed<string | null>(() => {
  if (typeKey.value !== 'perk') return null
  const fromName = props.item.name.match(PERK_RE)
  if (fromName) return fromName[1]
  const fromDesc = props.item.description?.match(PERK_RE)
  return fromDesc ? fromDesc[1] : null
})

const isPinnedPerk = computed(() => {
  if (typeKey.value !== 'perk') return false
  const haystack = `${props.item.name} ${props.item.description ?? ''}`.toLowerCase()
  return haystack.includes('pinned')
})

const fallbackInitial = computed(() => props.item.name.charAt(0).toUpperCase())
</script>

<template>
  <span class="item-preview" :class="`item-preview--${typeKey}`">
    <img
      v-if="typeKey === 'badge' && badgeUrl"
      class="item-preview__img"
      :src="badgeUrl"
      :alt="badgeAlt"
      loading="lazy"
    />

    <span
      v-else-if="typeKey === 'title' && titleValue"
      class="item-preview__title"
      :style="titleStyle"
    >{{ titleValue.text }}</span>

    <span
      v-else-if="typeKey === 'profile_border_color' && borderColorBackground"
      class="item-preview__color-swatch"
      :style="{ background: borderColorBackground }"
    />

    <span
      v-else-if="typeKey === 'profile_border_shape' && borderShapeValue"
      class="item-preview__shape-wrap"
      aria-hidden="true"
    >
      <ProfileBorderRenderer :shape="borderShapeValue" :color="null" />
    </span>

    <span
      v-else-if="typeKey === 'theme' && themeValue"
      class="item-preview__theme"
      :style="themeStyleVars"
    >
      <span class="item-preview__theme-bg" />
      <span class="item-preview__theme-surface" />
      <span class="item-preview__theme-accent" />
    </span>

    <!-- Pushpin + amount in a single SVG so both scale together. -->
    <svg
      v-else-if="typeKey === 'perk' && isPinnedPerk && perkAmount"
      class="item-preview__pin"
      viewBox="0 0 50 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
      <text
        x="28"
        y="14"
        font-size="11"
        font-weight="700"
        font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="currentColor"
        stroke="none"
        text-anchor="start"
        dominant-baseline="middle"
      >{{ perkAmount }}</text>
    </svg>

    <span
      v-else-if="typeKey === 'perk' && perkAmount"
      class="item-preview__medal"
    >
      <span class="item-preview__medal-text">{{ perkAmount }}</span>
    </span>

    <svg
      v-else-if="typeKey === 'statistic'"
      class="item-preview__stat-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="20" x2="4" y2="12" />
      <line x1="10" y1="20" x2="10" y2="6" />
      <line x1="16" y1="20" x2="16" y2="14" />
      <line x1="22" y1="20" x2="22" y2="9" />
      <line x1="2" y1="22" x2="22" y2="22" />
    </svg>

    <img
      v-else-if="(typeKey === 'profile_background' || typeKey === 'profile_thumbnail_background') && backgroundUrl"
      class="item-preview__img item-preview__img--cover"
      :src="backgroundUrl"
      :alt="item.name"
      loading="lazy"
    />

    <img
      v-else-if="item.iconUrl"
      class="item-preview__img"
      :src="item.iconUrl"
      :alt="item.name"
      loading="lazy"
    />

    <span v-else class="item-preview__initial">{{ fallbackInitial }}</span>
  </span>
</template>

<style scoped>
.item-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-primary);
  overflow: hidden;
}

.item-preview__img {
  max-width: 80%;
  max-height: 80%;
  object-fit: contain;
}

.item-preview__img--cover {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: cover;
}

.item-preview__initial {
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 1.5rem;
  color: var(--cell-accent, var(--text-secondary));
  letter-spacing: 0.04em;
}

.item-preview__title {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-primary);
  text-align: center;
  padding: 0 var(--space-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.item-preview__color-swatch {
  display: block;
  width: 70%;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-avatar);
  border: 1px solid color-mix(in srgb, var(--text-primary) 12%, transparent);
}

.item-preview__shape-wrap {
  position: relative;
  display: block;
  width: 70%;
  aspect-ratio: 1 / 1;
  color: var(--cell-accent, var(--text-primary));
}

.item-preview__theme {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 70%;
  aspect-ratio: 1 / 1;
  padding: 8px;
  border-radius: 6px;
  background: var(--color-bg, var(--bg-base));
  border: 1px solid color-mix(in srgb, var(--text-primary) 10%, transparent);
  justify-content: center;
}

.item-preview__theme-bg,
.item-preview__theme-surface,
.item-preview__theme-accent {
  display: block;
  height: 5px;
  border-radius: 2px;
}

.item-preview__theme-bg { background: var(--color-surface, var(--bg-surface)); width: 100%; }
.item-preview__theme-surface { background: var(--color-elevated, var(--bg-elevated)); width: 70%; }
.item-preview__theme-accent { background: var(--color-accent, var(--accent-overall)); width: 40%; }

.item-preview__pin {
  width: 80%;
  aspect-ratio: 50 / 24;
  color: var(--cell-accent, var(--tier-gold));
  overflow: visible;
}

.item-preview__medal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    color-mix(in srgb, var(--cell-accent, var(--tier-gold)) 100%, transparent),
    color-mix(in srgb, var(--cell-accent, var(--tier-gold)) 60%, var(--bg-base)) 70%
  );
  border: 2px solid color-mix(in srgb, var(--cell-accent, var(--tier-gold)) 80%, var(--bg-overlay));
  box-shadow:
    inset 0 -2px 4px rgba(0, 0, 0, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
}

.item-preview__medal-text {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--bg-base);
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.4);
}

.item-preview__stat-icon {
  width: 60%;
  aspect-ratio: 1 / 1;
  color: var(--cell-accent, var(--info));
}
</style>
