<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import type { ClanResponse, ClanStandingResponse } from '@/types/api/clans'
import type { Tab } from '@/types/display'
import { isUuid } from '@/utils/mapRoute'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ClanHeader from './clans/ClanHeader.vue'

type ClanTab = 'roster' | 'level' | 'standing' | 'cosmetics'

const TABS: Tab[] = [
  { key: 'roster', label: 'Roster' },
  { key: 'level', label: 'Level' },
  { key: 'standing', label: 'Standing' },
  { key: 'cosmetics', label: 'Cosmetics' },
]

const tabComponents: Record<ClanTab, ReturnType<typeof defineAsyncComponent>> = {
  roster: defineAsyncComponent(() => import('./clans/ClanRosterTab.vue')),
  level: defineAsyncComponent(() => import('./clans/ClanLevelTab.vue')),
  standing: defineAsyncComponent(() => import('./clans/ClanStandingTab.vue')),
  cosmetics: defineAsyncComponent(() => import('./clans/ClanCosmeticsTab.vue')),
}

function isClanTab(value: unknown): value is ClanTab {
  return TABS.some((t) => t.key === value)
}

const route = useRoute()
const router = useRouter()

const slugOrId = computed(() => String(route.params.slugOrId ?? ''))
const activeTab = computed<ClanTab>(() => (isClanTab(route.query.tab) ? route.query.tab : 'roster'))

const clan = ref<ClanResponse | null>(null)
const standing = ref<ClanStandingResponse | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

usePageMeta({
  title: computed(() => (clan.value ? `[${clan.value.clan.tag}] ${clan.value.clan.name} | AccSaber` : 'Clan | AccSaber')),
  description: computed(() => clan.value?.description ?? 'An AccSaber clan.'),
})

function setTab(tab: string) {
  router.replace({ query: { tab } })
}

async function load(key: string) {
  loading.value = true
  error.value = null
  standing.value = null
  try {
    const { getClan, getClanStanding } = await import('@/api/clans')
    const fetched = await getClan(key)
    clan.value = fetched
    if (isUuid(key) && fetched.clan.slug) {
      await router.replace({ params: { slugOrId: fetched.clan.slug }, query: route.query })
    }
    standing.value = await getClanStanding(fetched.clan.id).catch(() => null)
  } catch {
    clan.value = null
    error.value = 'Clan not found.'
  } finally {
    loading.value = false
  }
}

watch(
  slugOrId,
  (key, previous) => {
    if (clan.value && (key === clan.value.clan.slug || key === clan.value.clan.id) && previous) return
    if (key) load(key)
  },
  { immediate: true },
)
</script>

<template>
  <div class="clan-page">
    <template v-if="loading">
      <SkeletonLoader variant="card" height="260px" />
      <SkeletonLoader variant="text" :lines="4" />
    </template>

    <EmptyState v-else-if="error || !clan" :message="error ?? 'Clan not found.'" />

    <template v-else>
      <ClanHeader :clan="clan" :standing="standing" />

      <BaseTabs :tabs="TABS" :model-value="activeTab" @update:model-value="setTab" />

      <component :is="tabComponents[activeTab]" :key="activeTab" :clan="clan" />
    </template>
  </div>
</template>

<style scoped>
.clan-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}
</style>
