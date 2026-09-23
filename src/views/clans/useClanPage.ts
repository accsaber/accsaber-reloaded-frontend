import { useAuthStore } from '@/stores/auth'
import type {
  ClanJoinRequestResponse,
  ClanMemberResponse,
  ClanResponse,
  ClanRole,
  ClanStandingResponse,
} from '@/types/api/clans'
import { computed, ref, type Ref } from 'vue'
import { useOwnClan } from './useOwnClan'

const ROSTER_SIZE = 50
const MY_REQUESTS_SIZE = 50

export function useClanPage(slugOrId: Ref<string>) {
  const auth = useAuthStore()

  const clan = ref<ClanResponse | null>(null)
  const standing = ref<ClanStandingResponse | null>(null)
  const members = ref<ClanMemberResponse[]>([])
  const myRequests = ref<ClanJoinRequestResponse[]>([])
  const own = useOwnClan()
  const loading = ref(true)
  const rosterLoading = ref(true)
  const error = ref<string | null>(null)

  const viewerRole = computed<ClanRole | null>(() => {
    const id = auth.userId
    if (!id) return null
    return members.value.find((m) => m.player.id === id)?.role ?? null
  })

  const viewerClanId = computed(() => own.clan.value?.id ?? null)
  const ownRole = computed<ClanRole | null>(() =>
    viewerClanId.value && viewerClanId.value !== clan.value?.clan.id ? own.role.value : null,
  )

  const pendingRequest = computed<ClanJoinRequestResponse | null>(() => {
    const id = clan.value?.clan.id
    if (!id) return null
    return myRequests.value.find((r) => r.clan.id === id && r.status === 'pending') ?? null
  })

  async function loadRoster(clanId: string) {
    rosterLoading.value = true
    try {
      const { getClanMembers } = await import('@/api/clans')
      members.value = (await getClanMembers(clanId, { page: 0, size: ROSTER_SIZE })).content
    } catch {
      members.value = []
    } finally {
      rosterLoading.value = false
    }
  }

  function setOnline(playerId: string, online: boolean) {
    members.value = members.value.map((m) => (m.player.id === playerId ? { ...m, online } : m))
  }

  async function loadMyRequests() {
    if (!auth.isLoggedIn) {
      myRequests.value = []
      return
    }
    try {
      const { getMyClanJoinRequests } = await import('@/api/clans')
      myRequests.value = (await getMyClanJoinRequests({ page: 0, size: MY_REQUESTS_SIZE })).content
    } catch {
      myRequests.value = []
    }
  }

  async function load(): Promise<ClanResponse | null> {
    const initial = clan.value === null
    if (initial) loading.value = true
    error.value = null
    try {
      const { getClan, getClanStanding } = await import('@/api/clans')
      const fetched = await getClan(clan.value?.clan.id ?? slugOrId.value)
      clan.value = fetched
      const [rank] = await Promise.all([
        getClanStanding(fetched.clan.id).catch(() => null),
        loadRoster(fetched.clan.id),
        loadMyRequests(),
        own.load(),
      ])
      standing.value = rank
      return fetched
    } catch {
      clan.value = null
      error.value = 'Clan not found.'
      return null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    clan.value = null
    standing.value = null
    members.value = []
    myRequests.value = []
  }

  async function refreshViewer() {
    await Promise.all([auth.fetchAuthMe(), loadMyRequests()])
  }

  return {
    clan,
    standing,
    members,
    loading,
    rosterLoading,
    error,
    viewerRole,
    viewerClanId,
    ownRole,
    setOnline,
    pendingRequest,
    load,
    reset,
    refreshViewer,
  }
}
