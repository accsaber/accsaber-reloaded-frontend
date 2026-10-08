<script setup lang="ts">
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarResponse } from '@/types/api/clans'
import { formatStanding, warClock, warHeadline, warModeLine, warSideStyles } from '@/utils/clans'
import { computed } from 'vue'
import ClanBar from '../ClanBar.vue'

const props = defineProps<{
  war: ClanWarResponse
  now: number
}>()

const styles = computed(() => warSideStyles(props.war))
const clock = computed(() => warClock(props.war, props.now))
const headline = computed(() => warHeadline(props.war))
const sides = computed(() => [
  { role: 'attacker' as const, side: props.war.attacker, style: styles.value.attacker },
  { role: 'defender' as const, side: props.war.defender, style: styles.value.defender },
])
</script>

<template>
  <RouterLink class="scorebug" :to="{ name: 'clan-war', params: { warId: war.id } }">
    <span
      v-for="entry in sides"
      :key="entry.role"
      class="scorebug__side clan-colors"
      :class="`scorebug__side--${entry.role}`"
      :style="entry.style"
    >
      <span class="scorebug__identity">
        <ClanIcon :clan="entry.side.clan" :size="40" />
        <span class="scorebug__titles">
          <ClanTag :clan="entry.side.clan" size="sm" effects />
          <ClanName class="scorebug__name" :clan="entry.side.clan" />
        </span>
      </span>
      <ClanBar :value="entry.side.stakeRemaining" :max="entry.side.stake" :mirror="entry.role === 'defender'" />
      <span class="scorebug__stake">
        {{ formatStanding(entry.side.stakeRemaining) }}<span class="scorebug__total"> / {{ formatStanding(entry.side.stake) }}</span>
      </span>
    </span>

    <span class="scorebug__middle">
      <template v-if="headline">
        <span class="scorebug__headline">{{ headline }}</span>
        <span class="scorebug__label">{{ clock.value }}</span>
      </template>
      <template v-else>
        <span class="scorebug__label">{{ clock.label }}</span>
        <span v-if="clock.value" class="scorebug__clock">{{ clock.value }}</span>
      </template>
      <span class="scorebug__mode">{{ warModeLine(war) }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.scorebug {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 168px minmax(0, 1fr);
  grid-template-areas: 'attacker middle defender';
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

.scorebug__side--attacker {
  grid-area: attacker;
}

.scorebug__side--defender {
  grid-area: defender;
  align-items: flex-end;
  text-align: right;
}

.scorebug__identity {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.scorebug__side--defender .scorebug__identity {
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

.scorebug__side--defender .scorebug__titles {
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

.scorebug__middle {
  grid-area: middle;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
}

.scorebug__headline {
  font-size: var(--text-card-title);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.scorebug__label,
.scorebug__mode {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.scorebug__clock {
  font-family: var(--font-mono);
  font-size: var(--text-card-title);
  font-weight: 600;
}

@media (max-width: 640px) {
  .scorebug {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'middle middle'
      'attacker defender';
    gap: var(--space-md);
    padding: var(--space-md);
  }
}
</style>
