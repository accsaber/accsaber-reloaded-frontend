<script setup lang="ts" generic="K extends string">
import StatsIcon from './StatsIcon.vue'

defineProps<{
  modelValue: K
  options: { value: K; label: string; icon: string }[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: K] }>()
</script>

<template>
  <div class="board-picker" role="group" aria-label="Board">
    <button v-for="(opt, i) in options" :key="opt.value" type="button" data-stats-board
      class="board-picker__card pressable"
      :style="{ '--morph': `stats-board-${i}` }"
      :class="{ 'board-picker__card--active': modelValue === opt.value }" :aria-pressed="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)">
      <span class="board-picker__icon">
        <StatsIcon :icon="opt.icon" />
      </span>
      <span class="board-picker__label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.board-picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: var(--space-sm);
}

.board-picker__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  height: 96px;
  padding: var(--space-md) var(--space-xs) 0;
  border: none;
  border-radius: var(--radius-card);
  background: var(--bg-surface);
  font-family: inherit;
  text-align: center;
  cursor: pointer;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
}

.board-picker__card:hover {
  background: var(--bg-elevated);
}

:root[data-stats-morph] .board-picker__card {
  view-transition-name: var(--morph);
}

.board-picker__card--active {
  background: var(--bg-elevated);
}

.board-picker__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 50%;
  background: var(--bg-base);
  color: var(--text-tertiary);
  transition: color var(--dur-fast) var(--ease-out);
}

.board-picker__card:hover .board-picker__icon {
  color: var(--text-secondary);
}

.board-picker__card--active .board-picker__icon,
.board-picker__card--active:hover .board-picker__icon {
  color: var(--page-accent, var(--accent));
}

.board-picker__label {
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-secondary);
  text-wrap: balance;
}

.board-picker__card--active .board-picker__label {
  color: var(--text-primary);
}

@media (max-width: 767px) {
  .board-picker {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
