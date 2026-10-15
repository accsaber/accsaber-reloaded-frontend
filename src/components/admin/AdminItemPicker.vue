<script setup lang="ts">
import BaseModal from '@/components/common/BaseModal.vue'
import { useItemSearch } from '@/composables/useItemSearch'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ItemResponse, UserItemResponse } from '@/types/api/items'
import ItemPickerGrid from '@/components/domain/ItemPickerGrid.vue'
import { computed } from 'vue'

const props = defineProps<{
  excludeIds: string[]
  title: string
  parentTypeKey?: string
}>()

const emit = defineEmits<{
  close: []
  pick: [item: ItemResponse]
}>()

const itemTypeStore = useItemTypeStore()

const excluded = computed(() => new Set(props.excludeIds))

const allowedTypeIds = computed(() => {
  if (!props.parentTypeKey) return null
  const parent = itemTypeStore.itemTypes.find((t) => t.key === props.parentTypeKey)
  if (!parent) return new Set<string>()
  return new Set(itemTypeStore.itemTypes.filter((t) => t.parentTypeId === parent.id).map((t) => t.id))
})

async function loadItems() {
  await itemTypeStore.fetchItemTypes()
  const { getAdminItems } = await import('@/api/admin/items')
  return getAdminItems({ includeInactive: false })
}

const { pickable, fetching, error, search, page, totalPages, paged } = useItemSearch(
  loadItems,
  (i) => !i.deprecated && !excluded.value.has(i.id) && (!allowedTypeIds.value || allowedTypeIds.value.has(i.typeId)),
)

const emptyMessage = computed(() =>
  pickable.value.length === 0 ? 'No items available.' : 'No items match that search.',
)

function onSelect(userItem: UserItemResponse) {
  emit('pick', userItem.item)
}
</script>

<template>
  <BaseModal :open="true" :title="title" @close="emit('close')">
    <ItemPickerGrid
      v-model:search="search"
      v-model:page="page"
      class="admin-item-picker"
      :items="paged"
      :loading="fetching"
      :total-pages="totalPages"
      :error="error"
      :empty-message="emptyMessage"
      placeholder="Search items by name"
      @select="onSelect"
    />
  </BaseModal>
</template>

<style scoped>
.admin-item-picker {
  width: min(680px, 100%);
}
</style>
