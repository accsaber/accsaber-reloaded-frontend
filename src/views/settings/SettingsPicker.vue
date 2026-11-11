<script setup lang="ts" generic="T extends string | number | boolean">
import BaseTabs from '@/components/common/BaseTabs.vue'
import { computed } from 'vue'

interface PickerOption {
  value: T
  label: string
  description?: string
}

const props = defineProps<{
  modelValue: T | null
  options: PickerOption[]
  ariaLabel: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const tabs = computed(() => props.options.map((option) => ({ key: String(option.value), label: option.label })))
const descriptions = computed(
  () => new Map(props.options.map((option) => [String(option.value), option.description])),
)

function pick(key: string) {
  const option = props.options.find((candidate) => String(candidate.value) === key)
  if (option) emit('update:modelValue', option.value)
}
</script>

<template>
  <BaseTabs variant="segmented" :tabs="tabs" :model-value="String(modelValue)" :label="ariaLabel"
    :disabled-keys="disabled ? tabs.map((tab) => tab.key) : []" @update:model-value="pick">
    <template #tab="{ tab }">
      <span :title="descriptions.get(tab.key)">{{ tab.label }}</span>
    </template>
  </BaseTabs>
</template>
