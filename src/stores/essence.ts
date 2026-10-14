import { getEssenceBalance } from '@/api/items'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useEssenceStore = defineStore('essence', () => {
  const balance = ref<number | null>(null)
  const reserved = ref<number | null>(null)
  const loaded = ref(false)

  async function fetchBalance(force = false): Promise<void> {
    if (!force && loaded.value) return
    try {
      const res = await getEssenceBalance()
      balance.value = res.balance
      reserved.value = res.reserved ?? 0
      loaded.value = true
    } catch {
      return
    }
  }

  function setBalance(next: number): void {
    balance.value = next
    loaded.value = true
  }

  function reset(): void {
    balance.value = null
    reserved.value = null
    loaded.value = false
  }

  return { balance, reserved, loaded, fetchBalance, setBalance, reset }
})
