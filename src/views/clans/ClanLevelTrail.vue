<script setup lang="ts">
import type { ClanLevelStepResponse } from '@/types/api/clans'
import { computed, ref } from 'vue'
import ClanLevelReward from './ClanLevelReward.vue'

const props = defineProps<{
  steps: ClanLevelStepResponse[]
  currentLevel: number
  totalXp: number
}>()

interface TrailStop {
  level: number
  step: ClanLevelStepResponse | null
  state: 'reached' | 'current' | 'locked'
}

const byLevel = computed(() => new Map(props.steps.map((step) => [step.level, step])))
const maxLevel = computed(() => Math.max(0, ...props.steps.map((s) => s.level)))

const stops = computed<TrailStop[]>(() =>
  Array.from({ length: maxLevel.value + 1 }, (_, level) => ({
    level,
    step: rewarding(byLevel.value.get(level)) ? byLevel.value.get(level)! : null,
    state: level === props.currentLevel ? 'current' : level < props.currentLevel ? 'reached' : 'locked',
  })),
)

const selectedLevel = ref<number | null>(null)
const selected = computed(() => (selectedLevel.value === null ? null : byLevel.value.get(selectedLevel.value) ?? null))

function rewarding(step: ClanLevelStepResponse | undefined): boolean {
  if (!step) return false
  const u = step.unlocks
  return u.cosmetics.length > 0 || u.arenas.length > 0 || u.rulesets.length > 0 || Object.values(u.capacities).some(Boolean)
}

function toggle(level: number) {
  selectedLevel.value = selectedLevel.value === level ? null : level
}
</script>

<template>
  <div class="trail">
    <ol class="trail__track">
      <li
        v-for="stop in stops"
        :key="stop.level"
        class="trail__stop"
        :class="[`trail__stop--${stop.state}`, { 'trail__stop--reward': stop.step }]"
      >
        <button
          v-if="stop.step"
          type="button"
          class="trail__node"
          :aria-pressed="selectedLevel === stop.level"
          :aria-current="stop.state === 'current' ? 'step' : undefined"
          :aria-label="`Level ${stop.level} rewards`"
          @click="toggle(stop.level)"
        >
          {{ stop.level }}
        </button>
        <span v-else class="trail__tick" :aria-current="stop.state === 'current' ? 'step' : undefined">
          <span class="trail__tick-label">{{ stop.level }}</span>
        </span>
      </li>
    </ol>
    <ClanLevelReward v-if="selected" :step="selected" :xp-to-go="selected.totalXpRequired - totalXp" />
  </div>
</template>

<style scoped>
.trail {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.trail__track {
  display: flex;
  align-items: center;
  margin: 0;
  padding: var(--space-sm) 2px var(--space-md);
  overflow-x: auto;
  list-style: none;
  scrollbar-width: thin;
}

.trail__stop {
  position: relative;
  display: flex;
  flex: 1 0 28px;
  align-items: center;
  justify-content: center;
  height: 48px;
}

.trail__stop::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  transform: translateY(-50%);
  background: var(--bg-overlay);
}

.trail__stop:first-child::before {
  left: 50%;
}

.trail__stop:last-child::before {
  right: 50%;
}

.trail__stop--reached::before {
  background: var(--clan-accent, var(--page-accent, var(--accent)));
}

.trail__stop--current::before {
  background: linear-gradient(
    to right,
    var(--clan-accent, var(--page-accent, var(--accent))) 50%,
    var(--bg-overlay) 50%
  );
}

.trail__stop--reward {
  flex-basis: 48px;
}

.trail__node {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  font: inherit;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--text-tertiary);
  background: var(--bg-elevated);
  border: none;
  clip-path: polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%);
  isolation: isolate;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}

.trail__node:hover {
  color: var(--text-primary);
  background: var(--bg-overlay);
}

.trail__node:focus-visible {
  outline: none;
}

.trail__stop--reached .trail__node {
  color: var(--bg-base);
  background: color-mix(in srgb, var(--clan-accent, var(--page-accent, var(--accent))) 65%, var(--bg-base));
}

.trail__stop--current .trail__node {
  width: 48px;
  height: 48px;
  color: var(--bg-base);
  background: var(--clan-accent, var(--page-accent, var(--accent)));
}

.trail__node[aria-pressed='true'],
.trail__node:focus-visible {
  color: var(--text-primary);
  background: var(--clan-accent, var(--page-accent, var(--accent)));
}

.trail__node[aria-pressed='true']::before,
.trail__node:focus-visible::before {
  content: '';
  position: absolute;
  inset: 3px;
  z-index: -1;
  background: var(--bg-overlay);
  clip-path: inherit;
}

.trail__tick {
  position: relative;
  width: 8px;
  height: 8px;
  background: var(--bg-overlay);
  border-radius: 2px;
}

.trail__stop--reached .trail__tick,
.trail__stop--current .trail__tick {
  background: var(--clan-accent, var(--page-accent, var(--accent)));
}

.trail__stop--current .trail__tick {
  width: 14px;
  height: 14px;
}

.trail__tick-label {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.trail__stop--current .trail__tick-label {
  top: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

@media (prefers-reduced-motion: reduce) {
  .trail__node {
    transition: none;
  }
}
</style>
