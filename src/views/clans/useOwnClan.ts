import { useAuthStore } from '@/stores/auth'
import type { ClanRole } from '@/types/api/clans'
import { computed, ref } from 'vue'

const ROSTER_SIZE = 50

export function useOwnClan() {
  const auth = useAuthStore()
  const clan = computed(() => auth.userProfile?.clan ?? null)
  const role = ref<ClanRole | null>(null)

  async function load() {
    const id = auth.userId
    const own = clan.value
    if (!own || !id) {
      role.value = null
      return
    }
    try {
      const { getClanMembers } = await import('@/api/clans')
      const roster = await getClanMembers(own.id, { page: 0, size: ROSTER_SIZE })
      role.value = roster.content.find((m) => m.player.id === id)?.role ?? null
    } catch {
      role.value = null
    }
  }

  return { clan, role, load }
}
