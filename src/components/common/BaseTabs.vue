<script setup lang="ts">
import type { Tab } from '@/types/display'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

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

const listRef = ref<HTMLElement | null>(null)
const indicator = ref<Record<string, string> | null>(null)
const settled = ref(false)
let observer: ResizeObserver | null = null
let observedTab: HTMLElement | null = null

const activeAccent = computed(
  () => props.tabs.find((t) => t.key === props.modelValue)?.accentColor ?? 'var(--accent)',
)

function measure() {
  const tab = listRef.value?.querySelector<HTMLElement>('.base-tabs__tab--active') ?? null
  if (tab !== observedTab) {
    if (observedTab) observer?.unobserve(observedTab)
    if (tab) observer?.observe(tab)
    observedTab = tab
  }
  indicator.value = tab && {
    '--tab-x': `${tab.offsetLeft}px`,
    '--tab-y': `${tab.offsetTop}px`,
    '--tab-w': `${tab.offsetWidth}px`,
    '--tab-h': `${tab.offsetHeight}px`,
  }
}

watch(() => [props.modelValue, props.tabs], measure, { flush: 'post' })

onMounted(() => {
  observer = new ResizeObserver(measure)
  if (listRef.value) observer.observe(listRef.value)
  measure()
  requestAnimationFrame(() => { settled.value = true })
})

onUnmounted(() => observer?.disconnect())

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
  <div ref="listRef" class="base-tabs" :class="[`base-tabs--${variant}`, { 'base-tabs--settled': settled }]"
    :style="{ '--tab-accent': activeAccent }" role="tablist" :aria-label="label" @keydown="onKeydown">
    <span v-if="indicator" class="base-tabs__indicator" :style="indicator" aria-hidden="true" />
    <button v-for="tab in tabs" :id="idPrefix && `${idPrefix}-tab-${tab.key}`" :key="tab.key"
      type="button" class="base-tabs__tab" :class="{ 'base-tabs__tab--active': modelValue === tab.key }"
      role="tab"
      :aria-selected="modelValue === tab.key" :aria-controls="idPrefix && `${idPrefix}-panel-${tab.key}`"
      :tabindex="focusKey === tab.key ? 0 : -1" :disabled="disabledKeys.includes(tab.key)"
      @click="$emit('update:modelValue', tab.key)">
      <slot name="tab" :tab="tab" :active="modelValue === tab.key">{{ tab.label }}</slot>
    </button>
  </div>
</template>

<style scoped>
.base-tabs {
  position: relative;
  display: flex;
  overflow-y: clip;
}

.base-tabs__indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--tab-w);
  transform: translate(var(--tab-x), var(--tab-y));
  pointer-events: none;
}

.base-tabs--settled .base-tabs__indicator {
  transition:
    transform var(--dur-enter) var(--ease-in-out),
    width var(--dur-enter) var(--ease-in-out),
    background-color var(--dur-enter) var(--ease-in-out);
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
  transition: color var(--dur-fast) var(--ease-out);
}

.base-tabs--underline .base-tabs__indicator {
  top: calc(var(--tab-h) - 3px);
  height: 3px;
  background: var(--tab-accent);
}

.base-tabs--underline .base-tabs__tab--active {
  color: var(--tab-accent);
}

.base-tabs--segmented {
  gap: 2px;
  padding: 2px;
  background: var(--bg-surface);
  border-radius: var(--radius-btn);
}

.base-tabs--segmented .base-tabs__indicator {
  height: var(--tab-h);
  background: var(--bg-overlay);
  border-radius: calc(var(--radius-btn) - 2px);
}

.base-tabs--segmented .base-tabs__tab {
  position: relative;
  padding: var(--space-sm) var(--space-md);
  font-size: 0.8125rem;
  font-weight: 500;
  transition: color var(--dur-fast) var(--ease-out);
}

.base-tabs--segmented .base-tabs__tab--active {
  color: var(--text-primary);
}

@media (max-width: 767px) {
  .base-tabs--underline .base-tabs__tab {
    white-space: normal;
    flex-shrink: 0;
  }
}
</style>
