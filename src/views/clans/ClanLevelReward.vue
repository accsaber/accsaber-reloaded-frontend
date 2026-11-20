<script setup lang="ts">
import RewardItemTile from '@/components/domain/RewardItemTile.vue'
import type { ClanLevelStepResponse } from '@/types/api/clans'
import { unlockLines } from '@/utils/clans'
import { isTitleItem } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  step: ClanLevelStepResponse
  xpToGo: number
  large?: boolean
  ghost?: boolean
}>()

const tileSize = computed(() => (props.large ? 120 : 88))
const lines = computed(() => unlockLines(props.step.unlocks))
const status = computed(() =>
  props.xpToGo > 0 ? `${Math.ceil(props.xpToGo).toLocaleString()} XP to go` : 'Unlocked',
)
</script>

<template>
  <article class="reward" :class="{ 'reward--large': large }" :style="{ '--reward-tile': `${tileSize}px` }">
    <header class="reward__head">
      <h3 class="reward__level">Level {{ step.level }}</h3>
      <span class="reward__status">{{ status }}</span>
    </header>
    <ul v-if="lines.length" class="reward__lines">
      <li v-for="line in lines" :key="line">{{ line }}</li>
    </ul>
    <ul v-if="step.unlocks.cosmetics.length" class="reward__items">
      <li v-for="item in step.unlocks.cosmetics" :key="item.id" class="reward__item">
        <span v-if="ghost && !isTitleItem(item.typeKey)" class="reward__ghost" />
        <RewardItemTile v-else :item="item" :size="tileSize" />
        <span class="reward__name">{{ item.name }}</span>
      </li>
    </ul>
  </article>
</template>

<style scoped>
.reward {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
  padding: var(--space-md);
  background: var(--bg-elevated);
  border-radius: var(--radius-card);
}

.reward__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.reward__level {
  margin: 0;
  font-size: var(--text-card-title);
  font-weight: 700;
  color: var(--text-primary);
}

.reward--large .reward__level {
  font-size: var(--text-section-heading);
}

.reward__status {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--clan-accent, var(--page-accent, var(--accent)));
  white-space: nowrap;
}

.reward__lines {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-md);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.reward__items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  margin: 0;
  padding: 0;
  list-style: none;
}

.reward__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  min-width: var(--reward-tile);
  max-width: 280px;
}

.reward__ghost {
  width: var(--reward-tile);
  height: var(--reward-tile);
}

.reward__name {
  max-width: 100%;
  overflow: hidden;
  font-size: var(--text-caption);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary);
}
</style>
