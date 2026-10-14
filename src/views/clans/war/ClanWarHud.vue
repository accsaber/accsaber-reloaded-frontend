<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ClanIcon from '@/components/domain/ClanIcon.vue'
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarResponse } from '@/types/api/clans'
import {
  CLAN_WAR_STATUS_LABEL,
  CLAN_WAR_TEAM_LABEL,
  formatStanding,
  WAR_TEAMS,
  warLeadFallen,
  warSideStyles,
} from '@/utils/clans'
import { computed } from 'vue'
import ClanBar from '../ClanBar.vue'
import ClanWarSideRow from './ClanWarSideRow.vue'
import WarClock from './WarClock.vue'

const props = defineProps<{
  war: ClanWarResponse
  now: number
  canRetreat: boolean
}>()

const emit = defineEmits<{
  retreat: []
}>()

const styles = computed(() => warSideStyles(props.war))
const teams = computed(() =>
  WAR_TEAMS.map((team) => ({ team, label: CLAN_WAR_TEAM_LABEL[team], data: props.war[team], style: styles.value[team] })),
)
</script>

<template>
  <header class="hud">
    <section
      v-for="entry in teams"
      :key="entry.team"
      class="hud__side clan-colors"
      :class="`hud__side--${entry.team}`"
      :style="entry.style"
    >
      <ClanBar
        class="hud__bar"
        size="lg"
        :value="entry.data.stakeRemaining"
        :max="entry.data.stake"
        :mirror="entry.team === 'defend'"
      />
      <div class="hud__score">
        <span class="hud__remaining">{{ formatStanding(entry.data.stakeRemaining) }}</span>
        <span class="hud__total">/ {{ formatStanding(entry.data.stake) }}</span>
      </div>
      <RouterLink class="hud__identity" :to="{ name: 'clan-detail', params: { slugOrId: entry.data.lead.slug } }">
        <ClanIcon :clan="entry.data.lead" :size="64" />
        <span class="hud__titles">
          <span class="hud__role">{{ entry.label }}</span>
          <ClanTag :clan="entry.data.lead" effects class="hud__tag" />
          <ClanName class="hud__name" :clan="entry.data.lead" />
        </span>
      </RouterLink>
      <BaseBanner
        v-if="war.status !== 'ended' && warLeadFallen(entry.data)"
        class="hud__fallen"
        variant="warning"
        :dismissible="false"
      >
        {{ entry.data.lead.name }} has fallen.
      </BaseBanner>
      <ul v-if="entry.data.sides.length > 1" class="hud__sides">
        <ClanWarSideRow v-for="side in entry.data.sides" :key="side.clan.id" :side="side" :now="now" />
      </ul>
    </section>

    <div class="hud__middle" :class="`hud__middle--${war.status}`">
      <span class="hud__status">{{ CLAN_WAR_STATUS_LABEL[war.status] }}</span>
      <WarClock :war="war" :now="now" large />
      <BaseButton v-if="canRetreat" class="hud__retreat" variant="destructive" size="sm" @click="emit('retreat')">
        Retreat
      </BaseButton>
    </div>
  </header>
</template>

<style scoped>
.hud {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 176px minmax(0, 1fr);
  grid-template-areas: 'attack middle defend';
  column-gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.hud__side {
  --clan-bar-fill: var(--war-side);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.hud__side--attack {
  grid-area: attack;
}

.hud__side--defend {
  grid-area: defend;
  align-items: flex-end;
  text-align: right;
}

.hud__bar {
  align-self: stretch;
}

.hud__score {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  font-family: var(--font-mono);
}

.hud__remaining {
  font-size: calc(var(--text-page-title) * 1.25);
  font-weight: 600;
  line-height: 1;
  color: var(--war-side);
}

.hud__total {
  font-size: var(--text-body);
  color: var(--text-tertiary);
}

.hud__identity {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
  color: var(--text-primary);
  text-decoration: none;
}

.hud__side--defend .hud__identity {
  flex-direction: row-reverse;
}

.hud__titles {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  min-width: 0;
}

.hud__side--defend .hud__titles {
  align-items: flex-end;
}

.hud__role {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.hud__tag {
  font-size: var(--text-card-title);
}

.hud__name {
  max-width: 100%;
  font-size: var(--text-section-heading);
  font-weight: 700;
}

.hud__fallen {
  align-self: stretch;
  text-align: left;
}

.hud__sides {
  align-self: stretch;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hud__middle {
  grid-area: middle;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  text-align: center;
}

.hud__status {
  padding: 2px var(--space-sm);
  font-size: var(--text-caption);
  font-weight: 700;
  color: var(--text-secondary);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
}

.hud__middle--active .hud__status {
  color: var(--success);
  border-color: var(--success);
}

.hud__middle--picking .hud__status,
.hud__middle--preparing .hud__status {
  color: var(--warning);
  border-color: var(--warning);
}

.hud__retreat {
  margin-top: var(--space-sm);
}

@media (max-width: 720px) {
  .hud {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'middle middle'
      'attack defend';
    row-gap: var(--space-lg);
    padding: var(--space-md);
  }

  .hud__identity {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  .hud__side--defend .hud__identity {
    flex-direction: column;
    align-items: flex-end;
  }

  .hud__remaining {
    font-size: var(--text-page-title);
  }
}
</style>
