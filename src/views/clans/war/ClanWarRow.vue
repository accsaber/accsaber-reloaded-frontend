<script setup lang="ts">
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarResponse } from '@/types/api/clans'
import { CLAN_ARENA_LABEL, CLAN_RULESET_LABEL, formatStanding, warClock, warResultFor } from '@/utils/clans'
import { formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'
import WarBar from './WarBar.vue'

const props = defineProps<{
  war: ClanWarResponse
  now: number
  clanId?: string
}>()

const clock = computed(() => warClock(props.war, props.now))
const state = computed(() =>
  props.clanId && props.war.outcome ? warResultFor(props.war, props.clanId) : clock.value.label,
)
const when = computed(() => formatRelativeDate(props.war.endedAt ?? props.war.declaredAt, props.now))
const sides = computed(() => [
  { role: 'attacker' as const, side: props.war.attacker },
  { role: 'defender' as const, side: props.war.defender },
])
</script>

<template>
  <RouterLink
    class="war-card"
    :class="[`war-card--${war.status}`]"
    :to="{ name: 'clan-war', params: { warId: war.id } }"
  >
    <span v-for="entry in sides" :key="entry.role" class="war-card__side" :class="`war-card__side--${entry.role}`">
      <ClanIcon :clan="entry.side.clan" :size="72" class="war-card__icon" />
      <span class="war-card__titles">
        <ClanTag :clan="entry.side.clan" effects class="war-card__tag" />
        <ClanName class="war-card__name" :clan="entry.side.clan" />
        <span class="war-card__stake">
          <span class="war-card__remaining">{{ formatStanding(entry.side.stakeRemaining) }}</span>
          <span class="war-card__total">/ {{ formatStanding(entry.side.stake) }}</span>
        </span>
        <WarBar :value="entry.side.stakeRemaining" :max="entry.side.stake" :tone="entry.role" size="lg" />
      </span>
    </span>

    <span class="war-card__middle">
      <span class="war-card__vs" aria-hidden="true">VS</span>
      <span class="war-card__state">{{ state }}</span>
      <span v-if="war.status !== 'ended' && clock.value" class="war-card__clock">{{ clock.value }}</span>
      <span v-if="war.status !== 'ended'" class="war-card__clock-label">{{ clock.label }}</span>
      <span class="war-card__mode">{{ CLAN_ARENA_LABEL[war.arena] }} · {{ CLAN_RULESET_LABEL[war.ruleset] }}</span>
      <span class="war-card__when">{{ war.status === 'ended' ? 'ended' : 'declared' }} {{ when }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.war-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px minmax(0, 1fr);
  grid-template-areas: 'attacker middle defender';
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-lg) var(--space-xl);
  color: var(--text-primary);
  text-decoration: none;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--error) 9%, var(--bg-surface)) 0%,
    var(--bg-surface) 38%,
    var(--bg-surface) 62%,
    color-mix(in srgb, var(--info) 9%, var(--bg-surface)) 100%
  );
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  transition: border-color 120ms ease, transform 120ms ease;
}

.war-card:hover {
  border-color: var(--text-tertiary);
  transform: scale(1.005);
}

.war-card--ended {
  background: var(--bg-surface);
}

.war-card--ended .war-card__name,
.war-card--ended .war-card__remaining {
  color: var(--text-secondary);
}

.war-card__side {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.war-card__side--attacker {
  grid-area: attacker;
}

.war-card__side--defender {
  grid-area: defender;
  flex-direction: row-reverse;
  text-align: right;
}

.war-card__side--defender .war-card__titles {
  align-items: flex-end;
}

.war-card__icon {
  flex-shrink: 0;
}

.war-card__titles {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  min-width: 0;
}

.war-card__tag {
  font-size: var(--text-card-title);
}

.war-card__name {
  max-width: 100%;
  font-size: var(--text-stat-lg);
  font-weight: 700;
  line-height: 1.15;
}

.war-card__stake {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  font-family: var(--font-mono);
}

.war-card__side--defender .war-card__stake {
  justify-content: flex-end;
}

.war-card__remaining {
  font-size: var(--text-section-heading);
  font-weight: 600;
  line-height: 1;
}

.war-card__total {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-card__middle {
  grid-area: middle;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
}

.war-card__vs {
  font-family: var(--font-mono);
  font-size: var(--text-page-title);
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1;
  color: var(--text-tertiary);
}

.war-card__state {
  margin-top: var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--page-accent, var(--accent));
}

.war-card--active .war-card__state {
  color: var(--success);
}

.war-card--ended .war-card__state {
  color: var(--text-secondary);
}

.war-card__clock {
  font-family: var(--font-mono);
  font-size: var(--text-section-heading);
  font-weight: 600;
  line-height: 1.1;
  color: var(--text-primary);
}

.war-card__clock-label,
.war-card__mode,
.war-card__when {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.war-card__mode {
  margin-top: var(--space-xs);
}

.war-card__when {
  color: var(--text-tertiary);
}

@media (max-width: 720px) {
  .war-card {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'middle'
      'attacker'
      'defender';
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--bg-surface);
  }

  .war-card__side--defender {
    flex-direction: row;
    text-align: left;
  }

  .war-card__side--defender .war-card__titles {
    align-items: flex-start;
  }

  .war-card__side--defender .war-card__stake {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .war-card {
    transition: none;
  }

  .war-card:hover {
    transform: none;
  }
}
</style>
