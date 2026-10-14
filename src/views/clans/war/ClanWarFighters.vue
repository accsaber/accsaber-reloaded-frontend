<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { ClanWarParticipantResponse, ClanWarResponse, ClanWarTeam } from '@/types/api/clans'
import { CLAN_WAR_TEAM_LABEL, WAR_GUARD_MAX, WAR_TEAMS, warSideStyles, warTeamOf } from '@/utils/clans'
import { computed } from 'vue'
import ClanBar from '../ClanBar.vue'

const props = defineProps<{
  war: ClanWarResponse
  participants: ClanWarParticipantResponse[] | null
  error: string | null
  viewerId: string | null
  picking: boolean
}>()

const emit = defineEmits<{
  pick: [userId: string | null]
}>()

const styles = computed(() => warSideStyles(props.war))
const viewer = computed(() => props.participants?.find((p) => p.player.id === props.viewerId && !p.leftAt) ?? null)
const viewerTeam = computed(() => (viewer.value ? warTeamOf(props.war, viewer.value.clan.id) : null))
const canPick = computed(() => !!viewer.value && props.war.ruleset === 'duel' && props.war.status !== 'ended')

function fightersOf(clanId: string): ClanWarParticipantResponse[] {
  return (props.participants ?? [])
    .filter((p) => p.clan.id === clanId)
    .sort((a, b) => b.standingWeight - a.standingWeight)
}

const teams = computed(() =>
  WAR_TEAMS.map((team) => ({
    team,
    style: styles.value[team],
    clans: props.war[team].sides
      .map((side) => ({ clan: side.clan, fighters: fightersOf(side.clan.id) }))
      .filter((group) => group.fighters.length),
  })),
)

function pickable(fighter: ClanWarParticipantResponse, team: ClanWarTeam): boolean {
  return canPick.value && team !== viewerTeam.value && fighter.inBand === true && !fighter.leftAt
}
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
      Nobody enrolled.
    </p>
    <div v-else class="fighters__sides">
      <div v-for="t in teams" :key="t.team" class="fighters__side clan-colors" :style="t.style">
        <div class="fighters__head">
          <span class="fighters__team">{{ CLAN_WAR_TEAM_LABEL[t.team] }}</span>
          <span class="fighters__col fighters__col--num">Skill</span>
          <span class="fighters__col">Guard</span>
          <span class="fighters__col fighters__col--num">Damage</span>
        </div>
        <template v-for="group in t.clans" :key="group.clan.id">
          <div class="fighters__clan"><ClanTag :clan="group.clan" size="sm" /></div>
          <ul class="fighters__list">
            <li
              v-for="fighter in group.fighters"
              :key="fighter.player.id"
              class="fighters__row"
              :class="{ 'fighters__row--broken': fighter.guard <= 0, 'fighters__row--out': fighter.leftAt }"
            >
              <span class="fighters__who">
                <UserChip :user="fighter.player" size="sm" link tooltip :hide-clan="fighter.player.clan?.id === group.clan.id" />
                <span v-if="fighter.leftAt" class="fighters__left">left</span>
                <span v-if="fighter.target" class="fighters__target">
                  <span aria-hidden="true">→</span>
                  <UserChip :user="fighter.target" size="xs" compact hide-clan />
                </span>
                <span v-if="viewer?.target?.id === fighter.player.id" class="fighters__pick">
                  <span class="fighters__picked">Your pick</span>
                  <BaseButton size="sm" :disabled="picking" @click="emit('pick', null)">Clear</BaseButton>
                </span>
                <BaseButton
                  v-else-if="pickable(fighter, t.team)"
                  class="fighters__pick"
                  size="sm"
                  :disabled="picking"
                  @click="emit('pick', fighter.player.id)"
                >
                  Pick
                </BaseButton>
              </span>
              <span class="fighters__num">{{ fighter.skill.toFixed(1) }}</span>
              <span class="fighters__guard">
                <ClanBar :value="fighter.guard" :max="WAR_GUARD_MAX" :broken="fighter.guard <= 0" />
                <span class="fighters__guard-value">{{ Math.round(fighter.guard) }}</span>
              </span>
              <span class="fighters__num">{{ Math.round(fighter.contribution) }}</span>
            </li>
          </ul>
        </template>
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
  grid-template-columns: minmax(0, 1fr) 6ch 96px 56px;
  align-items: center;
  gap: var(--space-md);
  padding: 0 var(--space-md);
}

.fighters__head {
  height: 40px;
  border-bottom: 1px solid var(--bg-overlay);
}

.fighters__team {
  font-size: var(--text-caption);
  font-weight: 700;
  color: var(--war-side);
}

.fighters__clan {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.fighters__target {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.fighters__pick {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  margin-left: auto;
}

.fighters__picked {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--war-side);
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
