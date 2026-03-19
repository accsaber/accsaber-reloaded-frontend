<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from './BaseButton.vue'

const props = defineProps<{
  page: number
  totalPages: number
  siblingCount?: number
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const siblings = computed(() => props.siblingCount ?? 1)

const pages = computed(() => {
  const total = props.totalPages
  const current = props.page
  const s = siblings.value
  const result: (number | 'ellipsis')[] = []

  if (total <= 0) return result

  result.push(1)

  const rangeStart = Math.max(2, current - s)
  const rangeEnd = Math.min(total - 1, current + s)

  if (rangeStart > 2) result.push('ellipsis')

  for (let i = rangeStart; i <= rangeEnd; i++) {
    result.push(i)
  }

  if (rangeEnd < total - 1) result.push('ellipsis')

  if (total > 1) result.push(total)

  return result
})
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="Pagination">
    <BaseButton size="sm" :disabled="page <= 1" @click="emit('update:page', page - 1)">
      Prev
    </BaseButton>
    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === 'ellipsis'" class="pagination__ellipsis">&hellip;</span>
      <button v-else class="pagination__page" :class="{ 'pagination__page--active': p === page }"
        @click="emit('update:page', p)">
        {{ p }}
      </button>
    </template>
    <BaseButton size="sm" :disabled="page >= totalPages" @click="emit('update:page', page + 1)">
      Next
    </BaseButton>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  justify-content: center;
}

.pagination__page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 var(--space-sm);
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

.pagination__page:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.pagination__page--active {
  background: var(--accent);
  color: var(--bg-base);
  font-weight: 600;
}

.pagination__page--active:hover {
  background: var(--accent);
  color: var(--bg-base);
}

.pagination__ellipsis {
  color: var(--text-tertiary);
  padding: 0 var(--space-xs);
  font-size: var(--text-caption);
}
</style>
