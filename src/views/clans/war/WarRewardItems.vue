<script setup lang="ts">
import RewardItemTile from '@/components/domain/RewardItemTile.vue'
import type { ClanWarRewardItemResponse } from '@/types/api/clans'
import { warRewardReach } from '@/utils/clans'

defineProps<{
  items: ClanWarRewardItemResponse[]
  reach?: boolean
}>()
</script>

<template>
  <ul class="reward-items">
    <li v-for="reward in items" :key="reward.id" class="reward-items__item">
      <RewardItemTile :item="reward.item" :size="reach ? 56 : 36" />
      <span v-if="reward.quantity > 1" class="reward-items__quantity">×{{ reward.quantity }}</span>
      <span v-if="reach" class="reward-items__reach">{{ warRewardReach(reward.topContributors) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.reward-items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  margin: 0;
  padding: 0;
  list-style: none;
}

.reward-items__item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.reward-items__quantity {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-primary);
}

.reward-items__reach {
  max-width: 14ch;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
