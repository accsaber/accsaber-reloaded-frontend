<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import StatBlock from '@/components/common/StatBlock.vue'
import ClanTag from '@/components/domain/ClanTag.vue';
import CountryFlag from '@/components/domain/CountryFlag.vue';
import LevelBadge from '@/components/domain/LevelBadge.vue';
import RelationActions from '@/components/domain/RelationActions.vue';
import ThumbnailBackdrop from '@/components/cosmetics/thumbnails/ThumbnailBackdrop.vue';
import { pickAvatarFallback, pickAvatarUrl } from '@/utils/media';
import { useEquippedRenderProps } from '@/composables/useEquippedRenderProps';
import { useMiniProfile } from '@/composables/useMiniProfile';
import type { UserRefDisplay } from '@/types/display';
import { fillToCss } from '@/utils/cosmetics/interpolate'
import { formatFixed } from '@/utils/formatters'
import { thumbnailHostAttrs } from '@/utils/cosmetics/readers';
import { computed } from 'vue';

const props = defineProps<{
  user: UserRefDisplay
}>()

const { profile, loading } = useMiniProfile(() => props.user.id)

const stats = computed(() => {
  const loaded = profile.value?.stats
  if (!loaded) return loading.value ? { ap: '', global: '', country: '' } : null
  return { ap: formatFixed(loaded.ap, 2), global: `#${loaded.ranking}`, country: `#${loaded.countryRanking}` }
})
const level = computed(() => profile.value?.level ?? null)

const {
  titleValue: equippedTitle,
  borderShapeValue: equippedBorderShape,
  borderColorValue: equippedBorderColor,
  titleEffects: equippedTitleEffects,
  borderEffects: equippedBorderEffects,
  thumbnailValue: equippedThumbnail,
  thumbnailEffects: equippedThumbnailEffects,
} = useEquippedRenderProps(() => profile.value?.equipped, { previewable: true })

const thumbAttrs = computed(() => thumbnailHostAttrs(equippedThumbnail.value))

const tierKey = computed(() => {
  if (level.value?.title) return level.value.title.toLowerCase().replace(/\s+/g, '-')
  return null
})

function flatten(value: string): string {
  return `linear-gradient(${value}, ${value})`
}

const cardBorder = computed(() => {
  const fill = equippedBorderColor.value?.states?.[0]?.fill
  if (fill) {
    const css = fillToCss(fill)
    return fill.type === 'solid' ? flatten(css) : css
  }
  if (tierKey.value) return flatten(`var(--tier-${tierKey.value})`)
  return undefined
})
</script>

<template>
  <div
    class="player-tooltip"
    v-bind="thumbAttrs"
    :style="cardBorder ? { '--tooltip-border': cardBorder } : undefined"
  >
    <ThumbnailBackdrop :value="equippedThumbnail" :effects="equippedThumbnailEffects" />
    <div class="player-tooltip__content">
      <div v-if="loading" class="player-tooltip__badge player-tooltip__badge--loading" aria-hidden="true">
        <SkeletonLoader width="96px" height="96px" />
        <SkeletonLoader width="104px" height="21px" />
      </div>
      <div v-else class="player-tooltip__badge">
        <LevelBadge
          :level="level?.level ?? 0"
          :current-xp="level?.xpForCurrentLevel ?? 0"
          :required-xp="level?.xpForNextLevel ?? 1"
          :avatar-url="pickAvatarUrl(user)"
          :avatar-fallback-url="pickAvatarFallback(user)"
          :fallback-title="level?.title"
          hide-progress
          :equipped-title="equippedTitle"
          :equipped-border-shape="equippedBorderShape"
          :equipped-border-color="equippedBorderColor"
          :title-effects="equippedTitleEffects"
          :border-effects="equippedBorderEffects"
        />
      </div>

      <div class="player-tooltip__info">
        <div class="player-tooltip__identity">
          <span class="player-tooltip__name">{{ user.name }}</span>
          <CountryFlag :country="user.country" />
        </div>
        <div v-if="user.clan" class="player-tooltip__identity">
          <ClanTag :clan="user.clan" size="sm" />
          <span class="player-tooltip__clan-name caption">{{ user.clan.name }}</span>
        </div>
        <div v-if="stats" class="player-tooltip__stats">
          <StatBlock label="Total AP" :value="stats.ap" />
          <StatBlock label="Global" :value="stats.global" />
          <StatBlock label="Country" :value="stats.country" />
        </div>
      </div>

      <RelationActions
        :target-user-id="user.id"
        :target-name="user.name"
        show-snipe
        dense
        class="player-tooltip__actions"
        @click.stop
      />
    </div>
  </div>
</template>

<style scoped>
.player-tooltip {
  position: relative;
  width: 240px;
  border-radius: var(--radius-card);
  border: 1px solid transparent;
  overflow: hidden;
  background:
    linear-gradient(var(--bg-surface), var(--bg-surface)) padding-box,
    var(--tooltip-border, linear-gradient(var(--bg-overlay), var(--bg-overlay))) border-box;
}

.player-tooltip__content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
}

.player-tooltip__badge--loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.player-tooltip__badge :deep(.level-badge) {
  gap: var(--space-sm);
}

.player-tooltip__badge :deep(.level-badge__stack) {
  width: 96px;
  height: 96px;
}

.player-tooltip__badge :deep(.level-badge__title-line) {
  justify-content: center;
  flex-wrap: wrap;
  white-space: normal;
  max-width: 208px;
}

.player-tooltip__badge :deep(.level-badge__level) {
  font-size: var(--text-caption);
}

.player-tooltip__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  width: 100%;
  padding: var(--space-sm);
  border-radius: var(--radius-btn);
}

.player-tooltip[data-thumb-base] .player-tooltip__info {
  background: color-mix(in srgb, var(--thumb-ink) 62%, transparent);
}

.player-tooltip__identity {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  max-width: 100%;
}

.player-tooltip__name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.player-tooltip__name,
.player-tooltip__clan-name {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-tooltip__stats {
  display: grid;
  grid-template-columns: 3fr 2fr 2fr;
  width: 100%;
  margin-top: var(--space-xs);
}

.player-tooltip__stats :deep(.stat-block) {
  align-items: center;
  gap: 0;
  padding: 0;
}

.player-tooltip__stats :deep(.stat-block__value) {
  font-size: var(--text-body);
}

.player-tooltip__actions {
  justify-content: center;
  width: 100%;
}
</style>
