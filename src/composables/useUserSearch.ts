import { parseApiError } from '@/api/client'
import type { LeaderboardParams } from '@/api/leaderboards'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { useCategoryStore } from '@/stores/categories'
import type { LeaderboardResponse } from '@/types/api/users'
import { computed, ref, watch } from 'vue'

export function useUserSearch(params: Omit<LeaderboardParams, 'page' | 'search'>, minChars = 0) {
  const categoryStore = useCategoryStore()

  const query = ref('')
  const debounced = useDebouncedRef(query, 200)
  const term = computed(() => debounced.value.trim())
  const page = ref(1)
  const totalPages = ref(1)
  const results = ref<LeaderboardResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const active = computed(() => term.value.length >= minChars)

  let requestId = 0

  async function run() {
    const id = ++requestId
    if (!active.value) {
      loading.value = false
      results.value = []
      return
    }
    const categoryId = categoryStore.getCategoryId('overall')
    if (!categoryId) {
      error.value = 'Player search is unavailable right now.'
      return
    }
    loading.value = true
    error.value = null
    try {
      const { getLeaderboard } = await import('@/api/leaderboards')
      const data = await getLeaderboard(categoryId, {
        ...params,
        page: page.value - 1,
        search: term.value || undefined,
      })
      if (id !== requestId) return
      results.value = data.content
      totalPages.value = data.totalPages || 1
      if (page.value > totalPages.value) page.value = totalPages.value
    } catch (e) {
      if (id !== requestId) return
      error.value = parseApiError(e, 'Search failed').message
      results.value = []
      totalPages.value = 1
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  watch(term, () => {
    page.value = 1
  })
  watch([term, page], run, { immediate: true })

  return { query, term, active, page, totalPages, results, loading, error }
}
