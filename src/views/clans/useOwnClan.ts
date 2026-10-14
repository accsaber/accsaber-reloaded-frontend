import { useAuthStore } from '@/stores/auth'
import type { ClanResponse, ClanRole } from '@/types/api/clans'
import { isPacifist } from '@/utils/clans'
import { computed, ref, watch } from 'vue'

export function useOwnClan(withPacifism: () => boolean = () => false) {
  const auth = useAuthStore()
  const clan = computed(() => auth.userProfile?.clan ?? null)
  const role = computed<ClanRole | null>(() => (clan.value ? (auth.authMe?.clanRole ?? null) : null))
  const profile = ref<ClanResponse | null>(null)
  const pacifist = computed(() => !!profile.value && isPacifist(profile.value))

  watch(
    () => (withPacifism() ? (clan.value?.id ?? null) : null),
    async (id) => {
      profile.value = null
      if (!id) return
      const { getClan } = await import('@/api/clans')
      const fetched = await getClan(id).catch(() => null)
      if (clan.value?.id === id) profile.value = fetched
    },
    { immediate: true },
  )

  return { clan, role, profile, pacifist }
}
