<script setup lang="ts">
export interface WikiCompareRow {
  label: string
  values: (boolean | string)[]
}

defineProps<{
  columns: string[]
  rows: WikiCompareRow[]
}>()
</script>

<template>
  <table class="compare">
    <thead>
      <tr>
        <th></th>
        <th v-for="column in columns" :key="column" class="compare__col">{{ column }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.label">
        <th scope="row" class="compare__label">{{ row.label }}</th>
        <td v-for="(value, index) in row.values" :key="index" class="compare__value">
          <template v-if="typeof value === 'string'">{{ value }}</template>
          <svg
            v-else-if="value"
            class="compare__yes"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            role="img"
            aria-label="Yes"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <svg
            v-else
            class="compare__no"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            role="img"
            aria-label="No"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.compare__col,
.compare__value {
  text-align: center;
}

.compare th.compare__label {
  text-transform: none;
  letter-spacing: normal;
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-primary);
}

.compare__value {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.compare__yes {
  color: var(--success);
  vertical-align: middle;
}

.compare__no {
  color: var(--text-tertiary);
  vertical-align: middle;
}
</style>
