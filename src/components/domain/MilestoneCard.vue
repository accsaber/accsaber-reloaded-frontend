<script setup lang="ts">
import { useCategoryStore } from '@/stores/categories';
import type { MilestoneDisplay } from '@/types/display';
import { computed } from 'vue';

const props = defineProps<{
  milestone: MilestoneDisplay
}>()

const categoryStore = useCategoryStore()

const tierColorMap: Record<string, string> = {
  BRONZE: 'var(--tier-bronze)',
  SILVER: 'var(--tier-silver)',
  GOLD: 'var(--tier-gold)',
  PLATINUM: 'var(--tier-platinum)',
  DIAMOND: 'var(--tier-diamond)',
}

const tierColor = computed(() => tierColorMap[props.milestone.tier] ?? 'var(--text-tertiary)')

const accentColor = computed(() => {
  if (props.milestone.categoryCode) {
    return categoryStore.getAccent(props.milestone.categoryCode)
  }
  return undefined
})

const completionText = computed(() => `${props.milestone.completionPercent.toFixed(1)}% of players`)
</script>

<template>
  <div class="milestone-card" :class="{
    'milestone-card--completed': milestone.isCompleted,
  }" :style="accentColor ? { '--ms-accent': accentColor } : undefined">
    <div class="milestone-card__header">
      <span class="milestone-card__tier" :style="{ color: tierColor }">
        {{ milestone.tier }}
      </span>
      <span v-if="milestone.isCompleted === true" class="milestone-card__check" aria-label="Completed">
        &#10003;
      </span>
      <span v-else-if="milestone.isCompleted === false" class="milestone-card__lock" aria-label="Not completed">
        &#128274;
      </span>
    </div>
    <h3 class="milestone-card__title">{{ milestone.title }}</h3>
    <p class="milestone-card__desc">{{ milestone.description }}</p>
    <div class="milestone-card__footer">
      <span class="milestone-card__xp">{{ milestone.xp }} XP</span>
      <span class="milestone-card__completion">{{ completionText }}</span>
    </div>
  </div>
</template>

<style scoped>
.milestone-card {
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  transition: border-color 150ms ease;
}

.milestone-card--completed {
  border-color: var(--ms-accent, var(--accent));
}

.milestone-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.milestone-card__tier {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.milestone-card__check {
  color: var(--success);
  font-size: 1rem;
}

.milestone-card__lock {
  font-size: 0.875rem;
  opacity: 0.5;
}

.milestone-card__title {
  font-size: var(--text-card-title);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.milestone-card__desc {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.milestone-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.milestone-card__xp {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-primary);
}

.milestone-card__completion {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}
</style>
