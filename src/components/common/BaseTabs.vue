<script setup lang="ts">
import type { Tab } from '@/types/display'
import { computed, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  tabs: Tab[]
  modelValue: string
  variant?: 'underline' | 'segmented'
  label?: string
  idPrefix?: string
  disabledKeys?: string[]
}>(), {
  variant: 'underline',
  label: undefined,
  idPrefix: undefined,
  disabledKeys: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

defineSlots<{
  tab?: (props: { tab: Tab; active: boolean }) => unknown
}>()

const enabledTabs = computed(() => props.tabs.filter((t) => !props.disabledKeys.includes(t.key)))
const focusKey = computed(() =>
  props.tabs.some((t) => t.key === props.modelValue) ? props.modelValue : enabledTabs.value[0]?.key,
)

function nextKey(key: string): string | undefined {
  const list = enabledTabs.value
  const index = list.findIndex((t) => t.key === props.modelValue)
  if (key === 'Home') return list[0]?.key
  if (key === 'End') return list[list.length - 1]?.key
  const step = key === 'ArrowRight' ? 1 : -1
  return list[(index + step + list.length) % list.length]?.key
}

function onKeydown(e: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
  e.preventDefault()
  const key = nextKey(e.key)
  if (key === undefined) return
  const list = e.currentTarget as HTMLElement
  emit('update:modelValue', key)
  void nextTick(() => list.querySelectorAll<HTMLElement>('[role="tab"]')[props.tabs.findIndex((t) => t.key === key)]?.focus())
}
</script>

<template>
  <div class="base-tabs" :class="`base-tabs--${variant}`" role="tablist" :aria-label="label" @keydown="onKeydown">
    <button v-for="tab in tabs" :id="idPrefix && `${idPrefix}-tab-${tab.key}`" :key="tab.key"
      type="button" class="base-tabs__tab" :class="{ 'base-tabs__tab--active': modelValue === tab.key }"
      :style="modelValue === tab.key ? { '--tab-accent': tab.accentColor ?? 'var(--accent)' } : undefined" role="tab"
      :aria-selected="modelValue === tab.key" :aria-controls="idPrefix && `${idPrefix}-panel-${tab.key}`"
      :tabindex="focusKey === tab.key ? 0 : -1" :disabled="disabledKeys.includes(tab.key)"
      @click="$emit('update:modelValue', tab.key)">
      <slot name="tab" :tab="tab" :active="modelValue === tab.key">{{ tab.label }}</slot>
    </button>
  </div>
</template>

<style scoped>
.base-tabs {
  display: flex;
}

.base-tabs__tab {
  font-family: var(--font-sans);
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.base-tabs__tab:hover:not(:disabled) {
  color: var(--text-primary);
}

.base-tabs__tab:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.base-tabs--underline {
  flex-wrap: wrap;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--bg-overlay);
}

.base-tabs--underline .base-tabs__tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-body);
  font-weight: 500;
  transition: color 120ms ease;
}

.base-tabs--underline .base-tabs__tab::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 3px;
  background: transparent;
}

.base-tabs--underline .base-tabs__tab--active {
  color: var(--tab-accent, var(--accent));
  font-weight: 600;
}

.base-tabs--underline .base-tabs__tab--active::after {
  background: var(--tab-accent, var(--accent));
}

.base-tabs--segmented {
  gap: 2px;
  padding: 2px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
}

.base-tabs--segmented .base-tabs__tab {
  padding: var(--space-xs) var(--space-sm);
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: 2px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  transition: color 120ms ease, background 120ms ease;
}

.base-tabs--segmented .base-tabs__tab--active {
  color: var(--text-primary);
  background: var(--bg-elevated);
}

@media (max-width: 767px) {
  .base-tabs--underline .base-tabs__tab {
    white-space: normal;
    flex-shrink: 0;
  }
}
</style>
