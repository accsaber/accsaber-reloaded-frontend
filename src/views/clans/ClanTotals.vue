<script setup lang="ts">
import ClanBar from './ClanBar.vue'
import { computed } from 'vue'

export interface ClanTotalsRow {
  key: string
  label: string
  value: number
  text: string
}

const props = defineProps<{ rows: ClanTotalsRow[] }>()

const top = computed(() => Math.max(1, ...props.rows.map((row) => row.value)))
</script>

<template>
  <dl class="totals__rows">
    <div v-for="row in rows" :key="row.key" class="totals__row">
      <dt>{{ row.label }}</dt>
      <dd>
        <ClanBar class="totals__bar" :value="Math.max(0, row.value)" :max="top" />
        <span class="totals__value">{{ row.text }}</span>
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.totals__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin: 0;
  max-width: 560px;
}

.totals__row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-md);
}

.totals__row dt {
  font-size: var(--text-body);
  color: var(--text-primary);
}

.totals__row dd {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin: 0;
}

.totals__bar {
  flex: 1;
}

.totals__value {
  min-width: 64px;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  text-align: right;
  color: var(--text-primary);
}
</style>
