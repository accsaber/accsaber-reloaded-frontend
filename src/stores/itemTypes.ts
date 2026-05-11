import { getItemTypes } from '@/api/items'
import type { ItemTypeKey, ItemTypeResponse } from '@/types/api/items'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useItemTypeStore = defineStore('itemTypes', () => {
  const itemTypes = ref<ItemTypeResponse[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  const byId = computed(() => {
    const map = new Map<string, ItemTypeResponse>()
    for (const t of itemTypes.value) map.set(t.id, t)
    return map
  })

  const byKey = computed(() => {
    const map = new Map<ItemTypeKey, ItemTypeResponse>()
    for (const t of itemTypes.value) map.set(t.key, t)
    return map
  })

  async function fetchItemTypes(force = false): Promise<void> {
    if (loaded.value && !force) return
    if (loading.value) return
    loading.value = true
    try {
      itemTypes.value = await getItemTypes()
      loaded.value = true
    } catch {
    } finally {
      loading.value = false
    }
  }

  return {
    itemTypes,
    loaded,
    loading,
    byId,
    byKey,
    fetchItemTypes,
  }
})
