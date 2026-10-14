import { getTrades } from '@/api/trades'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTradeStore = defineStore('trades', () => {
  const pendingIncomingCount = ref(0)

  async function refreshIncomingCount(): Promise<void> {
    try {
      const page = await getTrades({ direction: 'incoming', status: ['pending'], size: 1 })
      pendingIncomingCount.value = page.totalElements
    } catch {
    }
  }

  return { pendingIncomingCount, refreshIncomingCount }
})
