<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import type { UserItemResponse } from '@/types/api/items'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  items: UserItemResponse[]
  loading: boolean
  page: number
  totalPages: number
  search: string
  selectedLinkId?: string | null
  disabledLinkIds?: Set<string>
  placeholder?: string
  emptyMessage?: string
  error?: string | null
}>(), {
  selectedLinkId: null,
  disabledLinkIds: () => new Set<string>(),
  placeholder: 'Search your tradeable items...',
  emptyMessage: undefined,
  error: null,
})

const emit = defineEmits<{
  'update:search': [value: string]
  'update:page': [page: number]
  select: [item: UserItemResponse]
}>()

const empty = computed(() =>
  props.emptyMessage
  ?? (props.search ? 'No listable items match your search.' : 'You have no tradeable items to list.'),
)

function onSelect(linkId: string) {
  if (props.disabledLinkIds.has(linkId)) return
  const item = props.items.find((i) => i.linkId === linkId)
  if (item) emit('select', item)
}
</script>

<template>
  <div class="item-picker">
    <SearchBox
      :model-value="search"
      :placeholder="placeholder"
      @update:model-value="emit('update:search', $event)"
    />

    <p v-if="error" class="item-picker__error" role="alert">{{ error }}</p>

    <div v-if="loading" class="item-picker__grid">
      <SkeletonLoader v-for="i in 12" :key="i" variant="card" />
    </div>

    <EmptyState v-else-if="items.length === 0" :message="empty" />

    <template v-else>
      <div class="item-picker__grid">
        <div
          v-for="userItem in items"
          :key="userItem.linkId"
          class="item-picker__cell"
          :title="disabledLinkIds.has(userItem.linkId) ? 'Unequip this item before listing it' : undefined"
        >
          <InventoryItemCell
            :user-item="userItem"
            :selected="userItem.linkId === selectedLinkId"
            :locked="disabledLinkIds.has(userItem.linkId)"
            @select="onSelect"
          />
        </div>
      </div>

      <PaginationControls
        :page="page"
        :total-pages="totalPages"
        @update:page="emit('update:page', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.item-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.item-picker__error {
  margin: 0;
  padding: var(--space-sm) 10px;
  font-size: var(--text-caption);
  color: var(--error);
  background: color-mix(in srgb, var(--error) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--error) 35%, transparent);
  border-radius: var(--radius-btn);
}

.item-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--space-sm);
}
</style>
