<script setup lang="ts">
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import ResourcePicker from '@/views/staff/admin/operations/ResourcePicker.vue'
import type { JobFieldKind, JobFieldResponse, JobFieldValue } from '@/types/api/jobs'
import { computed } from 'vue'
import { LEADERBOARD_PLATFORMS, RESOURCE_SOURCES } from './resourceSources'

type ControlKind = 'resource' | 'instant' | 'platform' | 'flag'

const CONTROL_BY_KIND: Record<JobFieldKind, ControlKind> = {
  USER: 'resource',
  CAMPAIGN: 'resource',
  MAP_DIFFICULTY: 'resource',
  MILESTONE: 'resource',
  ITEM: 'resource',
  INSTANT: 'instant',
  PLATFORM: 'platform',
  FLAG: 'flag',
}

const props = defineProps<{
  field: JobFieldResponse
  modelValue: JobFieldValue
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: JobFieldValue]
}>()

const source = computed(() => RESOURCE_SOURCES[props.field.kind] ?? null)

const control = computed<ControlKind | null>(() => {
  const resolved = CONTROL_BY_KIND[props.field.kind]
  if (!resolved) return null
  if (resolved === 'resource' && !source.value) return null
  return resolved
})

const resourceValue = computed<string | string[] | null>(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  return typeof props.modelValue === 'string' ? props.modelValue : null
})

const instantValue = computed(() => {
  if (typeof props.modelValue !== 'string' || !props.modelValue) return ''
  const parsed = new Date(props.modelValue)
  if (Number.isNaN(parsed.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
})

const platformValue = computed(() =>
  typeof props.modelValue === 'string' ? props.modelValue : '',
)

const platformOptions = computed(() => {
  const options = LEADERBOARD_PLATFORMS.map((platform) => ({ value: platform, label: platform }))
  return props.field.required ? options : [{ value: '', label: 'Any' }, ...options]
})

function onInstantInput(value: string | number) {
  const text = String(value)
  if (!text) {
    emit('update:modelValue', null)
    return
  }
  const parsed = new Date(text)
  emit('update:modelValue', Number.isNaN(parsed.getTime()) ? null : parsed.toISOString())
}
</script>

<template>
  <div class="job-field">
    <span v-if="control !== 'flag'" class="field-label">{{ field.label }}{{ field.required ? '' : ' (optional)' }}</span>

    <ResourcePicker v-if="control === 'resource' && source" :model-value="resourceValue" :search="source.search"
      :resolve="source.resolve" :multiple="field.multiple" :placeholder="source.placeholder" :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)" />

    <BaseInput v-else-if="control === 'instant'" :model-value="instantValue" type="datetime-local" :aria-label="field.label"
      :disabled="disabled" @update:model-value="onInstantInput" />

    <BaseSelect v-else-if="control === 'platform'" :model-value="platformValue" :options="platformOptions"
      @update:model-value="emit('update:modelValue', $event || null)" />

    <BaseSwitch v-else-if="control === 'flag'" :model-value="modelValue === true" :label="field.label" :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)" />

    <p v-else class="caption job-field__unsupported">This build has no input for {{ field.kind }}, leave {{ field.key }} empty</p>

    <p v-if="field.description" class="caption">{{ field.description }}</p>
  </div>
</template>

<style scoped>
.job-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.job-field__unsupported {
  color: var(--warning);
}
</style>
