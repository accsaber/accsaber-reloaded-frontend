<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import DataTable from '@/components/common/DataTable.vue'
import IconButton from '@/components/common/IconButton.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import CountryFlag from '@/components/domain/CountryFlag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import { useConfirmAction } from '@/composables/useConfirmAction'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import { useCategoryStore } from '@/stores/categories'
import type { LeaderboardResponse } from '@/types/api/users'
import type { TableColumn } from '@/types/display'
import { formatAccuracy, formatCount, formatFixed } from '@/utils/formatters'
import { toUserRef } from '@/utils/mappers'
import { playerProfileHref } from '@/utils/subdomain'
import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue'

const UserMissionsModal = defineAsyncComponent(() => import('@/views/staff/admin/users/UserMissionsModal.vue'))

const PAGE_SIZE = 50
const COUNTRY_CODE = /^[A-Z]{2}$/
const COLUMNS: TableColumn[] = [
  { key: 'ranking', label: '#', align: 'right', mono: true, width: '72px' },
  { key: 'player', label: 'Player', primary: true },
  { key: 'country', label: 'Country', width: '140px' },
  { key: 'ap', label: 'AP', align: 'right', mono: true, width: '120px', format: (v) => formatFixed(v as number, 2) },
  { key: 'averageAcc', label: 'Avg Acc', align: 'right', mono: true, width: '110px', format: (v) => formatAccuracy(v as number) },
  { key: 'rankedPlays', label: 'Plays', align: 'right', mono: true, width: '90px', format: (v) => formatCount(v as number) },
  { key: 'actions', label: '', align: 'right', width: '250px', noLink: true },
]

const categoryStore = useCategoryStore()
const { queryRef } = useQueryParams()
const { confirmModal, ask } = useConfirmAction()
const { currentPage, setPage } = usePageableRoute({ defaultSort: 'ranking', defaultOrder: 'asc', defaultSize: PAGE_SIZE, secondarySort: null })

const search = queryRef('q')
const users = ref<LeaderboardResponse[]>([])
const totalPages = ref(0)
const loading = ref(true)
const error = ref('')
const banned = ref(new Set<string>())

const overallId = computed(() => categoryStore.byCode.get('overall')?.id)
const rows = computed<Record<string, unknown>[]>(() => users.value.map((user) => ({ ...user, id: user.userId, user })))

function userOf(row: Record<string, unknown>): LeaderboardResponse {
  return row.user as LeaderboardResponse
}

let requestId = 0

async function fetchUsers() {
  if (!overallId.value) return
  const id = ++requestId
  loading.value = true
  error.value = ''
  try {
    const { getLeaderboard } = await import('@/api/leaderboards')
    const res = await getLeaderboard(overallId.value, {
      page: currentPage.value - 1,
      size: PAGE_SIZE,
      search: search.value.trim() || undefined,
      sort: 'ranking,ASC',
    })
    if (id !== requestId) return
    users.value = res.content
    totalPages.value = res.totalPages
  } catch (err) {
    if (id === requestId) error.value = parseApiError(err, 'Could not load the players').message
  } finally {
    if (id === requestId) loading.value = false
  }
}

watch([overallId, currentPage, search], fetchUsers, { immediate: true })

function askBan(user: LeaderboardResponse) {
  const lift = banned.value.has(user.userId)
  ask({
    title: lift ? 'Unban Player' : 'Ban Player',
    message: `${lift ? 'Unban' : 'Ban'} ${user.userName}?`,
    confirmLabel: lift ? 'Unban' : 'Ban',
    destructive: !lift,
    run: async () => {
      const { setUserBanned } = await import('@/api/admin/users')
      await setUserBanned(user.userId, !lift)
      const next = new Set(banned.value)
      if (lift) next.delete(user.userId)
      else next.add(user.userId)
      banned.value = next
    },
  })
}

const missionsFor = ref<LeaderboardResponse | null>(null)
const missionsOpen = ref(false)

function openMissions(user: LeaderboardResponse) {
  missionsFor.value = user
  missionsOpen.value = true
}

const countryFor = ref<string | null>(null)
const countryDraft = ref('')
const countryField = ref<HTMLInputElement | null>(null)

async function editCountry(user: LeaderboardResponse) {
  countryFor.value = user.userId
  countryDraft.value = user.country?.toUpperCase() ?? ''
  error.value = ''
  await nextTick()
  countryField.value?.select()
}

async function setCountry(user: LeaderboardResponse, country: string | null) {
  const { setCountryOverride } = await import('@/api/admin/users')
  await setCountryOverride(user.userId, country)
  if (country) users.value = users.value.map((u) => (u.userId === user.userId ? { ...u, country } : u))
}

async function commitCountry(user: LeaderboardResponse) {
  if (countryFor.value !== user.userId) return
  countryFor.value = null
  const code = countryDraft.value.trim().toUpperCase()
  if (code === (user.country?.toUpperCase() ?? '')) return
  if (!COUNTRY_CODE.test(code)) {
    error.value = 'A country is two letters, like US or DE'
    return
  }
  try {
    await setCountry(user, code)
  } catch (err) {
    error.value = parseApiError(err, 'Could not set the country').message
  }
}

function askLiftCountry(user: LeaderboardResponse) {
  countryFor.value = null
  ask({
    title: 'Lift Country Override',
    message: `Lift the override on ${user.userName}? The next platform refresh can change their country again.`,
    confirmLabel: 'Lift',
    run: () => setCountry(user, null),
  })
}
</script>

<template>
  <div class="players">
    <SearchBox v-model="search" placeholder="Search players" />
    <p v-if="error" class="caption players__error" role="alert">{{ error }}</p>

    <DataTable :columns="COLUMNS" :rows="rows" :loading="loading && !users.length" :refreshing="loading && users.length > 0"
      :loading-rows="PAGE_SIZE" :row-height="56" row-key="id" empty-message="No players">
      <template #cell-player="{ row }">
        <span class="players__player">
          <UserChip :user="toUserRef(userOf(row))" />
          <span v-if="banned.has(row.id as string)" class="caption players__banned">Banned</span>
        </span>
      </template>
      <template #cell-country="{ row }">
        <span v-if="countryFor === row.id" class="players__country">
          <input ref="countryField" v-model="countryDraft" class="inline-edit players__code" maxlength="2"
            aria-label="Country code" @keydown.enter.prevent="commitCountry(userOf(row))"
            @keydown.escape.prevent="countryFor = null" @blur="commitCountry(userOf(row))" />
          <IconButton icon="close" label="Lift country override" @mousedown.prevent @click="askLiftCountry(userOf(row))" />
        </span>
        <button v-else type="button" class="players__country pressable" :aria-label="`Edit country, ${row.country}`"
          @click="editCountry(userOf(row))">
          <CountryFlag :country="(row.country as string)" />
          {{ row.country }}
        </button>
      </template>
      <template #cell-actions="{ row }">
        <span class="players__actions">
          <BaseButton size="sm" :variant="banned.has(row.id as string) ? 'default' : 'destructive'" @click="askBan(userOf(row))">
            {{ banned.has(row.id as string) ? 'Unban' : 'Ban' }}
          </BaseButton>
          <BaseButton size="sm" @click="openMissions(userOf(row))">Missions</BaseButton>
          <BaseButton size="sm" :href="playerProfileHref(row.id as string)">Profile</BaseButton>
        </span>
      </template>
    </DataTable>

    <div class="players__pages">
      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
    </div>

    <UserMissionsModal v-if="missionsFor" :open="missionsOpen" :user-id="missionsFor.userId" :user-name="missionsFor.userName"
      @close="missionsOpen = false" />
    <ConfirmModal v-bind="confirmModal" />
  </div>
</template>

<style scoped>
.players {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.players__error {
  color: var(--error);
}

.players__player,
.players__country,
.players__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.players__banned {
  color: var(--error);
}

button.players__country {
  padding: 0;
  font: inherit;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
}

.players__code {
  width: 4ch;
  font: inherit;
  color: var(--text-primary);
  text-transform: uppercase;
}

.players__pages {
  min-height: var(--control-h);
}
</style>
