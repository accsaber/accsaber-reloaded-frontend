<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { computed, defineAsyncComponent, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface AdminSubTab {
  key: string
  label: string
  load: () => Promise<{ default: Component }>
}

const props = defineProps<{
  tabs: AdminSubTab[]
  queryKey: string
  clearKeys?: string[]
}>()

const route = useRoute()
const router = useRouter()

const components = Object.fromEntries(props.tabs.map((tab) => [tab.key, defineAsyncComponent(tab.load)]))

const active = computed(() => {
  const value = route.query[props.queryKey]
  return typeof value === 'string' && value in components ? value : props.tabs[0].key
})

function select(key: string) {
  const query = { ...route.query, [props.queryKey]: key }
  for (const stale of ['page', ...(props.clearKeys ?? [])]) delete query[stale]
  void router.replace({ query })
}
</script>

<template>
  <div class="admin-sub">
    <BaseTabs :tabs="tabs" :model-value="active" @update:model-value="select" />
    <Suspense>
      <component :is="components[active]" :key="active" class="admin-sub__panel" />
      <template #fallback>
        <SkeletonLoader class="placeholder" height="400px" />
      </template>
    </Suspense>
  </div>
</template>

<style scoped>
.admin-sub {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.admin-sub__panel {
  animation: settle-in var(--dur-enter) var(--ease-out) backwards;
}
</style>
