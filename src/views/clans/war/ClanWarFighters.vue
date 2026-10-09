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

function duelColumns(left: ClanWarParticipantResponse[], right: ClanWarParticipantResponse[]): [Fighter[], Fighter[]] {
  const unpaired = new Set(right)
  const targets = left.map((p) => {
    const target = right.find((r) => r.player.id === p.duelTarget?.id) ?? null
    if (target) unpaired.delete(target)
    return target
  })
  return [[...left, ...[...unpaired].map(() => null)], [...targets, ...unpaired]]
}

const columns = computed<[Fighter[], Fighter[]]>(() => {
  const left = side(props.war.attacker.clan.id)
  const right = side(props.war.defender.clan.id)
  return props.war.ruleset === 'duel' ? duelColumns(left, right) : [left, right]
})

const sides = computed(() => [
  { clan: props.war.attacker.clan, style: styles.value.attacker, fighters: columns.value[0] },
  { clan: props.war.defender.clan, style: styles.value.defender, fighters: columns.value[1] },
])
</script>

<template>
  <section class="fighters">
    <h2 class="fighters__title">Fighters</h2>
    <p v-if="error" class="fighters__error" role="alert">{{ error }}</p>

    <div v-if="!participants" class="fighters__sides">
      <div v-for="i in 2" :key="i" class="fighters__side">
        <SkeletonLoader v-for="j in 6" :key="j" variant="table-row" />
      </div>
    </div>
    <p v-else-if="!participants.length" class="fighters__empty">
      {{ war.status === 'active' || war.status === 'ended' ? 'Nobody enrolled.' : 'Fighters enrol when the war starts.' }}
    </p>
    <div v-else class="fighters__sides">
      <div v-for="s in sides" :key="s.clan.id" class="fighters__side clan-colors" :style="s.style">
        <div class="fighters__head">
          <ClanTag class="fighters__clan" :clan="s.clan" size="sm" />
          <span class="fighters__col">Guard</span>
          <span class="fighters__col fighters__col--num">Damage</span>
        </div>
        <ul class="fighters__list">
          <li
            v-for="(fighter, i) in s.fighters"
            :key="fighter?.player.id ?? `empty-${i}`"
            class="fighters__row"
            :class="{ 'fighters__row--broken': fighter && fighter.guard <= 0, 'fighters__row--out': fighter?.leftAt }"
          >
            <template v-if="fighter">
              <span class="fighters__who">
                <UserChip :user="fighter.player" size="sm" link tooltip :hide-clan="fighter.player.clan?.id === s.clan.id" />
                <span v-if="fighter.leftAt" class="fighters__left">left</span>
              </span>
              <span class="fighters__guard">
                <ClanBar :value="fighter.guard" :max="WAR_GUARD_MAX" :broken="fighter.guard <= 0" />
                <span class="fighters__guard-value">{{ Math.round(fighter.guard) }}</span>
              </span>
              <span class="fighters__num">{{ Math.round(fighter.contribution) }}</span>
            </template>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fighters {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.fighters__title {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 700;
}

.fighters__empty,
.fighters__error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.fighters__error {
  color: var(--error);
}

.fighters__sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-lg);
  align-items: start;
}

.fighters__side {
  --clan-bar-fill: var(--war-side);
  min-width: 0;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.fighters__head,
.fighters__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px 56px;
  align-items: center;
  gap: var(--space-md);
  padding: 0 var(--space-md);
}

.fighters__head {
  height: 40px;
  border-bottom: 1px solid var(--bg-overlay);
}

.fighters__clan {
  justify-self: start;
}

.fighters__col {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.fighters__col--num,
.fighters__num {
  text-align: right;
}

.fighters__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.fighters__row {
  height: 44px;
}

.fighters__row:nth-child(even) {
  background: var(--bg-elevated);
}

.fighters__row--broken .fighters__who,
.fighters__row--out .fighters__who {
  opacity: 0.5;
}

.fighters__who {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.fighters__left {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.fighters__guard {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.fighters__guard-value,
.fighters__num {
  min-width: 3ch;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.fighters__row--broken .fighters__guard-value {
  color: var(--error);
}

@media (max-width: 860px) {
  .fighters__sides {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
