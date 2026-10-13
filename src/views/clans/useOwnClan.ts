import { useAuthStore } from '@/stores/auth'
import type { ClanResponse, ClanRole } from '@/types/api/clans'
import { isPacifist } from '@/utils/clans'
import { computed, ref, watch } from 'vue'

const ROSTER_SIZE = 50

export function useOwnClan() {
  const auth = useAuthStore()
  const clan = computed(() => auth.userProfile?.clan ?? null)
  const role = ref<ClanRole | null>(null)
  const profile = ref<ClanResponse | null>(null)
  const pacifist = computed(() => !!profile.value && isPacifist(profile.value))

  async function load() {
    const id = auth.userId
    const own = clan.value
    if (!own || !id) {
      role.value = null
      profile.value = null
      return
    }
    const { getClan, getClanMembers } = await import('@/api/clans')
    const [roster, fetched] = await Promise.all([
      getClanMembers(own.id, { page: 0, size: ROSTER_SIZE }).catch(() => null),
      getClan(own.id).catch(() => null),
    ])
    role.value = roster?.content.find((m) => m.id === id)?.membership?.role ?? null
    profile.value = fetched
  }

  watch([() => clan.value?.id, () => auth.userId], load, { immediate: true })

  return { clan, role, profile, pacifist }
}
