<script setup lang="ts" generic="T extends object">
import { useRowSwap } from '@/composables/useRowSwap'
import type { CSSProperties } from 'vue'

const props = withDefaults(defineProps<{
  items: T[]
  itemKey: (item: T, index: number) => string | number
  loading?: boolean
  refreshing?: boolean
  placeholders?: number
  as?: string
}>(), {
  placeholders: 3,
  as: 'div',
})

defineSlots<{
  default(props: { item: T; index: number; swap: { class: { stale: boolean }; style: CSSProperties } }): unknown
  placeholder(props: { index: number }): unknown
}>()

const { shown, cascade, isStale, isPlaceholder, renderKey } = useRowSwap(() => props.items, {
  key: props.itemKey,
  loading: () => props.loading,
  refreshing: () => props.refreshing,
  placeholders: () => props.placeholders,
})
</script>

<template>
  <component :is="as" class="stagger" :style="{ '--n': shown.length }" :aria-busy="loading">
    <template v-for="(item, i) in shown" :key="renderKey(item, i)">
      <slot v-if="isPlaceholder(item)" name="placeholder" :index="i" />
      <slot v-else :item="item" :index="i"
        :swap="{ class: { stale: isStale(i) }, style: { '--i': cascade ? i : 0 } }" />
    </template>
  </component>
</template>
