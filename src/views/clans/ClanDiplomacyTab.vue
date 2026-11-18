<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import SwapList from '@/components/common/SwapList.vue'
import { usePageableRoute } from '@/composables/usePageableRoute'
import type {
  ClanAllianceResponse,
  ClanAllianceStatus,
  ClanResponse,
  ClanRivalResponse,
  ClanRole,
  PublicClanResponse,
} from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { hasClanRole } from '@/utils/clans'
import { formatFullDate } from '@/utils/formatters'
import { knownCount, rememberCount } from '@/utils/knownCount'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ClanLink from './ClanLink.vue'
import ClanPicker from './ClanPicker.vue'

const PAGE_SIZE = 20

const props = defineProps<{
  clan: ClanResponse
  viewerRole: ClanRole | null
  ownClanId: string | null
  ownRole: ClanRole | null
}>()

const route = useRoute()

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: PAGE_SIZE,
  secondarySort: null,
})

const alliances = ref<Page<ClanAllianceResponse> | null>(null)
const proposals = ref<ClanAllianceResponse[]>([])
const called = ref<ClanRivalResponse[]>([])
const calledBy = ref<ClanRivalResponse[]>([])
const allySlots = ref<number | null>(null)
const rivalsLoaded = ref(false)
const proposed = ref(false)
const pending = ref(0)
const loading = computed(() => pending.value > 0)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)

const isFounder = computed(() => hasClanRole(props.viewerRole, 'founder'))
const isCommander = computed(() => hasClanRole(props.viewerRole, 'commander'))
const canPropose = computed(() => !!props.ownClanId && hasClanRole(props.ownRole, 'founder'))
const canRival = computed(() => !!props.ownClanId && hasClanRole(props.ownRole, 'commander'))
const clanId = computed(() => props.clan.clan.id)
const alliesKey = computed(() => `allies:${clanId.value}`)
const rivalsKey = computed(() => `rivals:${clanId.value}`)
const activeAlliances = computed(() => alliances.value?.content ?? [])
const allyRows = computed(() => [
  ...proposals.value.map((alliance) => ({ alliance, pending: true })),
  ...activeAlliances.value.map((alliance) => ({ alliance, pending: false })),
])
const allied = computed(() => activeAlliances.value.some((a) => a.ally.id === props.ownClanId))
const ownCall = computed(() => calledBy.value.some((r) => r.clan.id === props.ownClanId))
const totalPages = computed(() => alliances.value?.totalPages ?? 0)
const takenIds = computed(() => [
  clanId.value,
  ...activeAlliances.value.map((a) => a.ally.id),
  ...proposals.value.map((a) => a.ally.id),
  ...called.value.map((r) => r.clan.id),
])

async function fetchAlliances() {
  const api = await import('@/api/clans')
  const [allies, pending] = await Promise.all([
    api.getClanAlliances(clanId.value, { page: paginationParams.value.page, size: PAGE_SIZE }),
    isFounder.value
      ? api.getClanAllianceProposals(clanId.value, { page: 0, size: 50 }).catch(() => null)
      : Promise.resolve(null),
  ])
  alliances.value = allies
  proposals.value = pending?.content ?? []
  rememberCount(alliesKey.value, allyRows.value.length)
}

async function fetchRivals() {
  const api = await import('@/api/clans')
  const [outgoing, incoming] = await Promise.all([
    api.getClanRivals(clanId.value, { page: 0, size: 50 }),
    api.getClanRivals(clanId.value, { page: 0, size: 50, incoming: true }),
  ])
  called.value = outgoing.content
  calledBy.value = incoming.content
  rivalsLoaded.value = true
  rememberCount(rivalsKey.value, rivals.value.length)
}

async function fetchAllySlots() {
  const { getClanLevel } = await import('@/api/clans')
  const level = await getClanLevel(clanId.value).catch(() => null)
  allySlots.value = level?.unlocked.capacities.ally_slots ?? 0
}

async function load(task: Promise<void>) {
  pending.value += 1
  try {
    await task
  } catch (err) {
    error.value = parseApiError(err, 'Could not load diplomacy.').message
  } finally {
    pending.value -= 1
  }
}

async function run(id: string, action: () => Promise<unknown>, refresh: () => Promise<void>, fallback: string) {
  busyId.value = id
  error.value = null
  try {
    await action()
    await refresh()
  } catch (err) {
    error.value = parseApiError(err, fallback).message
  } finally {
    busyId.value = null
  }
}

function resolveAlliance(alliance: ClanAllianceResponse, status: ClanAllianceStatus) {
  return run(
    alliance.id,
    async () => (await import('@/api/clans')).resolveClanAlliance(alliance.id, { status }),
    fetchAlliances,
    'Could not update that alliance.',
  )
}

function propose(actorId: string, targetId: string) {
  return run(
    'propose',
    async () => {
      await (await import('@/api/clans')).proposeClanAlliance(actorId, { clanId: targetId })
      proposed.value = true
    },
    fetchAlliances,
    'Could not propose that alliance.',
  )
}

function callRival(actorId: string, targetId: string) {
  return run(
    'rival',
    async () => (await import('@/api/clans')).declareClanRival(actorId, { clanId: targetId }),
    fetchRivals,
    'Could not call that rival.',
  )
}

function proposeAsOwnClan() {
  if (props.ownClanId) return propose(props.ownClanId, clanId.value)
}

function toggleOwnRival() {
  const own = props.ownClanId
  if (!own) return
  return ownCall.value ? dropRival(own, clanId.value, 'rival') : callRival(own, clanId.value)
}

interface RivalRow {
  clan: PublicClanResponse
  called: ClanRivalResponse | null
  calledBy: ClanRivalResponse | null
}

const rivals = computed<RivalRow[]>(() => {
  const rows = new Map<string, RivalRow>()
  for (const r of called.value) rows.set(r.clan.id, { clan: r.clan, called: r, calledBy: null })
  for (const r of calledBy.value) {
    const row = rows.get(r.clan.id)
    if (row) row.calledBy = r
    else rows.set(r.clan.id, { clan: r.clan, called: null, calledBy: r })
  }
  return [...rows.values()]
})

function rivalLine(row: RivalRow): string {
  if (row.called && row.calledBy) {
    const since = row.called.since > row.calledBy.since ? row.called.since : row.calledBy.since
    return `Mutual since ${formatFullDate(since)}`
  }
  if (row.called) return `Called ${formatFullDate(row.called.since)}`
  return `Called this clan ${formatFullDate(row.calledBy!.since)}`
}

function dropRival(actorId: string, targetId: string, busyKey: string) {
  return run(
    busyKey,
    async () => (await import('@/api/clans')).dropClanRival(actorId, targetId),
    fetchRivals,
    'Could not drop that rival.',
  )
}

load(Promise.all([fetchRivals(), fetchAllySlots()]).then(() => undefined))
watch(() => [route.query.page, props.viewerRole], () => load(fetchAlliances()), { immediate: true })
</script>

<template>
  <section class="diplomacy">
    <p v-if="error" class="diplomacy__error" role="alert">{{ error }}</p>

    <div class="diplomacy__block">
      <header class="diplomacy__head">
        <h2 class="diplomacy__title section-title">
          Alliances
          <span v-if="allySlots !== null" class="diplomacy__slots">{{ alliances?.totalElements ?? 0 }}/{{ allySlots }}</span>
        </h2>
        <ClanPicker
          v-if="isFounder"
          :exclude-ids="takenIds"
          :disabled="busyId === 'propose'"
          placeholder="Propose an alliance..."
          @select="propose(clanId, $event.clan.id)"
        />
        <span v-else-if="proposed" class="caption">Proposal sent</span>
        <BaseButton v-else-if="canPropose && alliances && !allied" :loading="busyId === 'propose'" @click="proposeAsOwnClan">
          Propose Alliance
        </BaseButton>
      </header>

      <p v-if="!loading && allyRows.length === 0" class="caption">No allies</p>
      <SwapList
        v-else
        as="ul"
        class="diplomacy__list"
        :items="allyRows"
        :item-key="(row) => row.alliance.id"
        :loading="loading && !alliances"
        :refreshing="loading && !!alliances"
        :placeholders="knownCount(alliesKey, 1)"
      >
        <template #placeholder>
          <li class="placeholder"><SkeletonLoader height="56px" /></li>
        </template>
        <template #default="{ item: { alliance, pending: waiting }, swap }">
          <li v-bind="swap" class="diplomacy__row">
            <ClanLink :clan="alliance.ally" />
            <span v-if="waiting" class="caption">{{ alliance.incoming ? 'Proposed to you' : 'Proposal sent' }}</span>
            <span v-else class="caption">
              {{ alliance.warsFoughtTogether }} {{ alliance.warsFoughtTogether === 1 ? 'war' : 'wars' }} together · since {{ formatFullDate(alliance.acceptedAt ?? alliance.createdAt) }}
            </span>
            <span class="diplomacy__actions">
              <template v-if="waiting && alliance.incoming">
                <BaseButton variant="primary" :loading="busyId === alliance.id" @click="resolveAlliance(alliance, 'active')">Accept</BaseButton>
                <BaseButton :disabled="busyId === alliance.id" @click="resolveAlliance(alliance, 'declined')">Decline</BaseButton>
              </template>
              <BaseButton v-else-if="waiting" :loading="busyId === alliance.id" @click="resolveAlliance(alliance, 'declined')">Withdraw</BaseButton>
              <BaseButton
                v-else-if="isFounder"
                variant="destructive"
                :loading="busyId === alliance.id"
                @click="resolveAlliance(alliance, 'ended')"
              >
                End Alliance
              </BaseButton>
            </span>
          </li>
        </template>
      </SwapList>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
    </div>

    <div class="diplomacy__block">
      <header class="diplomacy__head">
        <h2 class="diplomacy__title section-title">Rivals</h2>
        <ClanPicker
          v-if="isCommander"
          :exclude-ids="takenIds"
          :disabled="busyId === 'rival'"
          placeholder="Call a rival..."
          @select="callRival(clanId, $event.clan.id)"
        />
        <BaseButton v-else-if="canRival && rivalsLoaded" :loading="busyId === 'rival'" @click="toggleOwnRival">
          {{ ownCall ? 'Drop Rival' : 'Call Rival' }}
        </BaseButton>
      </header>

      <p v-if="!loading && rivals.length === 0" class="caption">No rivals</p>
      <SwapList
        v-else
        as="ul"
        class="diplomacy__list"
        :items="rivals"
        :item-key="(rival) => rival.clan.id"
        :loading="loading && rivals.length === 0"
        :placeholders="knownCount(rivalsKey, 1)"
      >
        <template #placeholder>
          <li class="placeholder"><SkeletonLoader height="56px" /></li>
        </template>
        <template #default="{ item: rival, swap }">
          <li v-bind="swap" class="diplomacy__row">
            <ClanLink :clan="rival.clan" />
            <span class="caption">{{ rivalLine(rival) }}</span>
            <span class="diplomacy__actions">
              <BaseButton
                v-if="isCommander && rival.called"
                :loading="busyId === rival.clan.id"
                @click="dropRival(clanId, rival.clan.id, rival.clan.id)"
              >
                Drop
              </BaseButton>
            </span>
          </li>
        </template>
      </SwapList>
    </div>
  </section>
</template>

<style scoped>
.diplomacy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xl);
}

.diplomacy__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.diplomacy__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
  min-height: var(--control-h);
}

.diplomacy__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.diplomacy__slots {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-secondary);
}

.diplomacy__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.diplomacy__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
}

.diplomacy__row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 56px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border-radius: var(--radius-card);
}

.diplomacy__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-xs);
  min-width: 96px;
}

@media (max-width: 767px) {
  .diplomacy__row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .diplomacy__row > .caption {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
