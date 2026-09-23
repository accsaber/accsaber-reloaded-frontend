<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import { computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type ClansSubTab = 'levels' | 'seasons' | 'rewards' | 'moderate'
const VALID: ClansSubTab[] = ['levels', 'seasons', 'rewards', 'moderate']

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'levels', label: 'Levels' },
  { key: 'seasons', label: 'Seasons' },
  { key: 'rewards', label: 'War rewards' },
  { key: 'moderate', label: 'Moderate' },
]

const subTab = computed<ClansSubTab>(() => {
  const t = route.query.ctab as string
  return (VALID.includes(t as ClansSubTab) ? t : 'levels') as ClansSubTab
})

function setSubTab(key: string) {
  router.replace({ query: { ...route.query, ctab: key } })
}

const subComponents: Record<ClansSubTab, ReturnType<typeof defineAsyncComponent>> = {
  levels: defineAsyncComponent(() => import('./clans/ClanLevelsTab.vue')),
  seasons: defineAsyncComponent(() => import('./clans/ClanSeasonsTab.vue')),
  rewards: defineAsyncComponent(() => import('./clans/ClanWarRewardsTab.vue')),
  moderate: defineAsyncComponent(() => import('./clans/ClanModerateTab.vue')),
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
