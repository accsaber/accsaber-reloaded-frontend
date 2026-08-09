<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CampaignFilterBar from '@/components/domain/CampaignFilterBar.vue'
import CampaignRow from '@/components/domain/CampaignRow.vue'
import { useCampaignTags } from '@/composables/useCampaignTags'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useUserCampaigns } from '@/composables/useUserCampaigns'
import {
  USER_CAMPAIGN_SORT_OPTIONS,
  type CampaignFilterState,
  createCampaignFilterState,
} from '@/utils/campaignFilters'
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    userId?: string | null
    emptyMessage?: string
  }>(),
  { userId: null, emptyMessage: 'No campaigns match these filters.' },
)

const controls = ref<CampaignFilterState>(createCampaignFilterState())

const debouncedSearch = useDebouncedRef(
  computed(() => controls.value.search),
  300,
)

const filters = computed<CampaignFilterState>(() => ({
  ...controls.value,
  search: debouncedSearch.value.trim(),
}))

const { tags, load: loadTags } = useCampaignTags()

const { runs, loading, error, page, totalPages, reload } = useUserCampaigns(
  () => props.userId,
  filters,
)

onMounted(() => {
  void loadTags()
  void reload()
})
</script>

<template>
  <div class="user-campaigns">
    <div class="user-campaigns__controls">
      <SearchBox v-model="controls.search" class="user-campaigns__search"
        placeholder="Search title or creator..." />
      <CampaignFilterBar v-model="controls" :tags="tags"
        :sort-options="USER_CAMPAIGN_SORT_OPTIONS" show-curated show-progress />
    </div>

    <div v-if="error" class="user-campaigns__error" role="alert">{{ error }}</div>

    <div v-if="loading" class="user-campaigns__grid">
      <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
    </div>

    <EmptyState v-else-if="!error && runs.length === 0" :message="emptyMessage" />

    <div v-else class="user-campaigns__grid">
      <CampaignRow v-for="run in runs" :key="run.id" :campaign="run.campaign" :progress="run" />
    </div>

    <div v-if="totalPages > 1 && !loading" class="user-campaigns__pagination">
      <PaginationControls v-model:page="page" :total-pages="totalPages" />
    </div>
  </div>
</template>

<style scoped>
.user-campaigns {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.user-campaigns__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.user-campaigns__search {
  max-width: 320px;
}

.user-campaigns__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-md);
}

.user-campaigns__pagination {
  display: flex;
  justify-content: center;
}

.user-campaigns__error {
  padding: var(--space-md);
  font-size: var(--text-caption);
  color: var(--error);
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 40%, transparent);
  border-radius: 4px;
}

@media (max-width: 640px) {
  .user-campaigns__search {
    max-width: 100%;
  }
}
</style>
