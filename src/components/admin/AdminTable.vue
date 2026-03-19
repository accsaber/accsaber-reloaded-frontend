<script setup lang="ts" generic="T">
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'

defineProps<{
  items: T[]
  loading?: boolean
  loadingRows?: number
  emptyMessage?: string
}>()
</script>

<template>
  <div class="admin-table-wrap">
    <table class="admin-table">
      <thead>
        <tr class="admin-table__head-row">
          <slot name="head" />
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="i in loadingRows ?? 6" :key="i" class="admin-table__row">
            <slot name="skeleton">
              <td colspan="100" class="admin-table__td">
                <SkeletonLoader variant="text" />
              </td>
            </slot>
          </tr>
        </template>
        <template v-else-if="!items.length">
          <tr>
            <td colspan="100" class="admin-table__empty">
              <slot name="empty">{{ emptyMessage ?? 'No data' }}</slot>
            </td>
          </tr>
        </template>
        <template v-else>
          <tr v-for="(item, i) in items" :key="i" class="admin-table__row">
            <slot :item="item" :index="i" />
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.admin-table-wrap {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body);
}

.admin-table__head-row {
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--bg-overlay);
}

:slotted(th) {
  padding: var(--space-sm) var(--space-md);
  text-align: left;
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

:slotted(th.right) { text-align: right; }
:slotted(th.mono) { font-family: var(--font-mono); }

.admin-table__row {
  border-bottom: 1px solid var(--bg-overlay);
  transition: background-color 80ms;
}

.admin-table__row:last-child { border-bottom: none; }

.admin-table__row:hover { background: var(--bg-elevated); }

.admin-table__row:nth-child(even) { background: color-mix(in srgb, var(--bg-surface) 60%, var(--bg-base)); }
.admin-table__row:nth-child(even):hover { background: var(--bg-elevated); }

:slotted(td) {
  padding: var(--space-sm) var(--space-md);
  color: var(--text-primary);
  vertical-align: middle;
}

:slotted(td.mono) { font-family: var(--font-mono); font-size: var(--text-caption); }
:slotted(td.muted) { color: var(--text-secondary); }
:slotted(td.right) { text-align: right; }
:slotted(td.tight) { padding-top: var(--space-xs); padding-bottom: var(--space-xs); }

.admin-table__td { padding: var(--space-sm) var(--space-md); }

.admin-table__empty {
  padding: var(--space-2xl) var(--space-md);
  text-align: center;
  color: var(--text-tertiary);
  font-size: var(--text-body);
}
</style>
