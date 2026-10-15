import type { UserCampaignResponse } from '@/types/api/campaigns'
import type { CampaignFilterState } from '@/utils/campaignFilters'
import { toUserCampaignParams } from '@/utils/campaignFilters'
import { type MaybeRefOrGetter, ref, toValue, watch } from 'vue'
import { parseApiError } from '@/api/client'

const PAGE_SIZE = 20

function filterKey(state: CampaignFilterState): string {
  return JSON.stringify([
    state.search,
    state.sort,
    state.order,
    state.official,
    state.curated,
    state.loved,
    [...state.tagIds].sort(),
    [...state.progressStatus].sort(),
  ])
}

export function useUserCampaigns(
  userId: MaybeRefOrGetter<string | null | undefined>,
  filters: MaybeRefOrGetter<CampaignFilterState>,
) {
  const runs = ref<UserCampaignResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const page = ref(1)
  const totalPages = ref(1)

  let requestId = 0

  async function load() {
    const id = toValue(userId)
    const params = { ...toUserCampaignParams(toValue(filters)), page: page.value - 1, size: PAGE_SIZE }
    const token = ++requestId

    loading.value = true
    error.value = null
    try {
      const { getMyCampaigns, getUserCampaigns } = await import('@/api/campaigns')
      const result = await (id ? getUserCampaigns(id, params) : getMyCampaigns(params))
      if (token !== requestId) return
      runs.value = result.content
      totalPages.value = result.totalPages || 1
    } catch (err) {
      if (token !== requestId) return
      error.value = parseApiError(err, 'Failed to load campaigns').message
      runs.value = []
      totalPages.value = 1
    } finally {
      if (token === requestId) loading.value = false
    }
  }

  watch([() => toValue(userId), () => filterKey(toValue(filters))], () => {
    page.value = 1
  })

  watch(
    () => JSON.stringify([toValue(userId), filterKey(toValue(filters)), page.value]),
    load,
    { immediate: true },
  )

  return { runs, loading, error, page, totalPages }
}
