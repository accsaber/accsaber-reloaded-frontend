<script setup lang="ts">
import AdminSubTabs, { type AdminSubTab } from '@/views/staff/admin/AdminSubTabs.vue'

const TABS: AdminSubTab[] = [
  { key: 'jobs', label: 'Jobs', load: () => import('./operations/JobsTab.vue') },
  { key: 'players', label: 'Player Tools', load: () => import('./operations/PlayerToolsTab.vue') },
  { key: 'supporters', label: 'Supporters', load: () => import('./operations/SupportersTab.vue') },
  { key: 'broadcast', label: 'Broadcast', load: () => import('./operations/BroadcastTab.vue') },
]
</script>

<template>
  <AdminSubTabs :tabs="TABS" query-key="otab" />
</template>
