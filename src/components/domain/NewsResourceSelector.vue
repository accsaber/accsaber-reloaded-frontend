<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import type { NewsType } from '@/types/enums'
import { NEWS_TYPE_ACCENT, NEWS_TYPE_LABELS, NEWS_TYPE_ORDER } from '@/utils/constants'
import { computed, ref, watch } from 'vue'

export type ResourceKind = Exclude<NewsType, 'GENERAL'>

interface ResourceOption {
  value: string
  label: string
}

const props = defineProps<{
  allowed: ResourceKind[]
  resourceType: NewsType
  resourceId: string | null
}>()

const emit = defineEmits<{
  'update:resourceType': [value: NewsType]
  'update:resourceId': [value: string | null]
}>()

const choices = computed<{ key: NewsType; label: string }[]>(() => {
  const allowedSet = new Set<NewsType>(['GENERAL', ...props.allowed])
  return NEWS_TYPE_ORDER
    .filter((t) => allowedSet.has(t))
    .map((t) => ({ key: t, label: NEWS_TYPE_LABELS[t] }))
})

const options = ref<ResourceOption[]>([])
const loading = ref(false)
const error = ref('')

async function loadOptions(kind: NewsType) {
  options.value = []
  error.value = ''
  if (kind === 'GENERAL') return
  loading.value = true
  try {
    if (kind === 'BATCH') {
      const { getBatches } = await import('@/api/batches')
      const res = await getBatches({ size: 200, sort: 'releasedAt,desc' })
      options.value = res.content.map((b) => ({ value: b.id, label: b.name }))
    } else if (kind === 'CAMPAIGN') {
      const { getCampaigns } = await import('@/api/campaigns')
      const res = await getCampaigns({ size: 200 })
      options.value = res.content.map((c) => ({ value: c.id, label: c.name }))
    } else if (kind === 'MILESTONE_SET') {
      const { getMilestoneSets } = await import('@/api/milestones')
      const res = await getMilestoneSets({ size: 200 })
      options.value = res.content.map((s) => ({ value: s.id, label: s.title }))
    } else if (kind === 'CURVE') {
      const { getCurves } = await import('@/api/admin/curves')
      const res = await getCurves()
      options.value = res.map((c) => ({ value: c.id, label: c.name }))
    }
  } catch {
    error.value = `Failed to load ${NEWS_TYPE_LABELS[kind].toLowerCase()} list.`
  } finally {
    loading.value = false
  }
}

watch(
  () => props.resourceType,
  (kind) => {
    loadOptions(kind)
  },
  { immediate: true },
)

function selectKind(kind: NewsType) {
  if (kind === props.resourceType) return
  emit('update:resourceType', kind)
  emit('update:resourceId', null)
}

function selectId(id: string) {
  emit('update:resourceId', id || null)
}
</script>

<template>
  <div class="resource-selector">
    <label class="resource-selector__label">Linked resource</label>
    <div class="resource-selector__chips" role="radiogroup">
      <button
        v-for="choice in choices"
        :key="choice.key"
        type="button"
        role="radio"
        :aria-checked="resourceType === choice.key"
        class="resource-selector__chip"
        :class="{ 'resource-selector__chip--active': resourceType === choice.key }"
        :style="{ '--chip-accent': NEWS_TYPE_ACCENT[choice.key] }"
        @click="selectKind(choice.key)"
      >
        {{ choice.label }}
      </button>
    </div>

    <div v-if="resourceType !== 'GENERAL'" class="resource-selector__picker">
      <BaseSelect
        v-if="!loading && options.length"
        :model-value="resourceId ?? ''"
        :options="options"
        searchable
        :placeholder="`Select a ${NEWS_TYPE_LABELS[resourceType].toLowerCase()}`"
        @update:model-value="selectId"
      />
      <p v-else-if="loading" class="resource-selector__hint">Loading…</p>
      <p v-else-if="error" class="resource-selector__error">{{ error }}</p>
      <p v-else class="resource-selector__hint">No options available.</p>
    </div>
  </div>
</template>

<style scoped>
.resource-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.resource-selector__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.resource-selector__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.resource-selector__chip {
  padding: 4px 12px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: border-color 120ms ease, color 120ms ease, background 120ms ease;
}

.resource-selector__chip:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.resource-selector__chip--active {
  border-color: var(--chip-accent);
  color: var(--chip-accent);
  background: color-mix(in srgb, var(--chip-accent) 10%, transparent);
}

.resource-selector__picker {
  margin-top: var(--space-xs);
}

.resource-selector__hint {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  margin: 0;
}

.resource-selector__error {
  font-size: var(--text-caption);
  color: var(--error);
  margin: 0;
}
</style>
