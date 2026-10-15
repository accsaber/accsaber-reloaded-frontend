import { parseApiError } from '@/api/client'
import type { ItemResponse } from '@/types/api/items'
import { RARITY_ORDER, asUserItem } from '@/utils/items'
import { computed, onMounted, ref, watch } from 'vue'

const PAGE_SIZE = 20

function compareItems(a: ItemResponse, b: ItemResponse): number {
  const r = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
  return r !== 0 ? r : a.name.localeCompare(b.name)
}

export function useItemSearch(load: () => Promise<ItemResponse[]>, accept: (item: ItemResponse) => boolean) {
  const items = ref<ItemResponse[]>([])
  const fetching = ref(false)
  const error = ref<string | null>(null)
  const search = ref('')
  const page = ref(1)

  const pickable = computed(() => items.value.filter(accept))

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    const matched = q
      ? pickable.value.filter((i) => i.name.toLowerCase().includes(q) || i.typeKey.toLowerCase().includes(q))
      : pickable.value
    return [...matched].sort(compareItems)
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))

  const paged = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return filtered.value.slice(start, start + PAGE_SIZE).map((item) => asUserItem(item))
  })

  watch(search, () => {
    page.value = 1
  })
  watch(totalPages, (n) => {
    if (page.value > n) page.value = n
  })

  onMounted(async () => {
    fetching.value = true
    error.value = null
    try {
      items.value = await load()
    } catch (e) {
      error.value = parseApiError(e, 'Failed to load items').message
    } finally {
      fetching.value = false
    }
  })

  return { items, pickable, fetching, error, search, page, totalPages, paged }
}
