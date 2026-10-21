<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type {
  ClanWarParticipantResponse,
  ClanWarPoolEntryResponse,
  ClanWarResponse,
  ClanWarStrikeRulesResponse,
  ClanWarTeam,
} from '@/types/api/clans'
import { isWarRosterOpen, WAR_TEAMS, warSideStyles, warTeamOf } from '@/utils/clans'
import { computed } from 'vue'
import FighterStrike from './FighterStrike.vue'
import WarGuard from './WarGuard.vue'
import WarSection from './WarSection.vue'
import SnipeIcon from '@/components/domain/SnipeIcon.vue'

const props = defineProps<{
  war: ClanWarResponse
  rules: ClanWarStrikeRulesResponse
  participants: ClanWarParticipantResponse[] | null
  error: string | null
  viewer: ClanWarParticipantResponse | null
  picking: boolean
  pool: ClanWarPoolEntryResponse[]
  loadedMapId: string
}>()

const mapId = defineModel<string>('mapId', { required: true })

const emit = defineEmits<{
  pick: [userId: string | null]
}>()

const styles = computed(() => warSideStyles(props.war))
const viewerTeam = computed(() => (props.viewer ? warTeamOf(props.war, props.viewer.clan.id) : null))
const canPick = computed(() => !!props.viewer && props.war.ruleset === 'duel' && isWarRosterOpen(props.war))

function fightersOf(clanId: string): ClanWarParticipantResponse[] {
  return (props.participants ?? []).filter((p) => p.clan.id === clanId)
}

const teams = computed(() =>
  WAR_TEAMS.map((team) => {
    const clans = props.war[team].sides
      .map((side) => ({ clan: side.clan, fighters: fightersOf(side.clan.id) }))
      .filter((group) => group.fighters.length)
    const strikes = clans.some((group) => group.fighters.some((f) => f.strikePreview))
    return { team, style: styles.value[team], clans, strikes }
  }),
)

const stacked = computed(() => canPick.value || teams.value.some((t) => t.strikes))

function pickable(fighter: ClanWarParticipantResponse, team: ClanWarTeam): boolean {
  return canPick.value && team !== viewerTeam.value && fighter.inBand === true && !fighter.leftAt
}
</script>

<template>
  <div class="fighters">
    <p v-if="error" class="fighters__error" role="alert">{{ error }}</p>

    <div v-if="!participants" class="fighters__sides">
      <div v-for="i in 2" :key="i" class="fighters__side">
        <SkeletonLoader v-for="j in 6" :key="j" variant="table-row" />
      </div>
    </div>
    <p v-else-if="!participants.length" class="fighters__empty">
      Nobody enrolled.
    </p>
    <div v-else class="fighters__sides" :class="{ 'fighters__sides--stacked': stacked }">
      <WarSection
        v-for="t in teams"
        :key="t.team"
        class="fighters__side clan-colors"
        :class="{ 'fighters__side--strikes': t.strikes }"
        :style="t.style"
      >
        <template #title>
          <h3 class="fighters__team">{{ t.team === 'attack' ? 'Attack' : 'Defense' }}</h3>
        </template>
        <template v-for="group in t.clans" :key="group.clan.id">
          <div class="fighters__head">
            <span class="fighters__clan"><ClanTag :clan="group.clan" size="sm" /></span>
            <span class="fighters__col fighters__col--num">Skill</span>
            <span class="fighters__col">Guard</span>
            <span class="fighters__col fighters__col--num">Damage</span>
            <span v-if="t.strikes" class="fighters__col fighters__col--num">Your hit</span>
          </div>
          <ul class="fighters__list">
            <li
              v-for="fighter in group.fighters"
              :key="fighter.player.id"
              class="fighters__row"
              :class="{
                'fighters__row--broken': fighter.guard <= 0,
                'fighters__row--out': fighter.leftAt,
                'fighters__row--self': fighter.player.id === viewer?.player.id,
              }"
            >
              <span class="fighters__who">
                <UserChip :user="fighter.player" size="sm" link tooltip hide-clan />
                <span v-if="fighter.leftAt" class="fighters__left">left</span>
                <span v-if="fighter.target" class="fighters__target" title="Target">
                  <SnipeIcon :size="12" />
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
                  Pick target
                </BaseButton>
              </span>
              <span class="fighters__num">{{ fighter.skill.toFixed(1) }}</span>
              <WarGuard :fighter="fighter" :rules="rules" />
              <span class="fighters__num">{{ Math.round(fighter.contribution) }}</span>
              <span v-if="t.strikes">
                <FighterStrike
                  v-if="fighter.strikePreview"
                  v-model:map-id="mapId"
                  :rules="rules"
                  :preview="fighter.strikePreview"
                  :guard="fighter.guard"
                  :pool="pool"
                  :loaded-map-id="loadedMapId"
                />
              </span>
              <span v-if="fighter.player.id === viewer?.player.id && fighter.guard <= 0" class="fighters__self-broken">
                You're broken. Your next full play on a war map brings you back and hits.
              </span>
            </li>
          </ul>
        </template>
      </WarSection>
    </div>
  </div>
</template>

<style scoped>
.fighters {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
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

.fighters__sides .fighters__side {
  --clan-bar-fill: var(--war-side);
  min-width: 0;
  padding: 0;
  overflow: hidden;
}

.fighters__head,
.fighters__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 6ch 132px 56px;
  align-items: center;
  gap: var(--space-md);
  padding: 0 var(--space-md);
}

.fighters__side--strikes .fighters__head,
.fighters__side--strikes .fighters__row {
  grid-template-columns: minmax(0, 1fr) 6ch 132px 56px 92px;
}

.fighters__head {
  height: 40px;
  border-bottom: 1px solid var(--bg-overlay);
}

.fighters__side :deep(.war-section__head) {
  padding: 0 var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.fighters__side :deep(.war-section__body) {
  gap: 0;
  margin-top: 0;
}

.fighters__team {
  flex: 1;
  margin: 0;
  padding: var(--space-md) 0;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-align: center;
  text-transform: uppercase;
  color: var(--war-side);
}

.fighters__clan {
  display: flex;
  min-width: 0;
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
  min-height: 44px;
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


.fighters__num {
  min-width: 3ch;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.fighters__row--self,
.fighters__row--self:nth-child(even) {
  background: color-mix(in srgb, var(--war-side) 10%, var(--bg-surface));
}

.fighters__self-broken {
  grid-column: 1 / -1;
  padding-bottom: var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--error);
}

.fighters__sides--stacked {
  grid-template-columns: minmax(0, 1fr);
}

@media (max-width: 860px) {
  .fighters__sides {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
