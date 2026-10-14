<script setup lang="ts">
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarResponse } from '@/types/api/clans'
import { formatStanding, WAR_TEAMS, warSideStyles } from '@/utils/clans'
import { computed } from 'vue'
import ClanBar from '../ClanBar.vue'
import WarClock from './WarClock.vue'

const props = defineProps<{
  war: ClanWarResponse
  now: number
}>()

const styles = computed(() => warSideStyles(props.war))
const teams = computed(() => WAR_TEAMS.map((team) => ({ team, data: props.war[team], style: styles.value[team] })))
</script>

<template>
  <RouterLink class="scorebug" :to="{ name: 'clan-war', params: { warId: war.id } }">
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
          <ClanTag :clan="entry.data.lead" size="sm" effects />
          <ClanName class="scorebug__name" :clan="entry.data.lead" />
          <span v-if="entry.data.sides.length > 1" class="scorebug__allies">
            +{{ entry.data.sides.length - 1 }} {{ entry.data.sides.length === 2 ? 'ally' : 'allies' }}
          </span>
        </span>
      </span>
      <ClanBar :value="entry.data.stakeRemaining" :max="entry.data.stake" :mirror="entry.team === 'defend'" />
      <span class="scorebug__stake">
        {{ formatStanding(entry.data.stakeRemaining) }}<span class="scorebug__total"> / {{ formatStanding(entry.data.stake) }}</span>
      </span>
    </span>

    <WarClock class="scorebug__middle" :war="war" :now="now" />
  </RouterLink>
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
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  transition: border-color 120ms ease-out;
}

.scorebug:hover {
  border-color: var(--text-tertiary);
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

.scorebug__name {
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

.scorebug__allies {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.scorebug__middle {
  grid-area: middle;
}

@media (max-width: 640px) {
  .scorebug {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'middle middle'
      'attack defend';
    gap: var(--space-md);
    padding: var(--space-md);
  }
}
</style>
