<script setup lang="ts">
import RewardItemTile from '@/components/domain/RewardItemTile.vue'
import type { MilestoneRewardResponse } from '@/types/api/milestones'

withDefaults(
  defineProps<{
    rewards: MilestoneRewardResponse[]
    label?: string
    ceremonial?: boolean
  }>(),
  { label: 'Reward', ceremonial: false },
)
</script>

<template>
  <section v-if="rewards.length" class="ms-rewards">
    <h3 class="field-label">{{ rewards.length > 1 ? `${label}s` : label }}</h3>
    <ul class="ms-rewards__list">
      <li v-for="reward in rewards" :key="reward.item.id" class="ms-rewards__item">
        <RewardItemTile :item="reward.item" :size="ceremonial ? 64 : 44" />
        <span class="ms-rewards__text">
          <span class="ms-rewards__name">{{ reward.item.name }}</span>
          <span class="caption ms-rewards__meta">
            {{ reward.item.rarity }}<template v-if="reward.quantity > 1"> · x{{ reward.quantity }}</template>
          </span>
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ms-rewards,
.ms-rewards__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.ms-rewards__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ms-rewards__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
}

.ms-rewards__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ms-rewards__name {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.ms-rewards__meta {
  text-transform: capitalize;
}
</style>
