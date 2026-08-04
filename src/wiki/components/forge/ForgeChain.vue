<script setup lang="ts">
import type { ChainStep } from '@/wiki/useMissionForge'
import { computed } from 'vue'

const props = defineProps<{
  steps: ChainStep[]
  final: number
  accuracy: number | null
}>()

const bounds = computed(() => {
  const values = props.steps.map((s) => s.value)
  const min = Math.min(...values) * 0.94
  const max = Math.max(...values) * 1.02
  return { min, span: Math.max(1, max - min) }
})

function barPercent(value: number): number {
  return Math.max(4, Math.min(100, ((value - bounds.value.min) / bounds.value.span) * 100))
}

function delta(index: number): number | null {
  if (index === 0) return null
  return props.steps[index].value - props.steps[index - 1].value
}
</script>

<template>
  <div class="chain">
    <ol class="chain__list">
      <li
        v-for="(step, index) in steps"
        :key="step.label"
        class="chain__step"
        :class="{ 'chain__step--changed': step.changed }"
      >
        <div class="chain__head">
          <span class="chain__label">{{ step.label }}</span>
          <span class="chain__value">
            {{ Math.round(step.value).toLocaleString() }}
            <span
              v-if="delta(index) !== null && Math.abs(delta(index) as number) >= 1"
              class="chain__delta"
              :class="(delta(index) as number) > 0 ? 'chain__delta--up' : 'chain__delta--down'"
            >
              {{ (delta(index) as number) > 0 ? '+' : '' }}{{ Math.round(delta(index) as number).toLocaleString() }}
            </span>
          </span>
        </div>
        <div class="chain__track">
          <span class="chain__fill" :style="{ width: `${barPercent(step.value)}%` }" />
        </div>
        <p class="chain__detail">{{ step.detail }}</p>
      </li>
    </ol>

    <p class="chain__final">
      <span class="chain__final-label">Lands on</span>
      <span class="chain__final-value">
        <template v-if="accuracy !== null">{{ (accuracy * 100).toFixed(2) }}%</template>
        <template v-else>{{ Math.round(final).toLocaleString() }} AP</template>
      </span>
    </p>
  </div>
</template>

<style scoped>
.chain {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.chain__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.chain__step {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chain__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.chain__label {
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
}

.chain__step--changed .chain__label {
  color: var(--text-primary);
}

.chain__value {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--text-primary);
  white-space: nowrap;
}

.chain__delta {
  margin-left: 6px;
  font-size: 0.6875rem;
}

.chain__delta--up {
  color: var(--success);
}

.chain__delta--down {
  color: var(--warning);
}

.chain__track {
  height: 3px;
  background: var(--bg-overlay);
  border-radius: 2px;
  overflow: hidden;
}

.chain__fill {
  display: block;
  height: 100%;
  background: var(--text-tertiary);
  transition: width 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.chain__step--changed .chain__fill {
  background: var(--accent);
}

.chain__detail {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  line-height: 1.5;
}

.chain__final {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  margin: 0;
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.chain__final-label {
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--text-secondary);
}

.chain__final-value {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .chain__fill {
    transition: none;
  }
}
</style>
