<script setup lang="ts">
import RewardItemTile from '@/components/domain/RewardItemTile.vue'
import type { ItemResponse } from '@/types/api/items'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    xpReward?: number | null
    clanXpReward?: number | null
    standingReward?: number | null
    perContributor?: boolean
    itemReward?: ItemResponse | null
    size?: number
  }>(),
  { xpReward: null, clanXpReward: null, standingReward: null, itemReward: null, size: 32 },
)

function plus(value: number | null, unit: string): string | null {
  return value != null && value > 0 ? `+${Math.round(value).toLocaleString()} ${unit}` : null
}

const lines = computed(() =>
  [
    plus(props.clanXpReward, 'clan XP'),
    plus(props.standingReward, 'Standing'),
    plus(props.xpReward, props.perContributor ? 'XP per contributor' : 'XP'),
  ].filter((line): line is string => line !== null),
)
</script>

<template>
  <div v-if="lines.length || itemReward" class="mission-rewards">
    <span v-if="lines.length" class="mission-rewards__xp">{{ lines.join(' · ') }}</span>
    <RewardItemTile v-if="itemReward" :item="itemReward" :size="size" />
  </div>
</template>

<style scoped>
.mission-rewards {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.mission-rewards__xp {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--mission-reward-accent, var(--page-accent, var(--accent)));
  white-space: nowrap;
}
</style>
