<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useCategoryStore } from '@/stores/categories'
import { loadStoredCountry } from '@/utils/statsCountry'
import { computed, defineAsyncComponent, nextTick, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatsIcon from './stats/StatsIcon.vue'
import { STATS_SECTIONS, resolveSection, type SectionKey } from './stats/sections'

const LOADERS: Record<SectionKey, () => Promise<{ default: Component }>> = {
  leaderboards: () => import('./stats/LeaderboardStatsSection.vue'),
  items: () => import('./stats/ItemStatsSection.vue'),
  missions: () => import('./stats/MissionStatsSection.vue'),
  campaigns: () => import('./stats/CampaignStatsSection.vue'),
  events: () => import('./stats/EventStatsSection.vue'),
  platform: () => import('./stats/PlatformGrowthSection.vue'),
}

const SECTIONS = Object.fromEntries(
  Object.entries(LOADERS).map(([key, loader]) => [key, defineAsyncComponent(loader)]),
) as Record<SectionKey, Component>

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()

usePageMeta({
  title: 'Stats | AccSaber',
  description: 'Platform-wide statistics, leaderboards, and score distributions across AccSaber.',
})

const activeSection = computed(() => resolveSection(route.query.section))

const sectionRef = ref<unknown>(null)

function boardCount(): number {
  return document.querySelectorAll('[data-stats-board]').length
}

function sectionMounted(): Promise<void> {
  return new Promise((resolve) => {
    const stop = watch(sectionRef, (mounted) => {
      if (!mounted) return
      stop()
      resolve()
    }, { flush: 'post' })
  })
}

async function setSection(section: string) {
  if (section === activeSection.value) return
  const query: Record<string, string> = {}
  if (section !== 'leaderboards') query.section = section
  if (typeof route.query.country === 'string') query.country = route.query.country

  const loaded = await LOADERS[section as SectionKey]().then(() => true, () => false)
  if (!loaded || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    router.push({ query })
    return
  }
  const root = document.documentElement
  const before = boardCount()
  root.dataset.statsMorph = ''
  const transition = document.startViewTransition(async () => {
    const mounted = sectionMounted()
    await router.push({ query })
    await mounted
    await nextTick()
    const after = boardCount()
    if (before && after && after !== before) root.dataset.statsMorph = after < before ? 'fewer' : 'more'
  })
  void transition.finished.catch(() => undefined).finally(() => {
    delete root.dataset.statsMorph
  })
}

const storedCountry = route.query.country ? '' : loadStoredCountry()
const countryReady = ref(!storedCountry)
if (storedCountry) {
  router.replace({ query: { ...route.query, country: storedCountry } }).finally(() => {
    countryReady.value = true
  })
}

const accent = computed(() =>
  categoryStore.getAccent(
    activeSection.value === 'leaderboards' && typeof route.query.category === 'string'
      ? route.query.category
      : 'overall',
  ),
)
</script>

<template>
  <div class="stats" :style="{ '--page-accent': accent }">
    <header class="stats__header">
      <h1>Stats</h1>
      <BaseTabs class="stats__sections" variant="segmented" label="Section" :tabs="STATS_SECTIONS"
        :model-value="activeSection" @update:model-value="setSection">
        <template #tab="{ tab }">
          <span class="stats__section">
            <StatsIcon :icon="(tab as typeof STATS_SECTIONS[number]).icon" :size="16" />
            {{ tab.label }}
          </span>
        </template>
      </BaseTabs>
    </header>

    <component :is="SECTIONS[activeSection]" v-if="countryReady" ref="sectionRef" />
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.stats__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.stats__section {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.stats__sections {
  flex: none;
  max-width: 100%;
}

@media (max-width: 767px) {
  .stats__sections.base-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    flex: 1 1 100%;
  }

  .stats__sections :deep(.base-tabs__tab) {
    justify-content: center;
    padding: 0;
  }
}
</style>
