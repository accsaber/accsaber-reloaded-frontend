<script setup lang="ts">
import AdminSubTabs, { type AdminSubTab } from '@/views/staff/admin/AdminSubTabs.vue'

const TABS: AdminSubTab[] = [
  { key: 'clans', label: 'Clans', load: () => import('./clans/ClanBrowserTab.vue') },
  { key: 'seasons', label: 'Seasons', load: () => import('./clans/ClanSeasonsTab.vue') },
  { key: 'rewards', label: 'War Rewards', load: () => import('./clans/ClanWarRewardsTab.vue') },
  { key: 'banned', label: 'Banned Maps', load: () => import('./clans/ClanWarBannedMapsTab.vue') },
  { key: 'levels', label: 'Levels', load: () => import('./clans/ClanLevelsTab.vue') },
]
</script>

<template>
  <AdminSubTabs :tabs="TABS" query-key="ctab" :clear-keys="['clan']" />
</template>
