<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { adminTabLabel, DEFAULT_ADMIN_TAB, isAdminTab, type AdminTab } from '@/utils/adminTabs'

const route = useRoute()

const activeTab = computed<AdminTab>(() =>
  isAdminTab(route.query.tab) ? route.query.tab : DEFAULT_ADMIN_TAB,
)

const tabComponents: Record<AdminTab, ReturnType<typeof defineAsyncComponent>> = {
  users: defineAsyncComponent(() => import('./admin/AdminUsersTab.vue')),
  milestones: defineAsyncComponent(() => import('./admin/AdminMilestonesTab.vue')),
  campaigns: defineAsyncComponent(() => import('./admin/AdminCampaignsTab.vue')),
  news: defineAsyncComponent(() => import('./admin/AdminNewsTab.vue')),
  events: defineAsyncComponent(() => import('./admin/AdminEventsTab.vue')),
  clans: defineAsyncComponent(() => import('./admin/AdminClansTab.vue')),
  operations: defineAsyncComponent(() => import('./admin/AdminOperationsTab.vue')),
  items: defineAsyncComponent(() => import('./admin/AdminItemsTab.vue')),
}

const activeComponent = computed(() => tabComponents[activeTab.value])

usePageMeta({
  title: computed(() => `${adminTabLabel(activeTab.value)} | AccSaber Admin`),
  description: 'AccSaber administration.',
})
</script>

<template>
  <div class="admin-page">
    <Suspense>
      <component :is="activeComponent" :key="activeTab" />
      <template #fallback>
        <SkeletonLoader class="placeholder" height="600px" />
      </template>
    </Suspense>
  </div>
</template>

<style scoped>
.admin-page {
  width: 100%;
  max-width: 1280px;
  min-width: 0;
  margin: 0 auto;
}
</style>
