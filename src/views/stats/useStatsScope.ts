import { useQueryParams } from '@/composables/useQueryParams'
import { useAuthStore } from '@/stores/auth'
import type { PlayerScope, RelationFilterType } from '@/types/api/relations'
import { computed } from 'vue'

export function useStatsScope() {
  const { queryRef } = useQueryParams()
  const authStore = useAuthStore()
  const country = queryRef('country')
  const relation = queryRef<RelationFilterType>('relation')

  return computed<PlayerScope>(() => ({
    country: country.value || undefined,
    relation: (authStore.isLoggedIn && relation.value) || undefined,
  }))
}
