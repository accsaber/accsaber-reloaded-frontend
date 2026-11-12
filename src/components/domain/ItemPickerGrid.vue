<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import { useRowSwap } from '@/composables/useRowSwap'
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
  disabledTitle?: string
  checkedLinkIds?: Set<string>
  full?: boolean
  pageSize?: number
  placeholder?: string
  emptyMessage?: string
  error?: string | null
}>(), {
  selectedLinkId: null,
  disabledLinkIds: () => new Set<string>(),
  disabledTitle: 'Unequip this item before listing it',
  checkedLinkIds: undefined,
  full: false,
  pageSize: 0,
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

const { shown, cascade, isStale, renderKey } = useRowSwap(() => props.items, {
  key: (userItem) => userItem.linkId,
  refreshing: () => props.loading,
})

const fillers = computed(() =>
  props.totalPages > 1 && props.pageSize ? Math.max(0, props.pageSize - shown.value.length) : 0,
)

function selectable(linkId: string): boolean {
  return !props.disabledLinkIds.has(linkId) && (!props.full || !!props.checkedLinkIds?.has(linkId))
}

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

    <div v-if="loading && items.length === 0" class="item-picker__reserved" aria-busy="true" />

    <EmptyState v-else-if="items.length === 0" :message="empty" />

    <template v-else>
      <div class="item-picker__grid stagger" :style="{ '--n': shown.length }">
        <div
          v-for="(userItem, i) in shown"
          :key="renderKey(userItem, i)"
          :class="{ stale: isStale(i) }"
          :style="{ '--i': cascade ? i : 0 }"
          :title="disabledLinkIds.has(userItem.linkId) ? disabledTitle : undefined"
        >
          <InventoryItemCell
            :user-item="userItem"
            :selected="userItem.linkId === selectedLinkId"
            :locked="disabledLinkIds.has(userItem.linkId)"
            :select-mode="!!checkedLinkIds"
            :checked="checkedLinkIds?.has(userItem.linkId)"
            :selectable="selectable(userItem.linkId)"
            @select="onSelect"
            @toggle="onSelect"
          />
        </div>
        <div v-for="n in fillers" :key="n" class="item-picker__filler" aria-hidden="true" />
      </div>

      <PaginationControls
        v-if="totalPages > 1"
        :page="page"
        :total-pages="totalPages"
        @update:page="emit('update:page', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.item-picker {
  --tile: 96px;
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
  grid-template-columns: repeat(auto-fill, minmax(var(--tile), 1fr));
  gap: var(--space-sm);
}

.item-picker__reserved {
  height: calc(var(--tile) * 3);
}

.item-picker__filler {
  aspect-ratio: 1 / 1;
}
</style>
