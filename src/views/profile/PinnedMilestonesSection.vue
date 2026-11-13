<script setup lang="ts">
import StoredFold from '@/components/common/StoredFold.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import MilestoneBadge from '@/components/domain/MilestoneBadge.vue'
import type { UserMilestoneProgressResponse } from '@/types/api/users'
import { resolveMilestoneGlyph } from '@/utils/milestoneIcons'
import { STANDARD_PIN_SLOTS } from '@/utils/constants'
import { computed } from 'vue'
import { formatPercent, formatShortDate } from '@/utils/formatters'

const props = withDefaults(
  defineProps<{
    pinned: UserMilestoneProgressResponse[]
    loading: boolean
    isSelfProfile: boolean
    maxSlots?: number
  }>(),
  { maxSlots: STANDARD_PIN_SLOTS },
)

const emit = defineEmits<{ unpin: [milestoneId: string] }>()

const cards = computed(() =>
  props.pinned.map((pin) => ({
    pin,
    glyph: resolveMilestoneGlyph(pin.iconGroup, pin.querySpec),
    rarity: `${formatPercent(pin.completionPercentage ?? 0)}% of players`,
    completedOn: pin.completedAt ? formatShortDate(pin.completedAt) : null,
  })),
)
</script>

<template>
  <StoredFold v-if="loading || pinned.length > 0" label="Milestones" storage-key="pinned-milestones"
    aria-label="Pinned milestones">
    <template #meta>
      <span v-if="isSelfProfile && !loading" class="caption">{{ pinned.length }} of {{ maxSlots }}</span>
    </template>

    <SwapList class="pinned-ms__grid" :items="cards" :item-key="(card) => card.pin.milestoneId" :loading="loading"
      :placeholders="Math.min(maxSlots, 3)">
      <template #placeholder>
        <SkeletonLoader class="placeholder" variant="text" height="80px" />
      </template>
      <template #default="{ item: card, swap }">
      <article class="pinned-ms__card" v-bind="swap">
        <MilestoneBadge :glyph="card.glyph" :tier="card.pin.tier" :size="48" completed />

        <div class="pinned-ms__text">
          <h3 class="card-title">{{ card.pin.title }}</h3>
          <p v-if="card.pin.description" class="pinned-ms__desc">{{ card.pin.description }}</p>
          <p class="pinned-ms__meta">
            {{ card.rarity }}
            <template v-if="card.completedOn"> · {{ card.completedOn }}</template>
          </p>
        </div>

        <button
          v-if="isSelfProfile"
          type="button"
          class="pinned-ms__unpin"
          aria-label="Unpin milestone"
          @click="emit('unpin', card.pin.milestoneId)"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" aria-hidden="true">
            <path d="M5 5l10 10M15 5 5 15" />
          </svg>
        </button>
      </article>
      </template>
    </SwapList>
  </StoredFold>
</template>

<style scoped>
.pinned-ms {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.pinned-ms__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
}

.pinned-ms__card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  padding: var(--space-md);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.pinned-ms__text {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.pinned-ms__desc {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.45;
}

.pinned-ms__meta {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.pinned-ms__unpin {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: var(--radius-btn);
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}

.pinned-ms__unpin svg {
  width: 14px;
  height: 14px;
}

.pinned-ms__card:hover .pinned-ms__unpin,
.pinned-ms__unpin:focus-visible {
  opacity: 1;
}

.pinned-ms__unpin:hover {
  color: var(--error);
}

@media (hover: none) {
  .pinned-ms__unpin {
    opacity: 1;
  }
}
</style>
