<script setup lang="ts">
import '@/wiki/components/demo.css'
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
  <figure class="wiki-demo">
    <div class="sandbox__controls">
      <label class="wiki-demo__field sandbox__slider">
        <span class="field-label">New Play, Raw AP</span>
        <span class="wiki-demo__value">{{ newAp }}</span>
        <input v-model.number="newAp" class="slider" type="range" min="0" :max="max" step="5" />
      </label>
      <div class="wiki-demo__field">
        <span class="field-label">Your Total</span>
        <span class="wiki-demo__value sandbox__total">
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
          <th>Counts For</th>
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

    <figcaption class="caption">
      The new play adds {{ formatFixed(direct, 1) }} at its spot and pushing everything below it one place down costs {{ formatFixed(slideCost, 1) }} so you end up with +{{ formatFixed(delta, 1) }}.
    </figcaption>
  </figure>
</template>

<style scoped>
.sandbox__controls {
  display: flex;
  align-items: flex-end;
  gap: var(--space-xl);
  flex-wrap: wrap;
  margin-bottom: var(--space-md);
}

.sandbox__slider {
  flex: 1;
  min-width: 200px;
}

.sandbox__total {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
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

.wiki-demo .sandbox__table th,
.wiki-demo .sandbox__table td {
  padding: var(--space-xs) var(--space-md);
  text-align: right;
}

.sandbox__table td {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-primary);
}

.sandbox__table tbody tr.sandbox__row--new td {
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
  color: var(--accent);
  font-weight: 600;
}

</style>
