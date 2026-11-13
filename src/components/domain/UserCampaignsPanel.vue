<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import CampaignFilterBar from '@/components/domain/CampaignFilterBar.vue'
import CampaignGrid from '@/components/domain/CampaignGrid.vue'
import CampaignRow from '@/components/domain/CampaignRow.vue'
import { useCampaignTags } from '@/composables/useCampaignTags'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useUserCampaigns } from '@/composables/useUserCampaigns'
import { useAuthStore } from '@/stores/auth'
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
  { userId: null, emptyMessage: 'No campaigns yet' },
)

const auth = useAuthStore()

const viewingUserId = computed(() =>
  props.userId && props.userId !== auth.userId ? props.userId : null,
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

const { runs, loading, error, page, totalPages } = useUserCampaigns(
  () => props.userId,
  filters,
)

const filtered = computed(() => {
  const { search, official, curated, loved, tagIds, progressStatus } = controls.value
  return !!search || official || curated || loved || tagIds.length > 0 || progressStatus.length > 0
})

const empty = computed(() => !loading.value && !error.value && runs.value.length === 0)

onMounted(loadTags)
</script>

<template>
  <div class="user-campaigns">
    <div v-if="filtered || !empty" class="user-campaigns__controls">
      <SearchBox v-model="controls.search" placeholder="Search title or creator..." />
      <CampaignFilterBar v-model="controls" :tags="tags"
        :sort-options="USER_CAMPAIGN_SORT_OPTIONS" show-curated show-progress />
    </div>

    <p v-if="error" class="caption user-campaigns__error" role="alert">{{ error }}</p>

    <EmptyState v-if="empty" :message="filtered ? 'No campaigns match these filters' : emptyMessage" />

    <CampaignGrid v-else :items="runs" :item-key="(run) => run.id" :loading="loading && runs.length === 0"
      :refreshing="loading && runs.length > 0">
      <template #default="{ item, swap }">
        <CampaignRow :campaign="item.campaign" :progress="item" :viewing-user-id="viewingUserId" v-bind="swap" />
      </template>
    </CampaignGrid>

    <PaginationControls v-if="totalPages > 1" v-model:page="page" :total-pages="totalPages" />
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
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.user-campaigns__controls :deep(.search-box) {
  flex: 0 1 320px;
}

.user-campaigns__error {
  color: var(--error);
}

@media (max-width: 767px) {
  .user-campaigns__controls :deep(.search-box) {
    flex: 1 1 100%;
  }
}
</style>
