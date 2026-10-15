import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import type { PlayerRef } from '@/types/api/common'
import type { TableColumn } from '@/types/display'
import type { Page, PaginationParams } from '@/types/pagination'
import { computed, ref, shallowRef, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRouter } from 'vue-router'

export type StatsApi = typeof import('@/api/statistics')
export type StatsRow = Record<string, unknown>

export interface StatsBoardDef<K extends string, F> {
  key: K
  label: string
  icon: string
  columns: TableColumn[]
  sort?: string
  players?: boolean
  fetch?: (api: StatsApi, params: PaginationParams, filters: F) => Promise<Page<unknown>>
}

export function playerRoute(row: StatsRow): RouteLocationRaw | undefined {
  const userId = (row.player as PlayerRef | undefined)?.id
  return userId ? { name: 'player-profile', params: { userId } } : undefined
}

export function useStatsBoard<K extends string, F, D extends StatsBoardDef<K, F>>(
  boards: D[],
  options: { size: number; filters: (def: D) => F },
) {
  const router = useRouter()
  const { setQuery, queryRef } = useQueryParams()
  const { currentPage, setPage } = usePageableRoute({ defaultSort: '', secondarySort: null })

  const boardMap = new Map<string, D>(boards.map((b) => [b.key, b]))
  const boardParam = queryRef<K>('board')
  const boardDef = computed<D>(() => boardMap.get(boardParam.value) ?? boards[0]!)
  const activeBoard = computed<K>(() => boardDef.value.key)
  const pickerOptions = boards.map(({ key, label, icon }) => ({ key, label, icon }))

  function selectBoard(board: K, reset: Record<string, undefined> = {}) {
    setQuery({ ...reset, board: board === boards[0]!.key ? undefined : board })
  }

  const rowTo = computed(() => (boardDef.value.players ? playerRoute : undefined))

  function pushPlayer(row: StatsRow): boolean {
    if (!boardDef.value.players) return false
    const target = playerRoute(row)
    if (target) router.push(target)
    return true
  }

  const loading = ref(false)
  const pageData = shallowRef<Page<unknown> | null>(null)
  const pageBoard = ref<K | null>(null)
  const currentPageData = computed(() => (pageBoard.value === activeBoard.value ? pageData.value : null))
  const totalPages = computed(() => currentPageData.value?.totalPages ?? 0)
  const totalElements = computed(() => currentPageData.value?.totalElements ?? 0)

  const rows = computed<StatsRow[]>(() => {
    const page = currentPageData.value
    if (!page) return []
    const offset = page.number * page.size
    return page.content.map((raw, index) => ({ ...(raw as StatsRow), rank: offset + index + 1 }))
  })

  const request = computed(() => {
    const def = boardDef.value
    return def.fetch ? { board: def.key, page: currentPage.value, filters: options.filters(def) } : null
  })

  let requestId = 0

  async function fetchBoard() {
    const def = boardDef.value
    const req = request.value
    if (!def.fetch || !req) return
    const id = ++requestId
    loading.value = true
    try {
      const api = await import('@/api/statistics')
      const result = await def.fetch(api, { page: req.page - 1, size: options.size, sort: def.sort }, req.filters)
      if (id !== requestId) return
      pageData.value = result
    } catch {
      if (id !== requestId) return
      pageData.value = null
    }
    pageBoard.value = def.key
    loading.value = false
  }

  watch(() => JSON.stringify(request.value), fetchBoard, { immediate: true })

  return {
    activeBoard,
    boardDef,
    pickerOptions,
    selectBoard,
    rowTo,
    pushPlayer,
    currentPage,
    setPage,
    loading,
    rows,
    totalPages,
    totalElements,
  }
}
