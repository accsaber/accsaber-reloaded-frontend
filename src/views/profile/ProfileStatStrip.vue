<script setup lang="ts">
import StatBlock from '@/components/common/StatBlock.vue'
import CategoryTabs from '@/components/domain/CategoryTabs.vue'
import type { StatsDiffResponse, UserCategoryStatisticsResponse } from '@/types/api/users'
import type { CategoryCode } from '@/types/display'
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
  <div ref="tabsRef" class="profile-stats__tabs">
    <CategoryTabs v-model="category" :exclude="['xp']" />
  </div>

  <div class="profile-stats">
    <StatBlock class="profile-stats__ap" label="Total AP" :value="stats?.ap ?? 0" :trend="statsDiff?.apDiff">
      <template #label-suffix>
        <ApToNextTooltip :user-id="userId" :category="category" />
      </template>
    </StatBlock>
    <component :is="cell.to ? RouterLink : 'div'" v-for="cell in rankCells" :key="cell.label"
      v-bind="cell.to ? { to: cell.to } : {}" class="profile-stats__link">
      <StatBlock :label="cell.label" :value="cell.value" :decimals="0" :trend="cell.trend" />
    </component>
    <StatBlock label="Ranked Plays" :value="stats?.rankedPlays ?? 0" :decimals="0"
      :trend="statsDiff?.rankedPlaysDiff" />
  </div>
</template>

<style scoped>
.profile-stats__tabs {
  display: flex;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-md);
}

.profile-stats :deep(.stat-block) {
  padding: 0;
}

.profile-stats :deep(.stat-block__value) {
  font-size: var(--text-stat-lg);
  line-height: 1.2;
}

.profile-stats__ap :deep(.stat-block__value) {
  font-size: 2rem;
  line-height: 0.9;
}

.profile-stats__link {
  color: inherit;
  text-decoration: none;
}

a.profile-stats__link:hover :deep(.stat-block__label) {
  color: var(--accent);
}

@media (max-width: 767px) {
  .profile-stats__tabs {
    justify-content: center;
    max-width: 100%;
  }

  .profile-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-lg) var(--space-md);
    width: 100%;
  }

  .profile-stats :deep(.stat-block) {
    align-items: center;
  }
}
</style>
