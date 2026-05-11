import {
  acceptTrade as apiAcceptTrade,
  cancelTrade as apiCancelTrade,
  createTrade as apiCreateTrade,
  declineTrade as apiDeclineTrade,
  getTrades,
} from '@/api/trades'
import type {
  CreateTradeRequest,
  TradeListParams,
  TradeResponse,
} from '@/types/api/trades'
import type { Page } from '@/types/pagination'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTradeStore = defineStore('trades', () => {
  const pendingIncomingCount = ref(0)
  const lastFetchedAt = ref(0)
  const tradesPage = ref<Page<TradeResponse> | null>(null)
  const loading = ref(false)

  async function fetchTrades(params?: TradeListParams): Promise<Page<TradeResponse> | null> {
    loading.value = true
    try {
      const page = await getTrades(params)
      tradesPage.value = page
      return page
    } catch {
      tradesPage.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function refreshIncomingCount(): Promise<void> {
    try {
      const page = await getTrades({
        direction: 'incoming',
        status: ['pending'],
        size: 1,
      })
      pendingIncomingCount.value = page.totalElements
      lastFetchedAt.value = Date.now()
    } catch {
    }
  }

  async function createTrade(req: CreateTradeRequest): Promise<TradeResponse> {
    return apiCreateTrade(req)
  }

  async function acceptTrade(id: string): Promise<TradeResponse> {
    const trade = await apiAcceptTrade(id)
    await refreshIncomingCount()
    return trade
  }

  async function declineTrade(id: string): Promise<TradeResponse> {
    const trade = await apiDeclineTrade(id)
    await refreshIncomingCount()
    return trade
  }

  async function cancelTrade(id: string): Promise<TradeResponse> {
    return apiCancelTrade(id)
  }

  function reset(): void {
    pendingIncomingCount.value = 0
    lastFetchedAt.value = 0
    tradesPage.value = null
  }

  return {
    pendingIncomingCount,
    lastFetchedAt,
    tradesPage,
    loading,
    fetchTrades,
    refreshIncomingCount,
    createTrade,
    acceptTrade,
    declineTrade,
    cancelTrade,
    reset,
  }
})
