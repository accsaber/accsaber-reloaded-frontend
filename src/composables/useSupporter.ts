import { useAuthStore } from '@/stores/auth'
import { useSupporterStore } from '@/stores/supporters'
import type { SupporterStateResponse, SupporterTier } from '@/types/api/supporters'
import { SUPPORTER_TIER_RANK } from '@/types/api/supporters'
import { computed, onMounted, watch } from 'vue'

function tierAtLeast(tier: SupporterTier | null | undefined, min: SupporterTier): boolean {
  if (!tier) return false
  return SUPPORTER_TIER_RANK[tier] >= SUPPORTER_TIER_RANK[min]
}

export function useSupporter(userId: () => string | null) {
  const store = useSupporterStore()

  const state = computed<SupporterStateResponse | null>(() => {
    const id = userId()
    if (!id) return null
    return store.get(id)
  })

  const currentTier = computed(() => state.value?.currentTier ?? null)
  const isSupporter = computed(() => currentTier.value != null)
  const isAtLeastSilver = computed(() => tierAtLeast(currentTier.value, 'silver'))
  const isGold = computed(() => currentTier.value === 'gold')
  const hasEverSupported = computed(() => !!state.value?.hasEverSupported)
  const isPastSupporter = computed(() => !isSupporter.value && hasEverSupported.value)

  function load() {
    const id = userId()
    if (id) void store.fetch(id)
  }

  onMounted(load)
  watch(() => userId(), load)

  return {
    state,
    currentTier,
    isSupporter,
    isAtLeastSilver,
    isGold,
    hasEverSupported,
    isPastSupporter,
    refresh: () => {
      const id = userId()
      if (id) {
        store.invalidate(id)
        return store.fetch(id)
      }
      return Promise.resolve(null)
    },
  }
}

export function useMySupporter() {
  const auth = useAuthStore()
  return useSupporter(() => (auth.isLoggedIn ? auth.userId : null))
}
