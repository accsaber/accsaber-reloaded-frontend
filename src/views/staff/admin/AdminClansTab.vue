<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import { computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type ClansSubTab = 'clans' | 'seasons' | 'rewards' | 'levels'
const VALID: ClansSubTab[] = ['clans', 'seasons', 'rewards', 'levels']

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'clans', label: 'Clans' },
  { key: 'seasons', label: 'Seasons' },
  { key: 'rewards', label: 'War rewards' },
  { key: 'levels', label: 'Levels' },
]

const subTab = computed<ClansSubTab>(() => {
  const t = route.query.ctab as string
  return (VALID.includes(t as ClansSubTab) ? t : 'clans') as ClansSubTab
})

function setSubTab(key: string) {
  const query = { ...route.query }
  delete query.clan
  router.replace({ query: { ...query, ctab: key } })
}

const subComponents: Record<ClansSubTab, ReturnType<typeof defineAsyncComponent>> = {
  clans: defineAsyncComponent(() => import('./clans/ClanBrowserTab.vue')),
  seasons: defineAsyncComponent(() => import('./clans/ClanSeasonsTab.vue')),
  rewards: defineAsyncComponent(() => import('./clans/ClanWarRewardsTab.vue')),
  levels: defineAsyncComponent(() => import('./clans/ClanLevelsTab.vue')),
}

const activeComponent = computed(() => subComponents[subTab.value])
</script>

<template>
  <div class="admin-clans">
    <BaseTabs :tabs="tabs" :model-value="subTab" @update:model-value="setSubTab" />
    <div class="admin-clans__body">
      <component :is="activeComponent" :key="subTab" />
    </div>
  </div>
</template>

<style scoped>
.admin-clans {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.admin-clans__body {
  min-height: 400px;
}
</style>
