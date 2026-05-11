import { getItemModifiers } from '@/api/items'
import type { ItemModifierResponse } from '@/types/api/items'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useItemModifierStore = defineStore('itemModifiers', () => {
  const modifiers = ref<ItemModifierResponse[]>([])
  const loaded = ref(false)
  const loading = ref(false)

  const byId = computed(() => {
    const map = new Map<string, ItemModifierResponse>()
    for (const m of modifiers.value) map.set(m.id, m)
    return map
  })

  const byKey = computed(() => {
    const map = new Map<string, ItemModifierResponse>()
    for (const m of modifiers.value) map.set(m.key, m)
    return map
  })

  async function fetchModifiers(force = false): Promise<void> {
    if (loaded.value && !force) return
    if (loading.value) return
    loading.value = true
    try {
      modifiers.value = await getItemModifiers()
      loaded.value = true
    } catch {
    } finally {
      loading.value = false
    }
  }

  return {
    modifiers,
    loaded,
    loading,
    byId,
    byKey,
    fetchModifiers,
  }
})
