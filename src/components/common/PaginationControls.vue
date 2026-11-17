<script setup lang="ts">
import { useMediaQuery } from '@/composables/useMediaQuery'
import { computed, nextTick, ref } from 'vue'

type Gap = 'left' | 'right'

const props = withDefaults(defineProps<{
  page: number
  totalPages: number
  siblingCount?: number
  compact?: boolean
}>(), { siblingCount: 1 })

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const narrow = useMediaQuery('(max-width: 767px)')
const jumping = ref<Gap | null>(null)
const jumpInput = ref('')
const jumpRef = ref<HTMLInputElement[]>([])

function span(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

const slots = computed<(number | Gap)[]>(() => {
  const total = props.totalPages
  const s = narrow.value ? 0 : props.siblingCount
  const count = 2 * s + 5
  if (total <= count) return span(1, total)
  if (props.page <= s + 3) return [...span(1, count - 2), 'right', total]
  if (props.page >= total - s - 2) return [1, 'left', ...span(total - count + 3, total)]
  return [1, 'left', ...span(props.page - s, props.page + s), 'right', total]
})

function go(page: number) {
  if (page >= 1 && page <= props.totalPages && page !== props.page) emit('update:page', page)
}

function openJump(side: Gap) {
  jumpInput.value = ''
  jumping.value = side
  nextTick(() => jumpRef.value[0]?.focus())
}

function submitJump() {
  go(parseInt(jumpInput.value.replace(/\D/g, ''), 10))
  jumping.value = null
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="Pagination">
    <button type="button" class="pagination__btn pressable" :disabled="page <= 1" aria-label="Previous page"
      @click="go(page - 1)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="15 6 9 12 15 18" />
      </svg>
    </button>

    <span v-if="compact" class="pagination__count">{{ page }} / {{ totalPages }}</span>

    <template v-for="slot in slots" v-else :key="slot">
      <button v-if="typeof slot === 'number'" type="button" class="pagination__btn pressable"
        :class="{ 'pagination__btn--active': slot === page }" :aria-current="slot === page ? 'page' : undefined"
        @click="go(slot)">
        {{ slot }}
      </button>
      <input v-else-if="jumping === slot" ref="jumpRef" v-model="jumpInput" class="pagination__btn pagination__jump"
        inputmode="numeric" aria-label="Page number" @keydown.enter="submitJump" @keydown.escape="jumping = null"
        @blur="jumping = null" />
      <button v-else type="button" class="pagination__btn pressable" aria-label="Jump to page"
        @click="openJump(slot)">
        &hellip;
      </button>
    </template>

    <button type="button" class="pagination__btn pressable" :disabled="page >= totalPages" aria-label="Next page"
      @click="go(page + 1)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </button>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
}

.pagination__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--control-h);
  height: var(--control-h);
  padding: 0 var(--space-xs);
  border: none;
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  cursor: pointer;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.pagination__btn:hover:not(:disabled, .pagination__btn--active) {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.pagination__btn:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.pagination__btn--active {
  background: var(--page-accent, var(--accent));
  color: var(--bg-base);
  font-weight: 600;
}

.pagination__jump {
  width: var(--control-h);
  background: var(--bg-base);
  color: var(--text-primary);
  text-align: center;
  cursor: text;
  outline: 1px solid var(--page-accent, var(--accent));
}

.pagination__count {
  min-width: 48px;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-align: center;
}
</style>
