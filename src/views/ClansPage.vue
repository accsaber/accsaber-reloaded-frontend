<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
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
  formatSignedStanding,
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

const { seasons, season, upcoming } = useCurrentClanSeason()
const now = useNow()

const closedSeasons = computed(() => (seasons.value ?? []).filter((s) => s.closedAt))
const past = computed(() => {
  const key = route.query.season
  return closedSeasons.value.find((s) => s.slug === key || s.id === key) ?? null
})
const seasonView = computed(() => !!route.query.season && (!seasons.value || !!past.value))
const seasonKey = computed(() => (route.query.season && !seasons.value ? null : (past.value?.slug ?? '')))
const seasonOptions = computed(() => [
  { value: '', label: season.value?.name ?? 'Now' },
  ...closedSeasons.value.map((s) => ({ value: s.slug, label: s.name })),
])

async function setSeason(slug: string) {
  await router.replace({ query: slug ? { season: slug } : {} })
  searchQuery.value = ''
}

const title = computed(() => {
  if (past.value) return `Clans: ${past.value.name}`
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
const pageData = ref<Page<StandingsRow> | null>(null)
const loading = ref(true)

const LIST_COLUMNS: TableColumn[] = [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '80px' },
  { key: 'clan', label: 'Clan', align: 'left' },
  { key: 'level', label: 'Level', sortable: true, align: 'right', mono: true, width: '100px' },
  { key: 'members', label: 'Members', sortable: true, align: 'right', mono: true, width: '120px' },
  { key: 'standing', label: 'Standing', sortable: true, align: 'right', mono: true, width: '140px' },
  { key: 'founder', label: 'Founder', align: 'left', width: '220px' },
]

const SEASON_COLUMNS: TableColumn[] = [
  { key: 'rank', label: 'Rank', align: 'right', mono: true, width: '80px' },
  { key: 'clan', label: 'Clan', align: 'left' },
  { key: 'base', label: 'Base', align: 'right', mono: true, width: '120px' },
  { key: 'earned', label: 'Earned', align: 'right', mono: true, width: '120px' },
  { key: 'standing', label: 'Standing', align: 'right', mono: true, width: '140px' },
  { key: 'pages', label: '', width: '128px' },
]

const columns = computed(() => (seasonView.value ? SEASON_COLUMNS : LIST_COLUMNS))

const showTop = computed(
  () =>
    currentPage.value === 1 &&
    (seasonView.value ||
      (sortState.value.key === 'standing' &&
        sortState.value.direction === 'desc' &&
        searchQuery.value.trim() === '')),
)

const totalPages = computed(() => pageData.value?.totalPages ?? 0)
const totalClans = computed(() => pageData.value?.totalElements ?? 0)

async function fetchSeasonRows(slug: string): Promise<Page<StandingsRow>> {
  const { getClanSeasonStandings } = await import('@/api/clans')
  const page = await getClanSeasonStandings(slug, { page: paginationParams.value.page, size: PAGE_SIZE })
  return {
    ...page,
    content: page.content.map((entry) => ({
      rank: entry.rank,
      clan: entry.clan,
      base: formatStanding(entry.baseStanding),
      earned: formatSignedStanding(entry.earned),
      standing: formatStanding(entry.standing),
      meta: `Earned ${formatSignedStanding(entry.earned)}`,
    })),
  }
}

async function fetchListRows(): Promise<Page<StandingsRow>> {
  const { getClans } = await import('@/api/clans')
  const params = paginationParams.value
  const page = await getClans({ ...params, search: searchQuery.value.trim() || undefined })
  const offset = (params.page ?? 0) * PAGE_SIZE
  return {
    ...page,
    content: page.content.map((entry, i) => ({
      rank: offset + i + 1,
      clan: entry.clan,
      level: entry.level.level,
      members: `${entry.memberCount}/${entry.memberCap}`,
      standing: formatStanding(entry.standing),
      founder: entry.founder,
      pacifist: isPacifist(entry),
      meta: `Level ${entry.level.level} · ${entry.memberCount}/${entry.memberCap} members`,
    })),
  }
}

let clansRequest = 0

async function fetchClans() {
  const slug = seasonKey.value
  if (slug === null) return
  const request = ++clansRequest
  loading.value = true
  let next: typeof pageData.value = null
  try {
    next = await (slug ? fetchSeasonRows(slug) : fetchListRows())
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
  if (value.trim() === (route.query.search ?? '')) return
  const query: LocationQueryRaw = { ...route.query, search: value.trim() || undefined }
  delete query.page
  router.replace({ query })
})

watch(() => [route.query.page, route.query.sort, route.query.order, route.query.search, seasonKey.value], fetchClans, {
  immediate: true,
})
</script>

<template>
  <div class="clans">
    <header class="clans__header">
      <div class="clans__heading">
        <h1>{{ title }}</h1>
        <span v-if="totalClans > 0" class="caption">{{ totalClans.toLocaleString() }} clans</span>
      </div>
      <div class="clans__controls">
        <SearchBox v-if="!seasonView" v-model="searchQuery" class="clans__search" placeholder="Search clans" />
        <BaseSelect v-if="closedSeasons.length" :model-value="past?.slug ?? ''" :options="seasonOptions"
          placeholder="Season" @update:model-value="setSeason" />
        <RulesButton title="Clan Rules" :lead="CLAN_RULES_LEAD" :rules="CLAN_RULES" :note="CLAN_RULES_NOTE" />
        <BaseButton @click="router.push({ name: 'clan-wars' })">Wars</BaseButton>
        <template v-if="auth.isLoggedIn">
          <BaseButton v-if="myClan" @click="router.push({ name: 'clan-detail', params: { slugOrId: myClan.slug } })">
            Your Clan
          </BaseButton>
          <BaseButton v-else variant="primary" @click="router.push({ name: 'clan-create' })">Create Clan</BaseButton>
        </template>
      </div>
    </header>

    <section v-if="myRequests.length" class="clans__requests">
      <h2 class="card-title">Requests</h2>
      <p v-if="requestError" class="caption clans__error" role="alert">{{ requestError }}</p>
      <ClanRequestList
        :requests="myRequests"
        perspective="player"
        :busy-id="requestBusyId"
        @resolve="resolveMyRequest"
      />
    </section>

    <section v-if="myAid.length" class="clans__requests">
      <h2 class="card-title">War Help</h2>
      <p v-if="aidError" class="caption clans__error" role="alert">{{ aidError }}</p>
      <ClanAidList
        :aids="myAid"
        :busy-id="aidBusyId"
        :own-clan-id="myClan?.id ?? null"
        :can-act="canAnswerAid"
        show-war
        @resolve="resolveMyAid"
      />
    </section>

    <ClanStandingsTable
      :columns="columns"
      :rows="pageData?.content ?? []"
      :loading="loading && !pageData"
      :refreshing="loading && !!pageData"
      :top="showTop"
      :page-size="PAGE_SIZE"
      :page="currentPage"
      :total-pages="totalPages"
      :sort-state="sortState"
      :empty-message="past ? 'No clans placed this season' : 'No clans found'"
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

.clans__header,
.clans__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.clans__header {
  justify-content: space-between;
  gap: var(--space-md);
}

.clans__heading {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.clans__requests {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.clans__error {
  color: var(--error);
}

@media (max-width: 767px) {
  .clans__controls,
  .clans__search {
    flex: 1 1 100%;
  }
}
</style>
