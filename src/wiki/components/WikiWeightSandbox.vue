<script setup lang="ts">
import { positionWeight, weightedTotal } from '@/wiki/apCurve'
import { computed, ref } from 'vue'
import { formatFixed } from '@/utils/formatters'

const props = defineProps<{
  plays: number[]
  max: number
  initial: number
}>()

const newAp = ref(props.initial)

const basePlays = computed(() => [...props.plays].sort((a, b) => b - a))
const totalBefore = computed(() => weightedTotal(basePlays.value))

const rows = computed(() => {
  const merged = basePlays.value.map((ap) => ({ ap, isNew: false }))
  const at = merged.findIndex((row) => newAp.value > row.ap)
  merged.splice(at === -1 ? merged.length : at, 0, { ap: newAp.value, isNew: true })
  return merged.map((row, index) => ({
    ...row,
    position: index + 1,
    weight: positionWeight(index),
    contribution: row.ap * positionWeight(index),
  }))
})

const totalAfter = computed(() => rows.value.reduce((sum, row) => sum + row.contribution, 0))
const delta = computed(() => totalAfter.value - totalBefore.value)
const direct = computed(() => rows.value.find((row) => row.isNew)?.contribution ?? 0)
const slideCost = computed(() => direct.value - delta.value)

const formatWeight = (v: number) => `${(v * 100).toFixed(v >= 0.1 ? 0 : 1)}%`
</script>

<template>
  <figure class="sandbox">
    <div class="sandbox__controls">
      <label class="sandbox__slider">
        <span class="field-label">New play, raw AP</span>
        <input v-model.number="newAp" type="range" min="0" :max="max" step="5" />
        <span class="sandbox__slider-value">{{ newAp }}</span>
      </label>
      <div class="sandbox__totals">
        <span class="field-label">Your total</span>
        <span class="sandbox__total">
          <span class="sandbox__num">{{ formatFixed(totalBefore, 1) }}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <span class="sandbox__num">{{ formatFixed(totalAfter, 1) }}</span>
          <span class="sandbox__delta">+{{ formatFixed(delta, 1) }}</span>
        </span>
      </div>
    </div>

    <table class="sandbox__table">
      <thead>
        <tr>
          <th>#</th>
          <th>Raw AP</th>
          <th>Counts for</th>
          <th>Adds</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.position" :class="{ 'sandbox__row--new': row.isNew }">
          <td>{{ row.position }}</td>
          <td>{{ row.isNew ? row.ap.toFixed(0) : row.ap }}</td>
          <td>{{ formatWeight(row.weight) }}</td>
          <td>{{ formatFixed(row.contribution, 1) }}</td>
        </tr>
      </tbody>
    </table>

    <figcaption class="sandbox__breakdown">
      The new play brings {{ formatFixed(direct, 1) }} at its landing spot, and nudging everything
      below it one place down costs {{ formatFixed(slideCost, 1) }}, leaving +{{ formatFixed(delta, 1) }}.
    </figcaption>
  </figure>
</template>

<style scoped>
.sandbox {
  margin: 0 0 var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  padding: var(--space-md);
}

.sandbox__controls {
  display: flex;
  align-items: flex-end;
  gap: var(--space-xl);
  flex-wrap: wrap;
  margin-bottom: var(--space-md);
}

.sandbox__slider {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 200px;
}

.sandbox__slider input {
  accent-color: var(--accent);
}

.sandbox__slider-value {
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  font-weight: 500;
  color: var(--text-primary);
}

.sandbox__totals {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sandbox__total {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-mono);
  font-size: var(--text-stat-lg);
  font-weight: 500;
  color: var(--text-primary);
}

.sandbox__total svg {
  color: var(--text-tertiary);
}

.sandbox__num {
  display: inline-block;
  min-width: 6ch;
}

.sandbox__delta {
  color: var(--accent);
  display: inline-block;
  min-width: 7ch;
}

.sandbox__table {
  width: 100%;
  border-collapse: collapse;
}

.sandbox__table th {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--bg-overlay);
  text-align: right;
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.sandbox__table td {
  padding: 3px var(--space-sm);
  border-bottom: 1px solid color-mix(in srgb, var(--bg-overlay) 40%, transparent);
  text-align: right;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-primary);
}

.sandbox__row--new td {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  font-weight: 600;
}

.sandbox__breakdown {
  margin-top: var(--space-sm);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}
</style>
