<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type { ClanItemResponse, ClanResponse } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { CLAN_ITEM_SOURCE_LABEL } from '@/utils/clans'
import { rarityClass } from '@/utils/items'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{ clan: ClanResponse }>()

const route = useRoute()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'acquiredAt',
  defaultOrder: 'desc',
  defaultSize: 50,
  secondarySort: null,
})

const pageData = ref<Page<ClanItemResponse> | null>(null)
const loading = ref(true)

const items = computed(() => pageData.value?.content ?? [])
const totalPages = computed(() => pageData.value?.totalPages ?? 0)

async function fetchItems() {
  loading.value = true
  try {
    const { getClanItems } = await import('@/api/clans')
    pageData.value = await getClanItems(props.clan.clan.id, { page: paginationParams.value.page, size: 50 })
  } catch {
    pageData.value = null
  } finally {
    loading.value = false
  }
}

watch(() => route.query.page, fetchItems, { immediate: true })
</script>

<template>
  <section class="cosmetics">
    <div v-if="loading" class="cosmetics__grid">
      <SkeletonLoader v-for="i in 8" :key="i" variant="card" class="cosmetics__skeleton" />
    </div>

    <EmptyState v-else-if="items.length === 0" message="This clan has not earned any cosmetics yet." />

    <div v-else class="cosmetics__grid">
      <div
        v-for="entry in items"
        :key="entry.item.id"
        class="cosmetic"
        :class="[rarityClass(entry.item.rarity), { 'cosmetic--equipped': entry.equipped }]"
      >
        <span class="cosmetic__art">
          <ItemPreview :item="entry.item" />
        </span>
        <span class="cosmetic__name">{{ entry.item.name }}</span>
        <span class="cosmetic__meta">
          <span class="cosmetic__source">{{ CLAN_ITEM_SOURCE_LABEL[entry.source] }}</span>
          <span v-if="entry.equipped" class="cosmetic__equipped">Equipped</span>
        </span>
      </div>
    </div>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
  </section>
</template>

<style scoped>
.cosmetics {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.cosmetics__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-md);
}

.cosmetics__skeleton {
  aspect-ratio: 1;
}

.cosmetic {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.cosmetic--equipped {
  border-color: var(--page-accent, var(--accent));
}

.cosmetic__art {
  display: flex;
  aspect-ratio: 1;
  width: 100%;
  padding: var(--space-sm);
  background: var(--bg-base);
  border-radius: var(--radius-btn);
  overflow: hidden;
}

.cosmetic__name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--rarity-color, var(--text-primary));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cosmetic__meta {
  display: flex;
  justify-content: space-between;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.cosmetic__equipped {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--page-accent, var(--accent));
}
</style>
