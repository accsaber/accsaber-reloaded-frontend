<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { PublicClanResponse } from '@/types/api/clans'
import { getRankClass } from '@/utils/ranking'
import { computed } from 'vue'

export interface PodiumEntry {
  rank: number
  clan: PublicClanResponse
  value: string
}

const props = defineProps<{
  entries: PodiumEntry[]
  loading?: boolean
}>()

const ordered = computed(() => [...props.entries].sort((a, b) => a.rank - b.rank).slice(0, 3))
</script>

<template>
  <div class="podium" :class="{ 'podium--loading': loading }">
    <template v-if="loading">
      <SkeletonLoader v-for="i in 3" :key="i" variant="card" class="podium__skeleton" />
    </template>
    <RouterLink
      v-for="entry in ordered"
      v-else
      :key="entry.clan.id"
      :to="{ name: 'clan-detail', params: { slugOrId: entry.clan.slug } }"
      class="podium__card"
      :class="[`podium__card--${entry.rank}`, getRankClass(entry.rank)]"
    >
      <span class="podium__rank">#{{ entry.rank }}</span>
      <ClanIcon :clan="entry.clan" :size="entry.rank === 1 ? 88 : 64" class="podium__icon" />
      <ClanTag :clan="entry.clan" effects class="podium__tag" />
      <ClanName class="podium__name" :clan="entry.clan" />
      <span class="podium__value">{{ entry.value }}</span>
    </RouterLink>
  </div>
</template>

<style scoped>
.podium {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md);
  align-items: end;
}

.podium__skeleton {
  height: 220px;
}

.podium__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-lg) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-top: 2px solid var(--podium-accent, var(--bg-overlay));
  border-radius: var(--radius-card);
  color: var(--text-primary);
  text-decoration: none;
  text-align: center;
  transition: border-color 120ms ease;
}

.podium__card:hover {
  border-color: var(--text-tertiary);
  border-top-color: var(--podium-accent, var(--text-tertiary));
}

.podium__card--1 {
  order: 2;
  padding-top: var(--space-xl);
  padding-bottom: var(--space-xl);
}

.podium__card--2 {
  order: 1;
}

.podium__card--3 {
  order: 3;
}

.rank--gold {
  --podium-accent: var(--tier-gold);
}

.rank--silver {
  --podium-accent: var(--tier-silver);
}

.rank--bronze {
  --podium-accent: var(--tier-bronze);
}

.podium__rank {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 700;
  color: var(--podium-accent, var(--text-secondary));
}

.podium__icon {
  margin: var(--space-xs) 0;
}

.podium__tag {
  font-size: var(--text-card-title);
}

.podium__card--1 .podium__tag {
  font-size: var(--text-section-heading);
}

.podium__name {
  max-width: 100%;
  font-size: var(--text-card-title);
  font-weight: 600;
}

.podium__card--1 .podium__name {
  font-size: var(--text-section-heading);
}

.podium__value {
  margin-top: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--page-accent, var(--accent));
}

.podium__card--1 .podium__value {
  font-size: var(--text-page-title);
}

@media (max-width: 767px) {
  .podium {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .podium__card--1,
  .podium__card--2,
  .podium__card--3 {
    order: initial;
  }

  .podium__skeleton {
    height: 120px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .podium__card {
    transition: none;
  }
}
</style>
