<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import RulesButton from '@/components/domain/RulesButton.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { usePageMeta } from '@/composables/usePageMeta'
import { useNow } from '@/composables/useNow'
import { useAuthStore } from '@/stores/auth'
import type {
  ClanJoinRequestResponse,
  ClanJoinStatus,
  ClanResponse,
  ClanWarAidResponse,
  ClanWarAidStatus,
} from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import {
  CLAN_RULES,
  CLAN_RULES_LEAD,
  CLAN_RULES_NOTE,
  formatStanding,
  hasClanRole,
  isPacifist,
} from '@/utils/clans'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import ClanAidList from './clans/ClanAidList.vue'
import ClanRequestList from './clans/ClanRequestList.vue'
import ClanStandingsTable, { type StandingsRow } from './clans/ClanStandingsTable.vue'
import { useCurrentClanSeason } from './clans/useCurrentClanSeason'
import { useOwnClan } from './clans/useOwnClan'
import { formatDuration } from '@/utils/formatters'

const PAGE_SIZE = 25

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const { season, upcoming } = useCurrentClanSeason()
const now = useNow()
const title = computed(() => {
  if (season.value) return `Clans: ${season.value.name}`
  if (upcoming.value) {
    return `Clans: ${upcoming.value.name} Starting in ${formatDuration(new Date(upcoming.value.startsAt).getTime() - now.value, { zero: 'now' })}`
  }
  return 'Clans'
})

usePageMeta({
  title: 'Clans | AccSaber',
  description: 'Every AccSaber clan, ranked by Standing this season.',
})

const { currentPage, sortState, paginationParams, setPage, setSort } = usePageableRoute({
  defaultSort: 'standing',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  sortFieldMap: { name: 'name', level: 'level', members: 'members', standing: 'standing' },
  initialOrder: { name: 'asc' },
  secondarySort: null,
})

const searchQuery = ref((route.query.search as string) || '')
const pageData = ref<Page<ClanResponse> | null>(null)
const loading = ref(true)

const columns: TableColumn[] = [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '80px' },
  { key: 'clan', label: 'Clan', align: 'left' },
  { key: 'level', label: 'Level', sortable: true, align: 'right', mono: true, width: '100px' },
  { key: 'members', label: 'Members', sortable: true, align: 'right', mono: true, width: '120px' },
  { key: 'standing', label: 'Standing', sortable: true, align: 'right', mono: true, width: '140px' },
  { key: 'founder', label: 'Founder', align: 'left', width: '220px' },
]

const podiumEligible = computed(
  () =>
    currentPage.value === 1 &&
    sortState.value.key === 'standing' &&
    sortState.value.direction === 'desc' &&
    searchQuery.value.trim() === '',
)

const rows = computed<StandingsRow[]>(() => {
  const content = pageData.value?.content ?? []
  const offset = (currentPage.value - 1) * PAGE_SIZE
  return content.map((entry, i) => ({
    rank: offset + i + 1,
    clan: entry.clan,
    level: entry.level.level,
    members: `${entry.memberCount}/${entry.memberCap}`,
    standing: formatStanding(entry.standing),
    founder: entry.founder,
    pacifist: isPacifist(entry),
    meta: `Lv ${entry.level.level} · ${entry.memberCount}/${entry.memberCap}`,
  }))
})

const totalPages = computed(() => pageData.value?.totalPages ?? 0)
const totalClans = computed(() => pageData.value?.totalElements ?? 0)

let clansRequest = 0

async function fetchClans() {
  const request = ++clansRequest
  loading.value = true
  let next: typeof pageData.value = null
  try {
    const { getClans } = await import('@/api/clans')
    next = await getClans({
      ...paginationParams.value,
      search: searchQuery.value.trim() || undefined,
    })
  } catch {
    next = null
  }
  if (request !== clansRequest) return
  pageData.value = next
  loading.value = false
}

const myClan = computed(() => auth.userProfile?.clan ?? null)
const myRequests = ref<ClanJoinRequestResponse[]>([])
const requestBusyId = ref<string | null>(null)
const requestError = ref<string | null>(null)

async function fetchMyRequests() {
  if (!auth.isLoggedIn) {
    myRequests.value = []
    return
  }
  try {
    const { getMyClanJoinRequests } = await import('@/api/clans')
    const page = await getMyClanJoinRequests({ page: 0, size: 50 })
    myRequests.value = page.content
  } catch {
    myRequests.value = []
  }
}

async function resolveMyRequest(request: ClanJoinRequestResponse, status: ClanJoinStatus) {
  requestBusyId.value = request.id
  requestError.value = null
  try {
    const { resolveClanJoinRequest } = await import('@/api/clans')
    await resolveClanJoinRequest(request.id, { status })
    if (status === 'accepted') {
      await auth.fetchAuthMe()
      await router.push({ name: 'clan-detail', params: { slugOrId: request.clan.slug } })
      return
    }
    await fetchMyRequests()
  } catch (err) {
    requestError.value = parseApiError(err, 'Could not answer that.').message
  } finally {
    requestBusyId.value = null
  }
}

const own = useOwnClan()
const myAid = ref<ClanWarAidResponse[]>([])
const aidBusyId = ref<string | null>(null)
const aidError = ref<string | null>(null)
const canAnswerAid = computed(() => hasClanRole(own.role.value, 'commander'))

async function fetchMyAid() {
  const clanId = myClan.value?.id
  if (!clanId) {
    myAid.value = []
    return
  }
  try {
    const { getClanWarAid } = await import('@/api/clans')
    myAid.value = (await getClanWarAid({ clanId, status: 'pending', page: 0, size: 50 })).content
  } catch {
    myAid.value = []
  }
}

async function resolveMyAid(aid: ClanWarAidResponse, status: ClanWarAidStatus) {
  aidBusyId.value = aid.id
  aidError.value = null
  try {
    const { resolveClanWarAid } = await import('@/api/clans')
    await resolveClanWarAid(aid.id, { status })
    if (status === 'accepted') {
      await router.push({ name: 'clan-war', params: { warId: aid.war.id } })
      return
    }
    await fetchMyAid()
  } catch (err) {
    aidError.value = parseApiError(err, 'Could not answer that.').message
  } finally {
    aidBusyId.value = null
  }
}

watch(() => auth.isLoggedIn, fetchMyRequests, { immediate: true })
watch(() => myClan.value?.id, fetchMyAid, { immediate: true })

watch(searchQuery, (value) => {
  const query: LocationQueryRaw = { ...route.query, search: value.trim() || undefined }
  delete query.page
  router.replace({ query })
})

watch(() => [route.query.page, route.query.sort, route.query.order, route.query.search], fetchClans, {
  immediate: true,
})
</script>

<template>
  <div class="clans">
    <header class="clans__header">
      <h1 class="clans__title">{{ title }}</h1>
      <p v-if="totalClans > 0" class="clans__subtitle">{{ totalClans.toLocaleString() }} clans ranked</p>
    </header>

    <section v-if="myRequests.length" class="clans__requests">
      <h2 class="clans__section-title">Requests</h2>
      <p v-if="requestError" class="clans__error" role="alert">{{ requestError }}</p>
      <ClanRequestList
        :requests="myRequests"
        perspective="player"
        :busy-id="requestBusyId"
        @resolve="resolveMyRequest"
      />
    </section>

    <section v-if="myAid.length" class="clans__requests">
      <h2 class="clans__section-title">War help</h2>
      <p v-if="aidError" class="clans__error" role="alert">{{ aidError }}</p>
      <ClanAidList
        :aids="myAid"
        :busy-id="aidBusyId"
        :own-clan-id="myClan?.id ?? null"
        :can-act="canAnswerAid"
        show-war
        @resolve="resolveMyAid"
      />
    </section>

    <div class="clans__controls">
      <RulesButton title="Clan rules" :lead="CLAN_RULES_LEAD" :rules="CLAN_RULES" :note="CLAN_RULES_NOTE" />
      <BaseButton size="sm" @click="router.push({ name: 'clan-wars' })">Wars</BaseButton>
      <template v-if="auth.isLoggedIn">
        <BaseButton
          v-if="myClan"
          size="sm"
          @click="router.push({ name: 'clan-detail', params: { slugOrId: myClan.slug } })"
        >
          Your clan
        </BaseButton>
        <BaseButton v-else variant="primary" size="sm" @click="router.push({ name: 'clan-create' })">
          Create clan
        </BaseButton>
      </template>
      <SearchBox v-model="searchQuery" placeholder="Search clans..." />
    </div>

    <ClanStandingsTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :podium="podiumEligible"
      :page="currentPage"
      :total-pages="totalPages"
      :sort-state="sortState"
      empty-message="No clans found"
      @page="setPage"
      @sort="setSort"
    >
      <template #cell-founder="{ row }">
        <UserChip v-if="row.founder" :user="(row.founder as PlayerRef)" size="sm" />
      </template>
    </ClanStandingsTable>
  </div>
</template>

<style scoped>
.clans {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}

.clans__header {
  text-align: center;
  padding: var(--space-2xl) 0 var(--space-lg);
}

.clans__subtitle {
  margin: var(--space-xs) 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.02em;
  color: var(--text-secondary);
}

.clans__controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-sm);
}

.clans__requests {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.clans__section-title {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.clans__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

</style>
