<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import DataTable from '@/components/common/DataTable.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSharedNow } from '@/composables/useSharedNow'
import { useAuthStore } from '@/stores/auth'
import type {
  ClanJoinRequestResponse,
  ClanJoinStatus,
  ClanResponse,
  ClanWarLoanResponse,
  ClanWarLoanStatus,
  PublicClanResponse,
} from '@/types/api/clans'
import type { PlayerRef } from '@/types/api/common'
import type { TableColumn } from '@/types/display'
import type { Page } from '@/types/pagination'
import { formatCountdown, formatStanding } from '@/utils/clans'
import { getRankClass } from '@/utils/ranking'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import ClanLoanList from './clans/ClanLoanList.vue'
import ClanPodium, { type PodiumEntry } from './clans/ClanPodium.vue'
import ClanRequestList from './clans/ClanRequestList.vue'
import { useCurrentClanSeason } from './clans/useCurrentClanSeason'

const PAGE_SIZE = 25

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const { season, upcoming } = useCurrentClanSeason()
const now = useSharedNow()
const title = computed(() => {
  if (season.value) return `Clans: ${season.value.name}`
  if (upcoming.value) {
    return `Clans: ${upcoming.value.name} Starting in ${formatCountdown(new Date(upcoming.value.startsAt).getTime() - now.value)}`
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

interface ClanRow extends Record<string, unknown> {
  rank: number
  clan: PublicClanResponse
  level: number
  members: string
  standing: string
  founder: PlayerRef | null
}

const allRows = computed<ClanRow[]>(() => {
  const content = pageData.value?.content ?? []
  const offset = (currentPage.value - 1) * PAGE_SIZE
  return content.map((entry, i) => ({
    rank: offset + i + 1,
    clan: entry.clan,
    level: entry.level.level,
    members: `${entry.memberCount}/${entry.memberCap}`,
    standing: formatStanding(entry.standing),
    founder: entry.founder,
  }))
})

const podium = computed<PodiumEntry[]>(() =>
  podiumEligible.value
    ? allRows.value.slice(0, 3).map((r) => ({ rank: r.rank, clan: r.clan, value: r.standing }))
    : [],
)

const rows = computed<ClanRow[]>(() => (podiumEligible.value ? allRows.value.slice(3) : allRows.value))
const showTable = computed(() => loading.value || rows.value.length > 0 || podium.value.length === 0)
const totalPages = computed(() => pageData.value?.totalPages ?? 0)
const totalClans = computed(() => pageData.value?.totalElements ?? 0)

function rowTo(row: Record<string, unknown>) {
  return { name: 'clan-detail', params: { slugOrId: (row.clan as PublicClanResponse).slug } }
}

async function fetchClans() {
  loading.value = true
  try {
    const { getClans } = await import('@/api/clans')
    pageData.value = await getClans({
      ...paginationParams.value,
      search: searchQuery.value.trim() || undefined,
    })
  } catch {
    pageData.value = null
  } finally {
    loading.value = false
  }
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
    myRequests.value = page.content.filter((r) => r.status === 'pending')
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

const myLoans = ref<ClanWarLoanResponse[]>([])
const loanBusyId = ref<string | null>(null)
const loanError = ref<string | null>(null)

async function fetchMyLoans() {
  if (!auth.isLoggedIn) {
    myLoans.value = []
    return
  }
  try {
    const { getMyClanWarLoans } = await import('@/api/clans')
    myLoans.value = (await getMyClanWarLoans({ page: 0, size: 50, status: 'pending' })).content
  } catch {
    myLoans.value = []
  }
}

async function resolveMyLoan(loan: ClanWarLoanResponse, status: ClanWarLoanStatus) {
  loanBusyId.value = loan.id
  loanError.value = null
  try {
    const { resolveClanWarLoan } = await import('@/api/clans')
    await resolveClanWarLoan(loan.id, { status })
    if (status === 'accepted') {
      await router.push({ name: 'clan-war', params: { warId: loan.war.id } })
      return
    }
    await fetchMyLoans()
  } catch (err) {
    loanError.value = parseApiError(err, 'Could not answer that loan.').message
  } finally {
    loanBusyId.value = null
  }
}

watch(() => auth.isLoggedIn, () => Promise.all([fetchMyRequests(), fetchMyLoans()]), { immediate: true })

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

    <section v-if="myLoans.length" class="clans__requests">
      <h2 class="clans__section-title">Loans</h2>
      <p v-if="loanError" class="clans__error" role="alert">{{ loanError }}</p>
      <ClanLoanList
        :loans="myLoans"
        :busy-id="loanBusyId"
        :viewer-id="auth.userId"
        :can-cancel="() => false"
        show-war
        @resolve="resolveMyLoan"
      />
    </section>

    <div class="clans__controls">
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

    <ClanPodium v-if="podiumEligible && (loading || podium.length)" :entries="podium" :loading="loading" />

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />

    <DataTable
      v-if="showTable"
      :columns="columns"
      :rows="rows"
      :sort-state="sortState"
      :loading="loading"
      :loading-rows="8"
      :row-to="rowTo"
      row-key="rank"
      empty-message="No clans found"
      @sort="setSort"
    >
      <template #cell-rank="{ value }">
        <span class="rank-cell" :class="getRankClass(value as number)">#{{ value }}</span>
      </template>

      <template #cell-clan="{ row }">
        <span class="clans__identity">
          <ClanIcon :clan="(row.clan as PublicClanResponse)" :size="32" />
          <ClanTag :clan="(row.clan as PublicClanResponse)" size="md" effects />
          <ClanName class="clans__name" :clan="(row.clan as PublicClanResponse)" />
        </span>
      </template>

      <template #cell-standing="{ value }">
        <span class="clans__standing">{{ value }}</span>
      </template>

      <template #cell-founder="{ row }">
        <UserChip v-if="row.founder" :user="(row.founder as PlayerRef)" size="sm" />
      </template>

      <template #mobile-card="{ row }">
        <RouterLink :to="rowTo(row)" class="clan-card">
          <span class="rank-cell clan-card__rank" :class="getRankClass(row.rank as number)">#{{ row.rank }}</span>
          <span class="clan-card__identity">
            <ClanIcon :clan="(row.clan as PublicClanResponse)" :size="32" />
          <ClanTag :clan="(row.clan as PublicClanResponse)" size="md" effects />
            <ClanName class="clans__name" :clan="(row.clan as PublicClanResponse)" />
            <span class="clan-card__meta">Lv {{ row.level }} · {{ row.members }}</span>
          </span>
          <span class="clans__standing">{{ row.standing }}</span>
        </RouterLink>
      </template>
    </DataTable>

    <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
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

.clans__title {
  margin: 0;
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
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

.clans__identity {
  font-size: var(--text-card-title);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.clans__name {
  font-weight: 600;
  color: var(--text-primary);
}

.clans__standing {
  font-weight: 600;
  color: var(--page-accent, var(--accent));
}

.rank-cell {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--text-secondary);
}

.rank-cell.rank--gold {
  color: var(--tier-gold);
  font-weight: 700;
}

.rank-cell.rank--silver {
  color: var(--tier-silver);
  font-weight: 700;
}

.rank-cell.rank--bronze {
  color: var(--tier-bronze);
  font-weight: 700;
}

.clan-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 56px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  color: inherit;
  text-decoration: none;
}

.clan-card__rank {
  min-width: 36px;
}

.clan-card__identity {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xs) var(--space-sm);
  min-width: 0;
}

.clan-card__meta {
  width: 100%;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
