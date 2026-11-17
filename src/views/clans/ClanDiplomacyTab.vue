<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
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
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ClanLink from './ClanLink.vue'
import ClanPicker from './ClanPicker.vue'

const PAGE_SIZE = 20

const props = defineProps<{
  clan: ClanResponse
  viewerRole: ClanRole | null
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
const pending = ref(0)
const loading = computed(() => pending.value > 0)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)

const isFounder = computed(() => hasClanRole(props.viewerRole, 'founder'))
const isCommander = computed(() => hasClanRole(props.viewerRole, 'commander'))
const clanId = computed(() => props.clan.clan.id)
const activeAlliances = computed(() => alliances.value?.content ?? [])
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
}

async function fetchRivals() {
  const api = await import('@/api/clans')
  const [outgoing, incoming] = await Promise.all([
    api.getClanRivals(clanId.value, { page: 0, size: 50 }),
    api.getClanRivals(clanId.value, { page: 0, size: 50, incoming: true }),
  ])
  called.value = outgoing.content
  calledBy.value = incoming.content
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

function propose(target: PublicClanResponse) {
  return run(
    'propose',
    async () => (await import('@/api/clans')).proposeClanAlliance(clanId.value, { clanId: target.id }),
    fetchAlliances,
    'Could not propose that alliance.',
  )
}

function callRival(target: PublicClanResponse) {
  return run(
    'rival',
    async () => (await import('@/api/clans')).declareClanRival(clanId.value, { clanId: target.id }),
    fetchRivals,
    'Could not call that rival.',
  )
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

function dropRival(rival: ClanRivalResponse) {
  return run(
    rival.clan.id,
    async () => (await import('@/api/clans')).dropClanRival(clanId.value, rival.clan.id),
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
          @select="propose($event.clan)"
        />
      </header>

      <div v-if="loading && !alliances" class="diplomacy__skeleton">
        <SkeletonLoader v-for="i in 3" :key="i" variant="table-row" />
      </div>
      <p v-else-if="activeAlliances.length === 0 && proposals.length === 0" class="caption">No allies</p>

      <ul v-else class="diplomacy__list">
        <li v-for="proposal in proposals" :key="proposal.id" class="diplomacy__row">
          <ClanLink :clan="proposal.ally" />
          <span class="caption">{{ proposal.incoming ? 'Proposed to you' : 'Proposal sent' }}</span>
          <span class="diplomacy__actions">
            <template v-if="proposal.incoming">
              <BaseButton variant="primary" :loading="busyId === proposal.id" @click="resolveAlliance(proposal, 'active')">Accept</BaseButton>
              <BaseButton :disabled="busyId === proposal.id" @click="resolveAlliance(proposal, 'declined')">Decline</BaseButton>
            </template>
            <BaseButton v-else :loading="busyId === proposal.id" @click="resolveAlliance(proposal, 'declined')">Withdraw</BaseButton>
          </span>
        </li>

        <li v-for="alliance in activeAlliances" :key="alliance.id" class="diplomacy__row">
          <ClanLink :clan="alliance.ally" />
          <span class="caption">
            {{ alliance.warsFoughtTogether }} {{ alliance.warsFoughtTogether === 1 ? 'war' : 'wars' }} together · since {{ formatFullDate(alliance.acceptedAt ?? alliance.createdAt) }}
          </span>
          <span class="diplomacy__actions">
            <BaseButton
              v-if="isFounder"
              variant="destructive"
              :loading="busyId === alliance.id"
              @click="resolveAlliance(alliance, 'ended')"
            >
              End Alliance
            </BaseButton>
          </span>
        </li>
      </ul>

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
          @select="callRival($event.clan)"
        />
      </header>

      <p v-if="!loading && called.length === 0 && calledBy.length === 0" class="caption">No rivals</p>

      <ul v-if="rivals.length" class="diplomacy__list">
        <li v-for="rival in rivals" :key="rival.clan.id" class="diplomacy__row">
          <ClanLink :clan="rival.clan" />
          <span class="caption">{{ rivalLine(rival) }}</span>
          <span class="diplomacy__actions">
            <BaseButton
              v-if="isCommander && rival.called"
              :loading="busyId === rival.clan.id"
              @click="dropRival(rival.called)"
            >
              Drop
            </BaseButton>
          </span>
        </li>
      </ul>
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

.diplomacy__skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
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
