<script setup lang="ts">
import ClanName from '@/components/domain/ClanName.vue'
import ClanTag from '@/components/domain/ClanTag.vue'
import type { ClanWarSideResponse } from '@/types/api/clans'
import { formatStanding } from '@/utils/clans'
import { computed } from 'vue'
import ClanBar from '../ClanBar.vue'

const props = defineProps<{
  side: ClanWarSideResponse
}>()

const badge = computed(() => (props.side.leftAt ? 'Left' : props.side.fallen ? 'Fallen' : null))
</script>

<template>
  <li class="side-row" :class="{ 'side-row--out': badge }">
    <RouterLink class="side-row__clan" :to="{ name: 'clan-detail', params: { slugOrId: side.clan.slug } }">
      <ClanTag :clan="side.clan" size="sm" />
      <ClanName class="side-row__name" :clan="side.clan" />
    </RouterLink>
    <span v-if="badge" class="side-row__badge" :class="{ 'side-row__badge--fallen': !side.leftAt }">{{ badge }}</span>
    <span v-else class="side-row__stake">
      {{ formatStanding(side.stakeRemaining) }}<span class="side-row__total"> / {{ formatStanding(side.stake) }}</span>
    </span>
    <ClanBar class="side-row__bar" :value="side.stakeRemaining" :max="side.stake" :broken="side.fallen" />
  </li>
</template>

<style scoped>
.side-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-xs) var(--space-md);
  text-align: left;
}

.side-row--out {
  opacity: 0.5;
}

.side-row__clan {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  color: var(--text-primary);
  text-decoration: none;
}

.side-row__name {
  min-width: 0;
  overflow: hidden;
  font-size: var(--text-body);
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.side-row__stake {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--war-side);
}

.side-row__total {
  color: var(--text-tertiary);
}

.side-row__bar {
  grid-column: 1 / -1;
}

.side-row__badge {
  font-size: var(--text-caption);
  font-weight: 700;
  color: var(--text-secondary);
}

.side-row__badge--fallen {
  color: var(--error);
}
</style>
