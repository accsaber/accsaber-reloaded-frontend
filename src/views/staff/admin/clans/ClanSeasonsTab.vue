<script setup lang="ts">
import { ApiError, parseApiError } from '@/api/client'
import AdminItemPicker from '@/components/admin/AdminItemPicker.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import IconButton from '@/components/common/IconButton.vue'
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

function pickReward(item: ItemResponse) {
  rewardDraft.value.item = item
  pickerOpen.value = false
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
    <div class="clan-seasons__head">
      <p class="clan-seasons__current">
        {{ current ? `${current.name} runs until ${formatFullDate(current.endsAt)}` : 'No active season, wars are closed' }}
      </p>
      <BaseButton variant="primary" @click="openCreate">New Season</BaseButton>
    </div>

    <p v-if="error" class="caption clan-seasons__error" role="alert">{{ error }}</p>

    <div v-if="loading && !seasons.length" class="clan-seasons__list">
      <SkeletonLoader v-for="n in 3" :key="n" class="placeholder" height="68px" />
    </div>
    <p v-else-if="!seasons.length" class="caption">No seasons yet</p>
    <ul v-else class="clan-seasons__list" :class="{ refreshing: loading }">
      <li v-for="season in seasons" :key="season.id" class="clan-seasons__season">
        <div class="clan-seasons__row">
          <span class="clan-seasons__identity">
            <span class="clan-seasons__name">{{ season.name }}</span>
            <span class="caption">{{ state(season) }}, {{ formatFullDate(season.startsAt) }} to {{ formatFullDate(season.endsAt) }}</span>
          </span>
          <BaseButton size="sm" :aria-expanded="standingsId === season.id" @click="toggleStandings(season)">Standings</BaseButton>
          <BaseButton size="sm" :aria-expanded="expandedId === season.id" @click="toggleRewards(season)">Rewards</BaseButton>
          <BaseButton v-if="!season.closedAt" size="sm" @click="openEdit(season)">Edit</BaseButton>
        </div>

        <Transition name="collapse">
          <div v-if="standingsId === season.id" class="collapsible">
            <div class="clan-seasons__panel">
              <ClanSeasonStandings :season-id="season.id" />
            </div>
          </div>
        </Transition>

        <Transition name="collapse">
          <div v-if="expandedId === season.id" class="collapsible">
            <div class="clan-seasons__panel">
              <p v-if="rewardError" class="caption clan-seasons__error" role="alert">{{ rewardError }}</p>
              <SkeletonLoader v-if="rewardsLoading" class="placeholder" height="var(--control-h)" />
              <p v-else-if="!rewards.length" class="caption">No rewards yet</p>
              <ul v-else class="clan-seasons__rewards">
                <li v-for="reward in rewards" :key="reward.id" class="clan-seasons__reward">
                  <span class="clan-seasons__rank">#{{ reward.rankFrom }}{{ reward.rankTo !== reward.rankFrom ? ` to #${reward.rankTo}` : '' }}</span>
                  <span>{{ reward.quantity }}x {{ reward.item.name }}</span>
                  <span class="caption">to {{ recipient(reward.item) }}</span>
                  <IconButton v-if="!season.closedAt" icon="close" :label="`Remove ${reward.item.name}`" :disabled="busy"
                    @click="removeReward(reward)" />
                </li>
              </ul>
              <form v-if="!season.closedAt" class="clan-seasons__reward-form" @submit.prevent="addReward">
                <BaseInput v-model="rewardDraft.rankFrom" class="clan-seasons__number" type="number" min="1" label="From Rank" />
                <BaseInput v-model="rewardDraft.rankTo" class="clan-seasons__number" type="number" min="1" label="To Rank" />
                <BaseInput v-model="rewardDraft.quantity" class="clan-seasons__number" type="number" min="1" label="Quantity" />
                <BaseButton :disabled="busy" @click="pickerOpen = true">{{ rewardDraft.item ? rewardDraft.item.name : 'Pick Item' }}</BaseButton>
                <BaseButton variant="primary" :loading="busy" :disabled="!rewardDraft.item" @click="addReward">Add Reward</BaseButton>
              </form>
            </div>
          </div>
        </Transition>
      </li>
    </ul>

    <PaginationControls v-if="totalPages > 1" :page="page" :total-pages="totalPages" @update:page="page = $event" />

    <BaseModal :open="editorOpen" :title="editingId ? 'Edit Season' : 'New Season'" max-width="520px" @close="editorOpen = false">
      <form class="clan-seasons__form" @submit.prevent="saveSeason">
        <BaseInput :model-value="draft.name" label="Name" :error="fieldErrors.name" @update:model-value="setName" />
        <BaseInput v-model="draft.slug" label="Slug" :error="fieldErrors.slug" />
        <BaseInput v-model="draft.startsAt" type="datetime-local" label="Starts" :error="fieldErrors.startsAt" />
        <BaseInput v-model="draft.endsAt" type="datetime-local" label="Ends" :error="fieldErrors.endsAt" />
        <p class="caption clan-seasons__form-error" role="alert">{{ editorError }}</p>
      </form>
      <template #footer>
        <BaseButton :disabled="busy" @click="editorOpen = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="busy" :disabled="!draft.name || !draft.startsAt || !draft.endsAt" @click="saveSeason">Save</BaseButton>
      </template>
    </BaseModal>

    <AdminItemPicker v-if="pickerOpen" title="Pick a Season Reward" :exclude-ids="[]" @close="pickerOpen = false" @pick="pickReward" />
  </div>
</template>

<style scoped>
.clan-seasons {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.clan-seasons__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.clan-seasons__current {
  margin: 0;
  color: var(--text-secondary);
}

.clan-seasons__error,
.clan-seasons__form-error {
  color: var(--error);
}

.clan-seasons__form-error {
  min-height: 1lh;
}

.clan-seasons__list,
.clan-seasons__rewards {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.clan-seasons__season {
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.clan-seasons__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
}

.clan-seasons__identity {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 200px;
}

.clan-seasons__name {
  font-weight: 600;
  color: var(--text-primary);
}

.clan-seasons__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-top: var(--space-md);
}

.clan-seasons__reward {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-height: var(--control-h);
}

.clan-seasons__rank {
  min-width: 96px;
  font-family: var(--font-mono);
  font-weight: 600;
}

.clan-seasons__reward-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-sm);
}

.clan-seasons__number {
  width: 120px;
}

.clan-seasons__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
</style>
