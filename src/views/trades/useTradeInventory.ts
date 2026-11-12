import { useDebouncedRef } from '@/composables/useDebouncedRef'
import type { UserItemResponse } from '@/types/api/items'
import { reactive, ref, watch, type Ref } from 'vue'

export const TRADE_INVENTORY_PAGE_SIZE = 24

export function useTradeInventory(owner: Ref<string | null>, cache: Map<string, UserItemResponse>) {
  const items = ref<UserItemResponse[]>([])
  const totalPages = ref(0)
  const page = ref(1)
  const search = ref('')
  const loading = ref(false)
  const debouncedSearch = useDebouncedRef(search, 250)

  let request = 0

  async function load() {
    const id = ++request
    loading.value = !!owner.value
    if (!owner.value) return
    try {
      const { getUserInventory } = await import('@/api/items')
      const res = await getUserInventory(owner.value, {
        page: page.value - 1,
        size: TRADE_INVENTORY_PAGE_SIZE,
        sort: 'awardedAt,desc',
        tradeable: true,
        search: debouncedSearch.value.trim() || undefined,
      })
      if (id !== request) return
      items.value = res.content
      totalPages.value = res.totalPages
      for (const ui of res.content) cache.set(ui.linkId, ui)
    } catch {
      if (id !== request) return
      items.value = []
      totalPages.value = 0
    }
    loading.value = false
  }

  watch(owner, () => {
    search.value = ''
    page.value = 1
    items.value = []
    totalPages.value = 0
  })
  watch(debouncedSearch, () => { page.value = 1 })
  watch([owner, page, debouncedSearch], load, { immediate: true })

  return reactive({ items, totalPages, page, search, loading })
}
