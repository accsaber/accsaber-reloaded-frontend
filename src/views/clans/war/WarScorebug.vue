<script setup lang="ts">
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarResponse, ClanWarTeam } from '@/types/api/clans'
import { formatStanding, WAR_TEAMS, warSideStyles } from '@/utils/clans'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ClanBar from '../ClanBar.vue'
import ClanWarSideRow from './ClanWarSideRow.vue'
import WarClock from './WarClock.vue'

const props = defineProps<{
  war: ClanWarResponse
  now: number
  hud?: boolean
  viewerTeam?: ClanWarTeam | null
}>()

const styles = computed(() => warSideStyles(props.war))
const teams = computed(() => WAR_TEAMS.map((team) => ({ team, data: props.war[team], style: styles.value[team] })))

const lead = computed(() => {
  if (props.war.status !== 'active') return null
  const left = (team: ClanWarTeam) => (props.war[team].stake > 0 ? props.war[team].stakeRemaining / props.war[team].stake : 1)
  const gap = left('attack') - left('defend')
  const leader = props.war[gap > 0 ? 'attack' : 'defend']
  const margin = Math.round(Math.abs(gap) * leader.stake)
  return margin > 0 ? `${leader.lead.name} Ahead by ${formatStanding(margin)}` : null
})
</script>

<template>
  <component
    :is="hud ? 'header' : RouterLink"
    class="scorebug"
    :class="hud ? 'scorebug--hud' : 'scorebug--card pressable'"
    :to="hud ? undefined : { name: 'clan-war', params: { warId: war.id } }"
  >
    <span
      v-for="entry in teams"
      :key="entry.team"
      class="scorebug__side clan-colors"
      :class="`scorebug__side--${entry.team}`"
      :style="entry.style"
    >
      <span class="scorebug__identity">
        <ClanIcon :clan="entry.data.lead" :size="40" />
        <span class="scorebug__titles">
          <span class="scorebug__tagline">
            <ClanTag :clan="entry.data.lead" size="sm" effects />
            <span v-if="!hud && entry.data.sides.length > 1" class="caption">
              +{{ entry.data.sides.length - 1 }} {{ entry.data.sides.length === 2 ? 'ally' : 'allies' }}
            </span>
          </span>
          <ClanName class="scorebug__name" :clan="entry.data.lead" />
        </span>
      </span>
      <ClanBar :value="entry.data.stakeRemaining" :max="entry.data.stake" :mirror="entry.team === 'defend'" />
      <span class="scorebug__stake">
        {{ formatStanding(entry.data.stakeRemaining) }}<span class="scorebug__total"> / {{ formatStanding(entry.data.stake) }}{{ hud ? ' Standing left' : '' }}</span>
      </span>
      <ul v-if="hud && entry.data.sides.length > 1" class="scorebug__sides">
        <ClanWarSideRow v-for="side in entry.data.sides" :key="side.clan.id" :side="side" />
      </ul>
      <slot name="team" :team="entry.team" />
    </span>

    <span class="scorebug__middle">
      <strong v-if="hud && lead" class="scorebug__lead">{{ lead }}</strong>
      <WarClock :war="war" :now="now" :viewer-team="viewerTeam" :large="hud && !lead" />
      <slot name="middle" />
    </span>
  </component>
</template>

<style scoped>
.scorebug {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 168px minmax(0, 1fr);
  grid-template-areas: 'attack middle defend';
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  color: var(--text-primary);
  text-decoration: none;
  background: var(--bg-surface);
  border-radius: var(--radius-card);
}

.scorebug--card {
  min-height: var(--scorebug-h);
  transition:
    background-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.scorebug--card:hover {
  background: var(--bg-elevated);
}

.scorebug:focus-visible {
  outline: 2px solid var(--page-accent, var(--accent));
  outline-offset: 2px;
}

.scorebug__side {
  --clan-bar-fill: var(--war-side);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.scorebug__side--attack {
  grid-area: attack;
}

.scorebug__side--defend {
  grid-area: defend;
  align-items: flex-end;
  text-align: right;
}

.scorebug__identity {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.scorebug__side--defend .scorebug__identity {
  flex-direction: row-reverse;
}

.scorebug__titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.scorebug__side--defend .scorebug__titles {
  align-items: flex-end;
}

.scorebug__tagline {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.scorebug__side--defend .scorebug__tagline {
  flex-direction: row-reverse;
}

.scorebug__name {
  max-width: 100%;
  font-size: var(--text-body);
  font-weight: 600;
}

.scorebug__stake {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
}

.scorebug__total {
  font-weight: 400;
  color: var(--text-tertiary);
}

.scorebug__middle {
  grid-area: middle;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.scorebug__lead {
  font-size: var(--text-section-heading);
  font-weight: 700;
  text-align: center;
  text-wrap: balance;
}

.scorebug--hud {
  grid-template-columns: minmax(0, 1fr) 240px minmax(0, 1fr);
  align-items: start;
}

.scorebug__sides {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-self: stretch;
  margin: var(--space-sm) 0 0;
  padding: 0;
  text-align: left;
  list-style: none;
}

.scorebug--hud .scorebug__stake {
  font-size: 2rem;
  line-height: 1;
  color: var(--war-side);
}

.scorebug--hud .scorebug__total {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.scorebug--hud .scorebug__name {
  font-size: 1.25rem;
  font-weight: 700;
}

@media (max-width: 767px) {
  .scorebug {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'middle middle'
      'attack defend';
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .scorebug--card .scorebug__identity {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-self: stretch;
  }

  .scorebug--card .scorebug__titles {
    display: contents;
  }

  .scorebug--card .scorebug__name {
    grid-column: 1 / -1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .scorebug--card .scorebug__side--defend .scorebug__identity {
    grid-template-columns: minmax(0, 1fr) auto;
    justify-items: end;
  }

  .scorebug--card .scorebug__side--defend .clan-icon {
    grid-area: 1 / 2;
  }

  .scorebug--card .scorebug__side--defend .scorebug__tagline {
    grid-area: 1 / 1;
  }

  .scorebug--hud {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'middle'
      'attack'
      'defend';
    gap: var(--space-lg);
  }
}
</style>
