<script setup lang="ts">
import { ApiError, parseApiError } from '@/api/client'
import AdminItemPicker from '@/components/admin/AdminItemPicker.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ClanSeasonResponse, ClanSeasonRewardResponse } from '@/types/api/clans'
import type { ItemResponse } from '@/types/api/items'
import { isoToLocalInput, localInputToIso, slugify } from '@/utils/events'
import { formatFullDate } from '@/utils/formatters'
import { computed, onMounted, ref, watch } from 'vue'
import ClanSeasonStandings from './ClanSeasonStandings.vue'

interface SeasonDraft {
  name: string
  slug: string
  startsAt: string
  endsAt: string
}

const itemTypeStore = useItemTypeStore()

const seasons = ref<ClanSeasonResponse[]>([])
const current = ref<ClanSeasonResponse | null>(null)
const page = ref(1)
const totalPages = ref(0)
const standingsId = ref<string | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const busy = ref(false)

const editorOpen = ref(false)
const editingId = ref<string | null>(null)
const draft = ref<SeasonDraft>({ name: '', slug: '', startsAt: '', endsAt: '' })
const editorError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const expandedId = ref<string | null>(null)
const rewards = ref<ClanSeasonRewardResponse[]>([])
const rewardsLoading = ref(false)
const rewardError = ref<string | null>(null)
const rewardDraft = ref({ rankFrom: '1', rankTo: '1', quantity: '1', item: null as ItemResponse | null })
const pickerOpen = ref(false)

const clanCosmeticTypeIds = computed(() => {
  const parent = itemTypeStore.itemTypes.find((t) => t.key === 'clan_cosmetic')
  return new Set(itemTypeStore.itemTypes.filter((t) => parent && t.parentTypeId === parent.id).map((t) => t.id))
})

function recipient(item: ItemResponse): string {
  return clanCosmeticTypeIds.value.has(item.typeId) ? 'the clan' : 'contributing members'
}

function state(season: ClanSeasonResponse, now = Date.now()): string {
  if (season.closedAt) return 'Closed'
  if (new Date(season.startsAt).getTime() > now) return 'Upcoming'
  if (new Date(season.endsAt).getTime() <= now) return 'Ending'
  return 'Running'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const { getClanSeasons } = await import('@/api/clans')
    const res = await getClanSeasons({ page: page.value - 1, size: 20 })
    seasons.value = res.content
    totalPages.value = res.totalPages
  } catch (err) {
    error.value = parseApiError(err, 'Could not load seasons.').message
  } finally {
    loading.value = false
  }
}

async function loadCurrent() {
  try {
    const { getClanSeason } = await import('@/api/clans')
    current.value = await getClanSeason('current')
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) {
      error.value = parseApiError(err, 'Could not load the current season.').message
    }
    current.value = null
  }
}

function toggleStandings(season: ClanSeasonResponse) {
  standingsId.value = standingsId.value === season.id ? null : season.id
}

function openCreate() {
  editingId.value = null
  draft.value = { name: '', slug: '', startsAt: '', endsAt: '' }
  editorError.value = null
  fieldErrors.value = {}
  editorOpen.value = true
}

function openEdit(season: ClanSeasonResponse) {
  editingId.value = season.id
  draft.value = {
    name: season.name,
    slug: season.slug,
    startsAt: isoToLocalInput(season.startsAt),
    endsAt: isoToLocalInput(season.endsAt),
  }
  editorError.value = null
  fieldErrors.value = {}
  editorOpen.value = true
}

function setName(value: string | number) {
  const name = String(value)
  const autoSlug = !draft.value.slug || draft.value.slug === slugify(draft.value.name)
  draft.value = { ...draft.value, name, slug: autoSlug ? slugify(name) : draft.value.slug }
}

async function saveSeason() {
  busy.value = true
  editorError.value = null
  fieldErrors.value = {}
  try {
    const api = await import('@/api/admin/clans')
    const body = {
      name: draft.value.name.trim(),
      slug: draft.value.slug.trim() || undefined,
      startsAt: localInputToIso(draft.value.startsAt) ?? undefined,
      endsAt: localInputToIso(draft.value.endsAt) ?? undefined,
    }
    const saved = editingId.value ? await api.updateClanSeason(editingId.value, body) : await api.createClanSeason(body)
    seasons.value = editingId.value
      ? seasons.value.map((s) => (s.id === saved.id ? saved : s))
      : [saved, ...seasons.value]
    editorOpen.value = false
    void loadCurrent()
  } catch (err) {
    const parsed = parseApiError(err, 'Could not save the season.')
    const errors: Record<string, string> = {}
    for (const fe of parsed.fieldErrors) errors[fe.field] = fe.message
    fieldErrors.value = errors
    if (parsed.fieldErrors.length === 0) editorError.value = parsed.message
  } finally {
    busy.value = false
  }
}

async function toggleRewards(season: ClanSeasonResponse) {
  if (expandedId.value === season.id) {
    expandedId.value = null
    return
  }
  expandedId.value = season.id
  rewards.value = []
  rewardError.value = null
  rewardsLoading.value = true
  try {
    const { getClanSeasonRewards } = await import('@/api/admin/clans')
    rewards.value = await getClanSeasonRewards(season.id)
  } catch (err) {
    rewardError.value = parseApiError(err, 'Could not load the rewards.').message
  } finally {
    rewardsLoading.value = false
  }
}

async function addReward() {
  const seasonId = expandedId.value
  const item = rewardDraft.value.item
  if (!seasonId || !item) return
  busy.value = true
  rewardError.value = null
  try {
    const { addClanSeasonReward } = await import('@/api/admin/clans')
    const saved = await addClanSeasonReward(seasonId, {
      rankFrom: Number(rewardDraft.value.rankFrom),
      rankTo: Number(rewardDraft.value.rankTo),
      itemId: item.id,
      quantity: Number(rewardDraft.value.quantity) || 1,
    })
    rewards.value = [...rewards.value, saved].sort((a, b) => a.rankFrom - b.rankFrom)
    rewardDraft.value = { rankFrom: '1', rankTo: '1', quantity: '1', item: null }
  } catch (err) {
    rewardError.value = parseApiError(err, 'Could not add that reward.').message
  } finally {
    busy.value = false
  }
}

async function removeReward(reward: ClanSeasonRewardResponse) {
  busy.value = true
  rewardError.value = null
  try {
    const { removeClanSeasonReward } = await import('@/api/admin/clans')
    await removeClanSeasonReward(reward.id)
    rewards.value = rewards.value.filter((r) => r.id !== reward.id)
  } catch (err) {
    rewardError.value = parseApiError(err, 'Could not remove that reward.').message
  } finally {
    busy.value = false
  }
}

watch(page, load)

onMounted(() => {
  void load()
  void loadCurrent()
  void itemTypeStore.fetchItemTypes()
})
</script>

<template>
  <div class="clan-seasons">
    <div class="clan-seasons__header">
      <div>
        <h2 class="clan-seasons__title">Seasons</h2>
        <p class="clan-seasons__meta">Seasons cannot overlap, and a closed season is read only.</p>
      </div>
      <BaseButton variant="primary" @click="openCreate">New season</BaseButton>
    </div>

    <p class="clan-seasons__current">
      <template v-if="current">{{ current.name }} is running until {{ formatFullDate(current.endsAt) }}.</template>
      <template v-else>No active season, wars are closed.</template>
    </p>

    <p v-if="error" class="clan-seasons__error" role="alert">{{ error }}</p>

    <AdminTable :items="seasons" :loading="loading" :loading-rows="3" empty-message="No seasons yet">
      <template #head>
        <th>Season</th>
        <th style="width: 120px">State</th>
        <th style="width: 170px">Starts</th>
        <th style="width: 170px">Ends</th>
        <th class="right" style="width: 300px">Actions</th>
      </template>
      <template #default="{ item: season }">
        <td>
          <span class="clan-seasons__name">{{ season.name }}</span>
          <span class="clan-seasons__slug">/{{ season.slug }}</span>
          <div v-if="standingsId === season.id" class="clan-seasons__rewards">
            <ClanSeasonStandings :season-id="season.id" />
          </div>
          <div v-if="expandedId === season.id" class="clan-seasons__rewards">
            <p v-if="rewardError" class="clan-seasons__error" role="alert">{{ rewardError }}</p>
            <div v-if="rewardsLoading" class="clan-seasons__reward-list">
              <SkeletonLoader v-for="i in 2" :key="i" variant="text" />
            </div>
            <p v-else-if="!rewards.length" class="clan-seasons__empty">No rewards yet.</p>
            <ul v-else class="clan-seasons__reward-list">
              <li v-for="reward in rewards" :key="reward.id" class="clan-seasons__reward">
                <span class="mono">#{{ reward.rankFrom }}<template v-if="reward.rankTo !== reward.rankFrom"> to #{{ reward.rankTo }}</template></span>
                <span>{{ reward.quantity }}× {{ reward.item.name }}</span>
                <span class="clan-seasons__recipient">to {{ recipient(reward.item) }}</span>
                <BaseButton v-if="!season.closedAt" size="sm" variant="destructive" :disabled="busy" @click="removeReward(reward)">Remove</BaseButton>
              </li>
            </ul>
            <form v-if="!season.closedAt" class="clan-seasons__reward-form" @submit.prevent="addReward">
              <BaseInput v-model="rewardDraft.rankFrom" type="number" label="From rank" />
              <BaseInput v-model="rewardDraft.rankTo" type="number" label="To rank" />
              <BaseInput v-model="rewardDraft.quantity" type="number" label="Quantity" />
              <BaseButton size="sm" :disabled="busy" @click="pickerOpen = true">
                {{ rewardDraft.item ? rewardDraft.item.name : 'Pick item' }}
              </BaseButton>
              <BaseButton size="sm" variant="primary" :loading="busy" :disabled="!rewardDraft.item">Add reward</BaseButton>
            </form>
            <p v-if="!season.closedAt" class="clan-seasons__empty">Clan cosmetics go to the clan. Any other item goes to each of the clan's contributing members.</p>
          </div>
        </td>
        <td>{{ state(season) }}</td>
        <td>{{ formatFullDate(season.startsAt) }}</td>
        <td>{{ formatFullDate(season.endsAt) }}</td>
        <td class="right">
          <span class="clan-seasons__actions">
            <BaseButton size="sm" @click="toggleStandings(season)">{{ standingsId === season.id ? 'Hide standings' : 'Standings' }}</BaseButton>
            <BaseButton size="sm" @click="toggleRewards(season)">{{ expandedId === season.id ? 'Hide rewards' : 'Rewards' }}</BaseButton>
            <BaseButton v-if="!season.closedAt" size="sm" @click="openEdit(season)">Edit</BaseButton>
          </span>
        </td>
      </template>
    </AdminTable>

    <PaginationControls :page="page" :total-pages="totalPages" @update:page="(p: number) => { page = p }" />

    <BaseModal :open="editorOpen" :title="editingId ? 'Edit season' : 'New season'" max-width="520px" @close="editorOpen = false">
      <div class="clan-seasons__form">
        <BaseInput :model-value="draft.name" label="Name" placeholder="Season 2" :error="fieldErrors.name" @update:model-value="setName" />
        <BaseInput v-model="draft.slug" label="Slug" placeholder="season-2" :error="fieldErrors.slug" />
        <BaseInput v-model="draft.startsAt" type="datetime-local" label="Starts at" :error="fieldErrors.startsAt" />
        <BaseInput v-model="draft.endsAt" type="datetime-local" label="Ends at" :error="fieldErrors.endsAt" />
        <p v-if="editorError" class="clan-seasons__error" role="alert">{{ editorError }}</p>
      </div>
      <template #footer>
        <BaseButton :disabled="busy" @click="editorOpen = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="busy" :disabled="!draft.name || !draft.startsAt || !draft.endsAt" @click="saveSeason">Save</BaseButton>
      </template>
    </BaseModal>

    <AdminItemPicker
      v-if="pickerOpen"
      title="Pick a season reward"
      :exclude-ids="[]"
      @close="pickerOpen = false"
      @pick="(item) => { rewardDraft.item = item; pickerOpen = false }"
    />
  </div>
</template>

<style scoped>
.clan-seasons {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.clan-seasons__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-lg);
  flex-wrap: wrap;
}

.clan-seasons__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.clan-seasons__meta {
  margin: 2px 0 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.clan-seasons__current {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-primary);
}

.clan-seasons__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.clan-seasons__empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.clan-seasons__name {
  font-weight: 600;
  color: var(--text-primary);
}

.clan-seasons__slug {
  margin-left: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.clan-seasons__actions {
  display: inline-flex;
  gap: var(--space-xs);
}

.clan-seasons__rewards {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.clan-seasons__reward-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.clan-seasons__reward {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-md);
}

.clan-seasons__recipient {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.clan-seasons__reward-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-sm);
}

.clan-seasons__reward-form :deep(.base-input) {
  width: 110px;
}

.clan-seasons__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
