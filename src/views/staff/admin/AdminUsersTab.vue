<script setup lang="ts">
import AdminSubTabs, { type AdminSubTab } from '@/views/staff/admin/AdminSubTabs.vue'

const TABS: AdminSubTab[] = [
  { key: 'players', label: 'Players', load: () => import('./users/PlayersTab.vue') },
  { key: 'staff', label: 'Staff', load: () => import('./users/StaffTab.vue') },
  { key: 'duplicates', label: 'Duplicates', load: () => import('./users/DuplicatesTab.vue') },
]
</script>

<template>
  <AdminSubTabs :tabs="TABS" query-key="utab" :clear-keys="['q']" />
</template>
