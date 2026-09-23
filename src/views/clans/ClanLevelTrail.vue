<script setup lang="ts">
import ItemPreview from '@/components/domain/ItemPreview.vue'
import type { ClanLevelStepResponse } from '@/types/api/clans'
import { unlockLines } from '@/utils/clans'
import { rarityClass } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  steps: ClanLevelStepResponse[]
  currentLevel: number
}>()

interface TrailStop {
  step: ClanLevelStepResponse
  lines: string[]
  rewarding: boolean
  side: 'left' | 'right'
  state: 'reached' | 'current' | 'locked'
}

const stops = computed<TrailStop[]>(() => {
  let rewards = 0
  const ascending = [...props.steps].sort((a, b) => a.level - b.level).map((step) => {
    const lines = unlockLines(step.unlocks)
    const rewarding = lines.length > 0 || step.unlocks.cosmetics.length > 0
    if (rewarding) rewards += 1
    const state: TrailStop['state'] =
      step.level === props.currentLevel ? 'current' : step.level < props.currentLevel ? 'reached' : 'locked'
    return { step, lines, rewarding, side: rewards % 2 === 0 ? 'right' : 'left', state } as TrailStop
  })
  return ascending.reverse()
})
</script>

<template>
  <ol class="trail">
    <li
      v-for="stop in stops"
      :key="stop.step.level"
      class="trail__stop"
      :class="[`trail__stop--${stop.state}`, `trail__stop--${stop.side}`, { 'trail__stop--plain': !stop.rewarding }]"
    >
      <div v-if="stop.rewarding" class="trail__card">
        <header class="trail__card-head">
          <span class="trail__card-level">Level {{ stop.step.level }}</span>
          <span class="trail__card-xp">{{ Math.round(stop.step.totalXpRequired).toLocaleString() }} XP</span>
        </header>
        <ul v-if="stop.lines.length" class="trail__lines">
          <li v-for="line in stop.lines" :key="line">{{ line }}</li>
        </ul>
        <div v-if="stop.step.unlocks.cosmetics.length" class="trail__rewards">
          <div
            v-for="item in stop.step.unlocks.cosmetics"
            :key="item.id"
            class="trail__reward"
            :class="rarityClass(item.rarity)"
          >
            <span class="trail__reward-art"><ItemPreview :item="item" /></span>
            <span class="trail__reward-name">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <div class="trail__node" :aria-current="stop.state === 'current' ? 'step' : undefined">
        <span class="trail__node-level">{{ stop.step.level }}</span>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.trail {
  --trail-node: 56px;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: var(--space-md) 0;
  list-style: none;
}

.trail__stop {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--trail-node) minmax(0, 1fr);
  align-items: center;
  column-gap: var(--space-xl);
  min-height: 72px;
  padding: var(--space-sm) 0;
}

.trail__stop::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: var(--bg-overlay);
}

.trail__stop--reached::before,
.trail__stop--current::before {
  background: var(--page-accent, var(--accent));
}

.trail__stop--current::before {
  top: 50%;
}

.trail__stop:first-child::before {
  top: 50%;
}

.trail__stop:last-child::before {
  bottom: 50%;
}

.trail__node {
  position: relative;
  grid-column: 2;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  width: var(--trail-node);
  height: var(--trail-node);
  font-family: var(--font-mono);
  font-size: var(--text-card-title);
  font-weight: 700;
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%);
}

.trail__stop--plain .trail__node {
  width: 32px;
  height: 32px;
  font-size: var(--text-caption);
}

.trail__stop--reached .trail__node {
  color: var(--bg-base);
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 70%, var(--bg-base));
}

.trail__stop--current .trail__node {
  width: 72px;
  height: 72px;
  font-size: var(--text-section-heading);
  color: var(--bg-base);
  background: var(--page-accent, var(--accent));
}

.trail__card {
  position: relative;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.trail__stop--left .trail__card {
  grid-column: 1;
}

.trail__stop--right .trail__card {
  grid-column: 3;
}

.trail__card::after {
  content: '';
  position: absolute;
  top: 50%;
  width: var(--space-xl);
  height: 1px;
  background: var(--bg-overlay);
}

.trail__stop--left .trail__card::after {
  left: 100%;
}

.trail__stop--right .trail__card::after {
  right: 100%;
}

.trail__stop--current .trail__card {
  border-color: var(--page-accent, var(--accent));
}

.trail__stop--current .trail__card::after,
.trail__stop--reached .trail__card::after {
  background: var(--page-accent, var(--accent));
}

.trail__stop--locked .trail__card {
  opacity: 0.55;
}

.trail__card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.trail__card-level {
  font-size: var(--text-card-title);
  font-weight: 700;
  color: var(--text-primary);
}

.trail__card-xp {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.trail__lines {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-md);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
}

.trail__rewards {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.trail__reward {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  width: 96px;
}

.trail__reward-art {
  display: flex;
  width: 96px;
  height: 96px;
  padding: var(--space-xs);
  background: var(--bg-base);
  border: 1px solid var(--rarity-color, var(--bg-overlay));
  border-radius: var(--radius-card);
  overflow: hidden;
}

.trail__reward-name {
  max-width: 100%;
  font-size: var(--text-caption);
  font-weight: 600;
  text-align: center;
  color: var(--rarity-color, var(--text-secondary));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .trail {
    --trail-node: 44px;
  }

  .trail__stop {
    grid-template-columns: var(--trail-node) minmax(0, 1fr);
    column-gap: var(--space-md);
  }

  .trail__stop::before {
    left: calc(var(--trail-node) / 2);
  }

  .trail__node {
    grid-column: 1;
  }

  .trail__stop--current .trail__node {
    width: var(--trail-node);
    height: var(--trail-node);
    font-size: var(--text-card-title);
  }

  .trail__stop--left .trail__card,
  .trail__stop--right .trail__card {
    grid-column: 2;
  }

  .trail__stop--left .trail__card::after,
  .trail__stop--right .trail__card::after {
    left: auto;
    right: 100%;
    width: var(--space-md);
  }
}
</style>
