<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseButton from '@/components/common/BaseButton.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
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
const loading = ref(true)
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)

const isFounder = computed(() => hasClanRole(props.viewerRole, 'founder'))
const isCommander = computed(() => hasClanRole(props.viewerRole, 'commander'))
const clanId = computed(() => props.clan.clan.id)
const activeAlliances = computed(() => (alliances.value?.content ?? []).filter((a) => a.status === 'active'))
const totalPages = computed(() => alliances.value?.totalPages ?? 0)
const takenIds = computed(() => [
  clanId.value,
  ...activeAlliances.value.map((a) => a.ally.id),
  ...proposals.value.map((a) => a.ally.id),
  ...called.value.map((r) => r.clan.id),
])

async function fetchAll() {
  loading.value = true
  try {
    const api = await import('@/api/clans')
    const [allies, outgoing, incoming, level, pending] = await Promise.all([
      api.getClanAlliances(clanId.value, { page: paginationParams.value.page, size: PAGE_SIZE }),
      api.getClanRivals(clanId.value, { page: 0, size: 50 }),
      api.getClanRivals(clanId.value, { page: 0, size: 50, incoming: true }),
      api.getClanLevel(clanId.value).catch(() => null),
      isFounder.value
        ? api.getClanAllianceProposals(clanId.value, { page: 0, size: 50 }).catch(() => null)
        : Promise.resolve(null),
    ])
    alliances.value = allies
    called.value = outgoing.content
    calledBy.value = incoming.content
    allySlots.value = level?.unlocked.capacities.ally_slots ?? 0
    proposals.value = (pending?.content ?? []).filter((a) => a.status === 'pending')
  } catch (err) {
    error.value = parseApiError(err, 'Could not load diplomacy.').message
  } finally {
    loading.value = false
  }
}

async function run(id: string, action: () => Promise<unknown>, fallback: string) {
  busyId.value = id
  error.value = null
  try {
    await action()
    await fetchAll()
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
    'Could not update that alliance.',
  )
}

function propose(target: PublicClanResponse) {
  return run(
    'propose',
    async () => (await import('@/api/clans')).proposeClanAlliance(clanId.value, { clanId: target.id }),
    'Could not propose that alliance.',
  )
}

function callRival(target: PublicClanResponse) {
  return run(
    'rival',
    async () => (await import('@/api/clans')).declareClanRival(clanId.value, { clanId: target.id }),
    'Could not call that rival.',
  )
}

function dropRival(rival: ClanRivalResponse) {
  return run(
    rival.clan.id,
    async () => (await import('@/api/clans')).dropClanRival(clanId.value, rival.clan.id),
    'Could not drop that rival.',
  )
}

watch(() => [route.query.page, props.viewerRole], fetchAll, { immediate: true })
</script>

<template>
  <section class="diplomacy">
    <p v-if="error" class="diplomacy__error" role="alert">{{ error }}</p>

    <div class="diplomacy__block">
      <header class="diplomacy__head">
        <h2 class="diplomacy__title">
          Alliances
          <span v-if="allySlots !== null" class="diplomacy__slots">{{ activeAlliances.length }}/{{ allySlots }}</span>
        </h2>
        <ClanPicker
          v-if="isFounder"
          :exclude-ids="takenIds"
          :disabled="busyId === 'propose'"
          placeholder="Propose an alliance..."
          @select="propose"
        />
      </header>

      <div v-if="loading && !alliances" class="diplomacy__skeleton">
        <SkeletonLoader v-for="i in 3" :key="i" variant="table-row" />
      </div>
      <p v-else-if="activeAlliances.length === 0 && proposals.length === 0" class="diplomacy__empty">No allies.</p>

      <ul v-else class="diplomacy__list">
        <li v-for="proposal in proposals" :key="proposal.id" class="diplomacy__row diplomacy__row--pending">
          <RouterLink class="diplomacy__clan" :to="{ name: 'clan-detail', params: { slugOrId: proposal.ally.slug } }">
            <ClanIcon :clan="proposal.ally" :size="32" />
            <ClanTag :clan="proposal.ally" size="md" effects />
            <span class="diplomacy__name">{{ proposal.ally.name }}</span>
          </RouterLink>
          <span class="diplomacy__meta">{{ proposal.incoming ? 'Proposed to you' : 'Proposal sent' }}</span>
          <span class="diplomacy__actions">
            <template v-if="proposal.incoming">
              <BaseButton variant="primary" size="sm" :loading="busyId === proposal.id" @click="resolveAlliance(proposal, 'active')">Accept</BaseButton>
              <BaseButton size="sm" :disabled="busyId === proposal.id" @click="resolveAlliance(proposal, 'declined')">Decline</BaseButton>
            </template>
            <BaseButton v-else size="sm" :loading="busyId === proposal.id" @click="resolveAlliance(proposal, 'ended')">Withdraw</BaseButton>
          </span>
        </li>

        <li v-for="alliance in activeAlliances" :key="alliance.id" class="diplomacy__row">
          <RouterLink class="diplomacy__clan" :to="{ name: 'clan-detail', params: { slugOrId: alliance.ally.slug } }">
            <ClanIcon :clan="alliance.ally" :size="32" />
            <ClanTag :clan="alliance.ally" size="md" effects />
            <span class="diplomacy__name">{{ alliance.ally.name }}</span>
          </RouterLink>
          <span class="diplomacy__meta">
            <template v-if="alliance.trust">Trust {{ alliance.trust.level }} · {{ alliance.trust.loanCap }} loans · </template>
            since {{ formatFullDate(alliance.acceptedAt ?? alliance.createdAt) }}
          </span>
          <span class="diplomacy__actions">
            <BaseButton
              v-if="isFounder"
              variant="destructive"
              size="sm"
              :loading="busyId === alliance.id"
              @click="resolveAlliance(alliance, 'ended')"
            >
              End alliance
            </BaseButton>
          </span>
        </li>
      </ul>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages" @update:page="setPage" />
    </div>

    <div class="diplomacy__block">
      <header class="diplomacy__head">
        <h2 class="diplomacy__title">Rivals</h2>
        <ClanPicker
          v-if="isCommander"
          :exclude-ids="takenIds"
          :disabled="busyId === 'rival'"
          placeholder="Call a rival..."
          @select="callRival"
        />
      </header>

      <p v-if="!loading && called.length === 0 && calledBy.length === 0" class="diplomacy__empty">No rivals.</p>

      <ul v-if="called.length" class="diplomacy__list">
        <li v-for="rival in called" :key="rival.clan.id" class="diplomacy__row">
          <RouterLink class="diplomacy__clan" :to="{ name: 'clan-detail', params: { slugOrId: rival.clan.slug } }">
            <ClanIcon :clan="rival.clan" :size="32" />
            <ClanTag :clan="rival.clan" size="md" effects />
            <span class="diplomacy__name">{{ rival.clan.name }}</span>
          </RouterLink>
          <span class="diplomacy__meta">Called {{ formatFullDate(rival.since) }}</span>
          <span class="diplomacy__actions">
            <BaseButton v-if="isCommander" size="sm" :loading="busyId === rival.clan.id" @click="dropRival(rival)">Drop</BaseButton>
          </span>
        </li>
      </ul>

      <ul v-if="calledBy.length" class="diplomacy__list">
        <li v-for="rival in calledBy" :key="rival.clan.id" class="diplomacy__row">
          <RouterLink class="diplomacy__clan" :to="{ name: 'clan-detail', params: { slugOrId: rival.clan.slug } }">
            <ClanIcon :clan="rival.clan" :size="32" />
            <ClanTag :clan="rival.clan" size="md" effects />
            <span class="diplomacy__name">{{ rival.clan.name }}</span>
          </RouterLink>
          <span class="diplomacy__meta">Called this clan {{ formatFullDate(rival.since) }}</span>
          <span class="diplomacy__actions" />
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
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
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

.diplomacy__empty {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-tertiary);
}

.diplomacy__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.diplomacy__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.diplomacy__row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-md);
  min-height: 56px;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.diplomacy__row:last-child {
  border-bottom: none;
}

.diplomacy__row--pending {
  background: var(--bg-elevated);
}

.diplomacy__clan {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  font-size: var(--text-card-title);
  color: var(--text-primary);
  text-decoration: none;
}

.diplomacy__name {
  font-size: var(--text-body);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.diplomacy__clan:hover .diplomacy__name {
  color: var(--page-accent, var(--accent));
}

.diplomacy__meta {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
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

  .diplomacy__meta {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
