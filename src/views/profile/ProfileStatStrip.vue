<script setup lang="ts">
import StatBlock from '@/components/common/StatBlock.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import type { StatsDiffResponse, UserCategoryStatisticsResponse } from '@/types/api/users'
import type { CategoryCode } from '@/types/display'
import { getRankClass } from '@/utils/ranking'
import ApToNextTooltip from '@/views/profile/ApToNextTooltip.vue'
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps<{
  userId: string
  country: string | null
  stats: UserCategoryStatisticsResponse | null
  statsDiff: StatsDiffResponse | null
}>()

const category = defineModel<CategoryCode>('category', { required: true })

const emit = defineEmits<{
  'tabs-hidden': [hidden: boolean]
}>()

function rankRoute(ranking: number | null | undefined, country?: string | null) {
  if (!ranking) return null
  return {
    name: 'leaderboards-category',
    params: { categoryCode: category.value },
    query: { ...(country ? { country } : {}), page: String(Math.ceil(ranking / 50)), highlight: props.userId },
  }
}

const rankCells = computed(() => {
  const s = props.stats
  const d = props.statsDiff
  return [
    {
      label: 'Global Rank',
      value: s?.ranking ?? 0,
      trend: d?.rankingDiff ? -d.rankingDiff : undefined,
      to: rankRoute(s?.ranking),
    },
    {
      label: 'Country Rank',
      value: s?.countryRanking ?? 0,
      trend: d?.countryRankingDiff ? -d.countryRankingDiff : undefined,
      to: props.country ? rankRoute(s?.countryRanking, props.country) : null,
    },
  ]
})

const tabsRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
const navbarQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null

function observeTabs() {
  observer?.disconnect()
  observer = null
  const el = tabsRef.value
  if (!el) {
    emit('tabs-hidden', false)
    return
  }
  const navbarHeight
    = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 64
  observer = new IntersectionObserver(
    ([entry]) => emit('tabs-hidden', entry.boundingClientRect.bottom <= navbarHeight),
    { rootMargin: `-${navbarHeight}px 0px 0px 0px` },
  )
  observer.observe(el)
}

watch(tabsRef, observeTabs)
navbarQuery?.addEventListener('change', observeTabs)

onUnmounted(() => {
  observer?.disconnect()
  navbarQuery?.removeEventListener('change', observeTabs)
  emit('tabs-hidden', false)
})
</script>

<template>
  <div ref="tabsRef" class="profile-stats__category-tabs">
    <CategoryTabs v-model="category" :exclude="['xp']" />
  </div>

  <div class="profile-stats">
    <StatBlock label="Total AP" :value="stats?.ap ?? 0" :trend="statsDiff?.apDiff">
      <template #label-suffix>
        <ApToNextTooltip :user-id="userId" :category="category" />
      </template>
    </StatBlock>
    <component :is="cell.to ? RouterLink : 'div'" v-for="cell in rankCells" :key="cell.label"
      v-bind="cell.to ? { to: cell.to } : {}" class="profile-stats__rank-block">
      <StatBlock :label="cell.label" :value="cell.value" :decimals="0" :trend="cell.trend" />
      <span v-if="cell.value && cell.value <= 3" class="profile-stats__rank-badge"
        :class="getRankClass(cell.value)">#{{ cell.value }}</span>
    </component>
    <StatBlock label="Ranked Plays" :value="stats?.rankedPlays ?? 0" :decimals="0"
      :trend="statsDiff?.rankedPlaysDiff" />
  </div>
</template>

<style scoped>
.profile-stats__category-tabs {
  display: flex;
  justify-content: flex-start;
  margin-top: var(--space-xs);
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin-top: auto;
  border-top: 1px solid var(--bg-overlay);
  border-bottom: 1px solid var(--bg-overlay);
}

.profile-stats > * + * {
  border-inline-start: 1px solid var(--bg-overlay);
}

.profile-stats :deep(.stat-block) {
  padding: var(--space-md) var(--space-lg);
  gap: var(--space-xs);
}

.profile-stats :deep(.stat-block__value) {
  font-size: 2rem;
  line-height: 1;
  letter-spacing: -0.01em;
}

.profile-stats :deep(.stat-block__label) {
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.profile-stats__rank-block {
  position: relative;
  color: inherit;
  text-decoration: none;
  transition: background-color 120ms ease;
}

a.profile-stats__rank-block:hover {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

a.profile-stats__rank-block:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}

.profile-stats__rank-badge {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-pill);
  letter-spacing: 0.02em;
}

@media (max-width: 767px) {
  .profile-stats__category-tabs {
    width: 100%;
  }

  .profile-stats__category-tabs :deep(.base-tabs) {
    flex-wrap: nowrap;
    justify-content: space-between;
    gap: 0;
    width: 100%;
  }

  .profile-stats__category-tabs :deep(.base-tabs__tab) {
    padding-inline: var(--space-xs);
    font-size: 0.8125rem;
    white-space: nowrap;
  }
}

@media (max-width: 599px) {
  .profile-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-stats > * + * {
    border-inline-start: none;
  }

  .profile-stats > *:nth-child(n + 3) {
    border-block-start: 1px solid var(--bg-overlay);
  }

  .profile-stats :deep(.stat-block__value) {
    font-size: 1.625rem;
  }
}

@media (max-width: 379px) {
  .profile-stats__category-tabs :deep(.base-tabs__tab) {
    padding-inline: 2px;
    font-size: 0.75rem;
  }
}
</style>
