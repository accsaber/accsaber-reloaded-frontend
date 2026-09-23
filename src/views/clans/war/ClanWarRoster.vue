<script setup lang="ts">
import { parseApiError } from '@/api/client'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanWarHitResponse, ClanWarParticipantResponse, ClanWarResponse } from '@/types/api/clans'
import type { Page } from '@/types/pagination'
import { computed, ref, watch } from 'vue'
import WarBar from './WarBar.vue'

const PAGE_SIZE = 50
const GUARD_MAX = 100

const props = defineProps<{
  war: ClanWarResponse
  lastHit: ClanWarHitResponse | null
  reloadKey: number
}>()

const page = ref(1)
const participants = ref<Page<ClanWarParticipantResponse> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const sides = computed(() => [
  { role: 'attacker' as const, clan: props.war.attacker.clan },
  { role: 'defender' as const, clan: props.war.defender.clan },
])

function bySide(clanId: string): ClanWarParticipantResponse[] {
  return (participants.value?.content ?? []).filter((p) => p.clan.id === clanId)
}

function broken(p: ClanWarParticipantResponse): boolean {
  return p.guard <= 0
}

function lentBy(p: ClanWarParticipantResponse) {
  const home = p.player.clan
  return home && home.id !== p.clan.id ? home : null
}

async function fetchRoster() {
  loading.value = true
  error.value = null
  try {
    const { getClanWarParticipants } = await import('@/api/clans')
    participants.value = await getClanWarParticipants(props.war.id, { page: page.value - 1, size: PAGE_SIZE })
  } catch (err) {
    error.value = parseApiError(err, 'Could not load the roster.').message
  } finally {
    loading.value = false
  }
}

watch(
  () => props.lastHit,
  (hit) => {
    if (!hit || !participants.value) return
    const victim = participants.value.content.find((p) => p.player.id === hit.victim.id)
    if (!victim) return
    victim.guard = hit.guardAfter
    if (hit.broke) victim.breaksSuffered += 1
  },
)

watch([page, () => props.reloadKey, () => props.war.id], fetchRoster, { immediate: true })
</script>

<template>
  <section class="war-roster">
    <h2 class="war-roster__title">Roster</h2>
    <p v-if="error" class="war-roster__error" role="alert">{{ error }}</p>

    <div v-if="loading && !participants" class="war-roster__sides">
      <div v-for="i in 2" :key="i" class="war-roster__side">
        <SkeletonLoader v-for="j in 4" :key="j" variant="table-row" />
      </div>
    </div>
    <p v-else-if="!participants?.content.length" class="war-roster__empty">
      {{ war.status === 'active' || war.status === 'ended' ? 'Nobody enrolled.' : 'Fighters enrol when the war starts.' }}
    </p>
    <div v-else class="war-roster__sides">
      <div v-for="side in sides" :key="side.role" class="war-roster__side" :class="`war-roster__side--${side.role}`">
        <h3 class="war-roster__side-title">
          <ClanTag :clan="side.clan" size="sm" />
          <span>{{ bySide(side.clan.id).length }} fighters</span>
        </h3>
        <ul class="war-roster__list">
          <li
            v-for="p in bySide(side.clan.id)"
            :key="p.player.id"
            class="war-roster__row"
            :class="{ 'war-roster__row--broken': broken(p), 'war-roster__row--left': p.leftAt }"
          >
            <span class="war-roster__who">
              <UserChip :user="p.player" size="sm" link tooltip />
              <span v-if="lentBy(p)" class="war-roster__lent">lent by <ClanTag :clan="lentBy(p)!" size="xs" /></span>
              <span v-if="p.leftAt" class="war-roster__lent">left</span>
            </span>
            <span class="war-roster__guard">
              <WarBar :value="p.guard" :max="GUARD_MAX" :broken="broken(p)" />
              <span class="war-roster__guard-value">{{ Math.round(p.guard) }}</span>
            </span>
            <span class="war-roster__stats">
              <span :title="'Share of the clan strength'">{{ Math.round(p.standingWeight * 100) }}%</span>
              <span :title="'Breaks suffered'">{{ p.breaksSuffered }} broken</span>
              <span :title="'Contribution'">{{ Math.round(p.contribution) }} contrib</span>
            </span>
            <span v-if="war.ruleset === 'duel'" class="war-roster__duel">
              <span class="war-roster__duel-label">vs</span>
              <UserChip v-if="p.duelTarget" :user="p.duelTarget" size="xs" compact link />
              <span v-else class="war-roster__none">nobody</span>
            </span>
            <span v-if="broken(p)" class="war-roster__broken-note">
              Guard broken. A personal best on a pooled map restores it.
            </span>
          </li>
        </ul>
      </div>
    </div>

    <PaginationControls
      v-if="(participants?.totalPages ?? 0) > 1"
      :page="page"
      :total-pages="participants!.totalPages"
      @update:page="page = $event"
    />
  </section>
</template>

<style scoped>
.war-roster {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.war-roster__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
  color: var(--text-primary);
}

.war-roster__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.war-roster__empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-roster__sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-lg);
}

.war-roster__side {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.war-roster__side-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.war-roster__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.war-roster__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: var(--space-xs) var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.war-roster__row:last-child {
  border-bottom: none;
}

.war-roster__row:nth-child(even) {
  background: var(--bg-elevated);
}

.war-roster__row--left {
  opacity: 0.5;
}

.war-roster__who {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.war-roster__lent {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.war-roster__guard {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.war-roster__guard-value {
  min-width: 3ch;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  text-align: right;
  color: var(--text-secondary);
}

.war-roster__row--broken .war-roster__guard-value {
  color: var(--error);
}

.war-roster__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.war-roster__duel {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-xs);
  font-size: var(--text-caption);
}

.war-roster__duel-label,
.war-roster__none {
  color: var(--text-tertiary);
}

.war-roster__broken-note {
  grid-column: 1 / -1;
  font-size: var(--text-caption);
  color: var(--error);
}

@media (max-width: 720px) {
  .war-roster__sides {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
