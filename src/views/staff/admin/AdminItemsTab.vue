<script setup lang="ts">
import AdminSubTabs, { type AdminSubTab } from '@/views/staff/admin/AdminSubTabs.vue'

const TABS: AdminSubTab[] = [
  { key: 'items', label: 'Items', load: () => import('./items/ItemsManagementTab.vue') },
  { key: 'types', label: 'Types', load: () => import('./items/ItemTypesManagementTab.vue') },
  { key: 'modifiers', label: 'Modifiers', load: () => import('./items/ItemModifiersListTab.vue') },
  { key: 'unusual', label: 'Unusual FX', load: () => import('./items/UnusualEffectsListTab.vue') },
  { key: 'crates', label: 'Crates', load: () => import('./items/CratesListTab.vue') },
  { key: 'award', label: 'Award', load: () => import('./items/AwardItemTab.vue') },
]
</script>

<template>
  <AdminSubTabs :tabs="TABS" query-key="itab" />
</template>
