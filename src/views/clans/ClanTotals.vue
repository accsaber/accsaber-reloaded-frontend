<script setup lang="ts">
import ClanBar from './ClanBar.vue'
import { computed } from 'vue'

export interface ClanTotalsRow {
  key: string
  label: string
  value: number
  text: string
  down?: boolean
}

const props = defineProps<{ rows: ClanTotalsRow[] }>()

const top = computed(() => Math.max(1, ...props.rows.map((row) => row.value)))
</script>

<template>
  <div class="totals">
    <p v-if="$slots.default" class="totals__line"><slot /></p>
    <dl v-if="rows.length" class="totals__rows">
      <div v-for="row in rows" :key="row.key" class="totals__row">
        <dt>{{ row.label }}</dt>
        <dd>
          <ClanBar class="totals__bar" :value="Math.max(0, row.value)" :max="top" />
          <span class="totals__value" :class="{ 'totals__value--down': row.down }">{{ row.text }}</span>
        </dd>
      </div>
    </dl>
  </div>
</template>

<style scoped>
.totals {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.totals__line {
  margin: 0;
  max-width: 65ch;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

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

.totals__value--down {
  color: var(--error);
}
</style>
