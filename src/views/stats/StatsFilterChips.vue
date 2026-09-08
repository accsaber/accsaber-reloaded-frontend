<script setup lang="ts" generic="T extends string">
interface ChipOption {
  key: T
  label: string
  hint?: string
}

defineProps<{
  label: string
  options: ChipOption[]
  selected: string[]
  emptyLabel?: string
}>()

const emit = defineEmits<{ toggle: [value: T]; clear: [] }>()
</script>

<template>
  <div class="chips">
    <span class="chips__label">{{ label }}</span>
    <div class="chips__row">
      <button type="button" class="chips__chip" :class="{ 'chips__chip--active': selected.length === 0 }"
        @click="emit('clear')">
        {{ emptyLabel ?? 'All' }}
      </button>
      <button v-for="opt in options" :key="opt.key" type="button" class="chips__chip"
        :class="{ 'chips__chip--active': selected.includes(opt.key) }" :title="opt.hint"
        :aria-pressed="selected.includes(opt.key)" @click="emit('toggle', opt.key)">
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
}

.chips__label {
  flex-shrink: 0;
  font-size: var(--text-caption);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.chips__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  min-width: 0;
}

.chips__chip {
  padding: 3px 8px;
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}

.chips__chip:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.chips__chip--active {
  color: var(--page-accent);
  border-color: var(--page-accent);
  background: color-mix(in srgb, var(--page-accent) 10%, transparent);
}
</style>
