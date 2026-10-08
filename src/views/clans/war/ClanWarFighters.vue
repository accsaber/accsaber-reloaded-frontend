<script setup lang="ts">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanWarParticipantResponse, ClanWarResponse } from '@/types/api/clans'
import { WAR_GUARD_MAX, warSideStyles } from '@/utils/clans'
import { computed } from 'vue'
import ClanBar from '../ClanBar.vue'

const props = defineProps<{
  war: ClanWarResponse
  participants: ClanWarParticipantResponse[] | null
  error: string | null
}>()

type Fighter = ClanWarParticipantResponse | null

const styles = computed(() => warSideStyles(props.war))

function side(clanId: string): ClanWarParticipantResponse[] {
  return (props.participants ?? [])
    .filter((p) => p.clan.id === clanId)
    .sort((a, b) => b.standingWeight - a.standingWeight)
}

const rows = computed<[Fighter, Fighter][]>(() => {
  const left = side(props.war.attacker.clan.id)
  const right = side(props.war.defender.clan.id)
  if (props.war.ruleset !== 'duel') {
    return Array.from({ length: Math.max(left.length, right.length) }, (_, i) => [left[i] ?? null, right[i] ?? null])
  }
  const unpaired = new Set(right)
  const paired: [Fighter, Fighter][] = left.map((p) => {
    const target = right.find((r) => r.player.id === p.duelTarget?.id) ?? null
    if (target) unpaired.delete(target)
    return [p, target]
  })
  return [...paired, ...[...unpaired].map((r): [Fighter, Fighter] => [null, r])]
})

function lentBy(p: ClanWarParticipantResponse) {
  const home = p.player.clan
  return home && home.id !== p.clan.id ? home : null
}
</script>

<template>
  <section class="fighters">
    <header class="fighters__head">
      <h2 class="fighters__title">Fighters</h2>
      <p class="fighters__legend">
        Guard drops when an enemy beats your score on a pool map and breaks at 0. A personal best on a pool map restores it.
      </p>
    </header>
    <p v-if="error" class="fighters__error" role="alert">{{ error }}</p>

    <div v-if="!participants" class="fighters__grid">
      <SkeletonLoader v-for="i in 8" :key="i" variant="table-row" />
    </div>
    <p v-else-if="!rows.length" class="fighters__empty">
      {{ war.status === 'active' || war.status === 'ended' ? 'Nobody enrolled.' : 'Fighters enrol when the war starts.' }}
    </p>
    <ul v-else class="fighters__grid">
      <li v-for="(row, i) in rows" :key="i" class="fighters__row">
        <template v-for="(fighter, column) in row" :key="column">
          <div
            v-if="fighter"
            class="fighters__cell clan-colors"
            :class="[
              column === 0 ? 'fighters__cell--attacker' : 'fighters__cell--defender',
              { 'fighters__cell--broken': fighter.guard <= 0, 'fighters__cell--left': fighter.leftAt },
            ]"
            :style="column === 0 ? styles.attacker : styles.defender"
          >
            <span class="fighters__who">
              <UserChip :user="fighter.player" size="sm" link tooltip />
              <span v-if="fighter.guard <= 0" class="fighters__tag fighters__tag--broken">broken</span>
              <span v-if="fighter.leftAt" class="fighters__tag">left</span>
              <span v-if="lentBy(fighter)" class="fighters__lent">lent by <ClanTag :clan="lentBy(fighter)!" size="xs" /></span>
            </span>
            <span class="fighters__guard">
              <ClanBar :value="fighter.guard" :max="WAR_GUARD_MAX" :mirror="column === 1" :broken="fighter.guard <= 0" />
              <span class="fighters__guard-value">{{ Math.round(fighter.guard) }}</span>
            </span>
            <span class="fighters__stats">
              <span>{{ Math.round(fighter.standingWeight * 100) }}% of strength</span>
              <span>{{ fighter.breaksSuffered }} {{ fighter.breaksSuffered === 1 ? 'break' : 'breaks' }} taken</span>
              <span>{{ Math.round(fighter.contribution) }} contribution</span>
            </span>
          </div>
          <div v-else class="fighters__cell fighters__cell--empty" aria-hidden="true" />
        </template>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.fighters {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.fighters__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.fighters__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
}

.fighters__legend,
.fighters__empty {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.fighters__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.fighters__grid {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fighters__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: var(--space-xl);
  border-bottom: 1px solid var(--bg-overlay);
}

.fighters__row:nth-child(even) {
  background: var(--bg-elevated);
}

.fighters__cell {
  --clan-bar-fill: var(--war-side);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  align-items: center;
  gap: var(--space-xs) var(--space-md);
  min-width: 0;
  padding: var(--space-sm) var(--space-md);
}

.fighters__cell--defender {
  grid-template-columns: 132px minmax(0, 1fr);
  text-align: right;
}

.fighters__cell--defender .fighters__who {
  grid-column: 2;
  grid-row: 1;
  justify-content: flex-end;
}

.fighters__cell--defender .fighters__guard {
  grid-column: 1;
  grid-row: 1;
  flex-direction: row-reverse;
}

.fighters__cell--defender .fighters__stats {
  grid-column: 1 / -1;
  justify-content: flex-end;
}

.fighters__cell--broken .fighters__who,
.fighters__cell--left {
  opacity: 0.55;
}

.fighters__who {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.fighters__tag {
  padding: 0 var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.fighters__tag--broken {
  color: var(--error);
  border-color: var(--error);
}

.fighters__lent {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.fighters__guard {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.fighters__guard-value {
  min-width: 3ch;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.fighters__cell--broken .fighters__guard-value {
  color: var(--error);
}

.fighters__stats {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

@media (max-width: 720px) {
  .fighters__row {
    column-gap: var(--space-sm);
  }

  .fighters__cell,
  .fighters__cell--defender {
    grid-template-columns: minmax(0, 1fr);
    padding: var(--space-sm);
  }

  .fighters__cell--defender .fighters__who,
  .fighters__cell--defender .fighters__guard {
    grid-column: 1;
    grid-row: auto;
  }

  .fighters__stats {
    display: none;
  }
}
</style>
