import { useAuthStore } from '@/stores/auth'
import type {
  ClanJoinRequestResponse,
  ClanResponse,
  ClanRole,
  ClanStandingResponse,
} from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import { computed, ref, type Ref } from 'vue'
import { useOwnClan } from './useOwnClan'

const ROSTER_SIZE = 50
const MY_REQUESTS_SIZE = 50

export function useClanPage(slugOrId: Ref<string>) {
  const auth = useAuthStore()

  const clan = ref<ClanResponse | null>(null)
  const standing = ref<ClanStandingResponse | null>(null)
  const members = ref<PlayerRef[]>([])
  const myRequests = ref<ClanJoinRequestResponse[]>([])
  const loading = ref(true)
  const rosterLoading = ref(true)
  const error = ref<string | null>(null)

  const viewerInOtherClan = computed(() => {
    const ownId = auth.userProfile?.clan?.id
    return !!ownId && !!clan.value && ownId !== clan.value.clan.id
  })
  const own = useOwnClan(() => viewerInOtherClan.value)

  const viewerClanId = computed(() => own.clan.value?.id ?? null)
  const viewerRole = computed<ClanRole | null>(() =>
    viewerClanId.value && viewerClanId.value === clan.value?.clan.id ? own.role.value : null,
  )
  const ownRole = computed<ClanRole | null>(() => (viewerInOtherClan.value ? own.role.value : null))

  const pendingRequest = computed<ClanJoinRequestResponse | null>(() => {
    const id = clan.value?.clan.id
    if (!id) return null
    return myRequests.value.find((r) => r.clan.id === id) ?? null
  })

  async function loadRoster(clanId: string) {
    rosterLoading.value = true
    let roster: PlayerRef[] = []
    try {
      const { getClanMembers } = await import('@/api/clans')
      roster = (await getClanMembers(clanId, { page: 0, size: ROSTER_SIZE })).content
    } catch {
      roster = []
    }
    if (clan.value?.clan.id !== clanId) return
    members.value = roster
    rosterLoading.value = false
  }

  function setOnline(playerId: string, online: boolean) {
    members.value = members.value.map((m) =>
      m.id === playerId && m.membership ? { ...m, membership: { ...m.membership, online } } : m,
    )
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

  let loadRequest = 0

  async function load(): Promise<ClanResponse | null> {
    const request = ++loadRequest
    const initial = clan.value === null
    if (initial) loading.value = true
    error.value = null
    try {
      const { getClan, getClanStanding } = await import('@/api/clans')
      const fetched = await getClan(clan.value?.clan.id ?? slugOrId.value)
      if (request !== loadRequest) return null
      clan.value = fetched
      const [rank] = await Promise.all([
        getClanStanding(fetched.clan.id).catch(() => null),
        loadRoster(fetched.clan.id),
        loadMyRequests(),
      ])
      if (request !== loadRequest) return null
      standing.value = rank
      return fetched
    } catch {
      if (request !== loadRequest) return null
      clan.value = null
      error.value = 'Clan not found.'
      return null
    } finally {
      if (request === loadRequest) loading.value = false
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
    viewerInOtherClan,
    ownRole,
    ownClan: own.profile,
    ownPacifist: own.pacifist,
    setOnline,
    pendingRequest,
    load,
    reset,
    refreshViewer,
  }
}
