<script setup lang="ts">
import type { LevelThreshold } from '@/api/levels'
import logoUrl from '@/assets/logo.png'
import LevelBadge from '@/components/domain/LevelBadge.vue'
import RewardItemTile from '@/components/domain/RewardItemTile.vue'
import ThumbnailSceneRenderer from '@/components/cosmetics/thumbnails/ThumbnailSceneRenderer.vue'
import { tierKey } from '@/stores/levels'
import type { ItemResponse } from '@/types/api/items'
import {
  pickAssetUrl,
  readBorderColorValue,
  readBorderShapeValue,
  readThumbnailBackgroundValue,
  readTitleValue,
} from '@/utils/items'
import { xpForLevel } from '@/wiki/apCurve'
import { computed, ref } from 'vue'

const props = defineProps<{
  thresholds: LevelThreshold[]
  itemsById: Map<string, ItemResponse>
  personalLevel?: number | null
  userName?: string | null
  avatarUrl?: string | null
  avatarFallbackUrl?: string | null
}>()

interface AwardGroup {
  level: number
  items: ItemResponse[]
}

const awards = computed<AwardGroup[]>(() => {
  const byLevel = new Map<number, ItemResponse[]>()
  for (const item of props.itemsById.values()) {
    if (item.unlockLevel == null || item.unlockLevel < 1) continue
    const list = byLevel.get(item.unlockLevel) ?? []
    list.push(item)
    byLevel.set(item.unlockLevel, list)
  }
  return [...byLevel.entries()]
    .map(([level, items]) => ({ level, items }))
    .sort((a, b) => a.level - b.level)
})

const maxLevel = computed(() =>
  Math.max(
    100,
    props.thresholds[props.thresholds.length - 1]?.level ?? 100,
    awards.value[awards.value.length - 1]?.level ?? 0,
    props.personalLevel ?? 0,
  ),
)

const level = ref(Math.min(Math.max(props.personalLevel ?? 42, 1), 999))

function tierColor(title: string): string {
  return `var(--tier-${tierKey(title)}, var(--text-secondary))`
}

const bands = computed(() =>
  props.thresholds.map((t, i) => {
    const from = Math.max(t.level, 1)
    const to = props.thresholds[i + 1]?.level ?? maxLevel.value
    return {
      title: t.title,
      from,
      left: ((from - 1) / (maxLevel.value - 1)) * 100,
      width: (Math.max(to - from, 0) / (maxLevel.value - 1)) * 100,
      color: tierColor(t.title),
    }
  }),
)

const currentTier = computed(() => {
  let match: LevelThreshold | null = null
  for (const t of props.thresholds) {
    if (t.level <= level.value) match = t
    else break
  }
  return match?.title ?? null
})

const focusAwards = computed<AwardGroup | null>(() => {
  const unlocked = [...awards.value].reverse().find((a) => a.level <= level.value)
  return unlocked ?? awards.value[0] ?? null
})

function latestOfType(typeKey: string): ItemResponse | null {
  let best: ItemResponse | null = null
  for (const item of props.itemsById.values()) {
    if (item.typeKey !== typeKey || item.unlockLevel == null) continue
    if (item.unlockLevel > level.value) continue
    if (!best || item.unlockLevel > (best.unlockLevel ?? 0)) best = item
  }
  return best
}

const wornTitle = computed(() => {
  const item = latestOfType('title')
  return item ? readTitleValue(item.value) : null
})

const wornBorderColor = computed(() => {
  const item = latestOfType('profile_border_color')
  return item ? readBorderColorValue(item.value) : null
})

const wornShape = computed(() => {
  const item = latestOfType('profile_border_shape')
  return item ? readBorderShapeValue(item.value) : null
})

const wornThumb = computed(() => {
  const item = latestOfType('profile_thumbnail_background')
  return item ? readThumbnailBackgroundValue(item.value) : null
})

const thumbScene = computed(() => wornThumb.value?.scene ?? null)
const thumbImageUrl = computed(() => pickAssetUrl(wornThumb.value?.asset))
const thumbStyle = computed<Record<string, string> | undefined>(() => {
  const opacity = wornThumb.value?.opacity
  return opacity != null ? { opacity: String(opacity) } : undefined
})

const levelPct = (l: number) => ((l - 1) / (maxLevel.value - 1)) * 100
</script>

<template>
  <div class="ladder">
    <div class="ladder__readouts">
      <span class="ladder__level">Level {{ level }}</span>
      <span v-if="currentTier" class="ladder__tier" :style="{ color: tierColor(currentTier) }">
        {{ currentTier }}
      </span>
      <span class="ladder__cost">this level asks for {{ xpForLevel(level).toLocaleString() }} XP</span>
      <button
        v-if="personalLevel && level !== personalLevel"
        type="button"
        class="ladder__jump"
        @click="level = personalLevel"
      >
        Jump to my level ({{ personalLevel }})
      </button>
    </div>

    <div class="ladder__track" aria-hidden="true">
      <div
        v-for="band in bands"
        :key="band.from"
        class="ladder__band"
        :style="{ left: `${band.left}%`, width: `${band.width}%`, background: band.color }"
        :title="band.title"
      />
      <button
        v-for="award in awards"
        :key="award.level"
        type="button"
        class="ladder__dot"
        :class="{ 'ladder__dot--passed': level >= award.level }"
        :style="{ left: `${levelPct(award.level)}%` }"
        :aria-label="`Rewards at level ${award.level}`"
        tabindex="-1"
        @click="level = award.level"
      />
      <div
        v-if="personalLevel"
        class="ladder__me"
        :style="{ left: `${levelPct(Math.min(personalLevel, maxLevel))}%` }"
        title="You are here"
      />
    </div>
    <input
      v-model.number="level"
      class="ladder__slider"
      type="range"
      :min="1"
      :max="maxLevel"
      :step="1"
      aria-label="Level"
    />

    <div class="ladder__stage">
      <div class="ladder__person">
        <div class="ladder__card">
          <div v-if="thumbScene || thumbImageUrl" class="ladder__card-bg" :style="thumbStyle" aria-hidden="true">
            <ThumbnailSceneRenderer v-if="thumbScene" :scene="thumbScene" />
            <img v-else-if="thumbImageUrl" class="ladder__card-img" :src="thumbImageUrl" alt="" />
          </div>
          <div class="ladder__card-content">
            <div class="ladder__badge">
              <LevelBadge
                :level="level"
                :current-xp="0"
                :required-xp="xpForLevel(level + 1)"
                :avatar-url="avatarUrl ?? logoUrl"
                :avatar-fallback-url="avatarFallbackUrl"
                hide-progress
                :equipped-title="wornTitle"
                :equipped-border-shape="wornShape"
                :equipped-border-color="wornBorderColor"
                :fallback-title="currentTier"
                :fallback-title-color="currentTier ? tierColor(currentTier) : null"
              />
            </div>
            <span class="ladder__card-name">{{ userName ?? 'You, eventually' }}</span>
          </div>
        </div>
      </div>
      <div v-if="focusAwards" class="ladder__reward">
        <span class="ladder__reward-when">
          {{ level >= focusAwards.level ? 'Unlocked at' : 'First unlock at' }} level
          {{ focusAwards.level }}
        </span>
        <div class="ladder__reward-items">
          <div v-for="item in focusAwards.items" :key="item.id" class="ladder__reward-entry">
            <RewardItemTile :item="item" :size="72" />
            <span class="ladder__reward-name">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ladder {
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  padding: var(--space-md);
  margin: 0 0 var(--space-md);
}

.ladder__readouts {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  flex-wrap: wrap;
  margin-bottom: var(--space-md);
}

.ladder__level {
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  font-weight: 500;
  color: var(--text-primary);
  display: inline-block;
  min-width: 9ch;
}

.ladder__tier {
  font-size: var(--text-card-title);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ladder__cost {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.ladder__jump {
  margin-left: auto;
  padding: 4px 10px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 500;
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease;
}

.ladder__jump:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.ladder__track {
  position: relative;
  height: 14px;
  margin-bottom: 2px;
}

.ladder__band {
  position: absolute;
  top: 5px;
  height: 4px;
  border-radius: 2px;
  opacity: 0.9;
}

.ladder__dot {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  padding: 0;
  transform: translate(-50%, -50%);
  border: 1px solid var(--text-tertiary);
  border-radius: 50%;
  background: var(--bg-surface);
  cursor: pointer;
}

.ladder__dot--passed {
  background: var(--accent);
  border-color: var(--accent);
}

.ladder__me {
  position: absolute;
  top: -4px;
  width: 2px;
  height: 22px;
  transform: translateX(-50%);
  background: var(--text-primary);
}

.ladder__slider {
  width: 100%;
  accent-color: var(--accent);
}

.ladder__stage {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xl);
  margin-top: var(--space-lg);
  flex-wrap: wrap;
}

.ladder__person {
  flex-shrink: 0;
}

.ladder__card {
  position: relative;
  width: 220px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  overflow: hidden;
}

.ladder__card-bg {
  position: absolute;
  inset: 0;
}

.ladder__card-bg :deep(canvas),
.ladder__card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ladder__card-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
}

.ladder__badge {
  width: 150px;
}

.ladder__card-name {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
}

.ladder__reward {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.ladder__reward-when {
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.ladder__reward-items {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.ladder__reward-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  min-width: 72px;
}

.ladder__reward-name {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-align: center;
  max-width: 140px;
}
</style>
