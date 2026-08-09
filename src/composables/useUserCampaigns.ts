import { getApiErrorMessage } from '@/api/client'
import type { UserCampaignResponse } from '@/types/api/campaigns'
import type { CampaignFilterState } from '@/utils/campaignFilters'
import { PROGRESS_SORT_KEY, toUserCampaignParams } from '@/utils/campaignFilters'
import { type MaybeRefOrGetter, computed, ref, toValue, watch } from 'vue'

const PAGE_SIZE = 20
const BULK_FETCH_SIZE = 100

function completionRatio(run: UserCampaignResponse): number {
  const total = run.campaign.difficultyCount
  if (!total || total <= 0) return 0
  return run.completedDifficulties / total
}

function compareByProgress(a: UserCampaignResponse, b: UserCampaignResponse): number {
  const aDone = a.progressStatus === 'COMPLETED'
  const bDone = b.progressStatus === 'COMPLETED'
  if (aDone !== bDone) return aDone ? -1 : 1

  if (aDone) {
    const at = a.completedAt ? Date.parse(a.completedAt) : 0
    const bt = b.completedAt ? Date.parse(b.completedAt) : 0
    if (at !== bt) return bt - at
  } else {
    const ar = completionRatio(a)
    const br = completionRatio(b)
    if (ar !== br) return br - ar
  }

  return a.campaign.name.localeCompare(b.campaign.name)
}

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
  const loaded = ref<UserCampaignResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const page = ref(1)
  const clientOrdered = ref(true)
  const serverTotalPages = ref(1)

  let requestToken = 0
  let skipPageWatch = false

  const totalPages = computed(() =>
    clientOrdered.value
      ? Math.max(1, Math.ceil(loaded.value.length / PAGE_SIZE))
      : serverTotalPages.value,
  )

  const runs = computed(() => {
    if (!clientOrdered.value) return loaded.value
    const start = (page.value - 1) * PAGE_SIZE
    return loaded.value.slice(start, start + PAGE_SIZE)
  })

  async function load() {
    const id = toValue(userId)
    const state = toValue(filters)
    const params = toUserCampaignParams(state)
    const orderOnClient = state.sort === PROGRESS_SORT_KEY
    const token = ++requestToken

    loading.value = true
    error.value = null
    try {
      const { getMyCampaigns, getUserCampaigns } = await import('@/api/campaigns')
      const fetchPage = (index: number, size: number) =>
        id
          ? getUserCampaigns(id, { ...params, page: index, size })
          : getMyCampaigns({ ...params, page: index, size })

      if (orderOnClient) {
        const first = await fetchPage(0, BULK_FETCH_SIZE)
        const pages = first.totalPages || 1
        const rest =
          pages > 1
            ? await Promise.all(
                Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 1, BULK_FETCH_SIZE)),
              )
            : []
        if (token !== requestToken) return
        loaded.value = first.content
          .concat(...rest.map((p) => p.content))
          .sort(compareByProgress)
        clientOrdered.value = true
        serverTotalPages.value = 1
      } else {
        const result = await fetchPage(page.value - 1, PAGE_SIZE)
        if (token !== requestToken) return
        loaded.value = result.content
        clientOrdered.value = false
        serverTotalPages.value = result.totalPages || 1
      }
    } catch (err) {
      if (token !== requestToken) return
      error.value = getApiErrorMessage(err, 'Failed to load campaigns')
      loaded.value = []
      serverTotalPages.value = 1
    } finally {
      if (token === requestToken) loading.value = false
    }
  }

  watch([() => toValue(userId), () => filterKey(toValue(filters))], () => {
    if (page.value !== 1) {
      skipPageWatch = true
      page.value = 1
    }
    void load()
  })

  watch(page, () => {
    if (skipPageWatch) {
      skipPageWatch = false
      return
    }
    if (!clientOrdered.value) void load()
  })

  return { runs, loading, error, page, totalPages, reload: load }
}
