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
  <section v-if="rewards.length" class="ms-rewards" :class="{ 'ms-rewards--ceremonial': ceremonial }">
    <h4 class="ms-rewards__label">{{ rewards.length > 1 ? `${label}s` : label }}</h4>
    <ul class="ms-rewards__list">
      <li v-for="reward in rewards" :key="reward.item.id" class="ms-rewards__item">
        <RewardItemTile :item="reward.item" :size="ceremonial ? 64 : 44" />
        <span class="ms-rewards__text">
          <span class="ms-rewards__name">{{ reward.item.name }}</span>
          <span class="ms-rewards__meta">
            {{ reward.item.rarity }}<template v-if="reward.quantity > 1"> · ×{{ reward.quantity }}</template>
          </span>
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ms-rewards {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.ms-rewards__label {
  margin: 0;
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.ms-rewards__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0;
  padding: 0;
  list-style: none;
}

.ms-rewards__item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
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
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  text-transform: capitalize;
}

.ms-rewards--ceremonial .ms-rewards__item {
  padding: var(--space-md);
  background: var(--bg-elevated);
}

.ms-rewards--ceremonial .ms-rewards__name {
  font-size: var(--text-card-title);
}
</style>
