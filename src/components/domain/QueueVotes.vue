<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  up: number
  down: number
  neutral?: number | null
}>()

const rating = computed(() => props.up - props.down)
const tone = computed(() => (rating.value > 0 ? 'up' : rating.value < 0 ? 'down' : 'neutral'))
const split = computed(() => props.down > 0 || !!props.neutral)
</script>

<template>
  <span class="queue-votes" :aria-label="`Rating ${rating}, ${up} up, ${down} down`">
    <span class="queue-votes__rating" :class="`queue-votes--${tone}`">{{ rating > 0 ? '+' : '' }}{{ rating }}</span>
    <template v-if="split">
      <span v-if="up" class="queue-votes__count queue-votes--up">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        {{ up }}
      </span>
      <span v-if="neutral" class="queue-votes__count queue-votes--neutral">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 12 18 12" />
        </svg>
        {{ neutral }}
      </span>
      <span v-if="down" class="queue-votes__count queue-votes--down">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {{ down }}
      </span>
    </template>
  </span>
</template>

<style scoped>
.queue-votes {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-mono);
}

.queue-votes__rating {
  min-width: 3ch;
  font-size: var(--text-body);
  font-weight: 600;
}

.queue-votes__count {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--text-caption);
  font-weight: 500;
}

.queue-votes--up {
  color: var(--success);
}

.queue-votes--down {
  color: var(--error);
}

.queue-votes--neutral {
  color: var(--text-tertiary);
}
</style>
