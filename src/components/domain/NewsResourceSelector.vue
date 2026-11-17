<script setup lang="ts">
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type { Tab } from '@/types/display'
import type { NewsType } from '@/types/enums'
import { NEWS_TYPE_LABELS, NEWS_TYPE_ORDER, STANDALONE_NEWS_TYPES } from '@/utils/constants'
import { computed, ref, watch } from 'vue'

export type ResourceKind = Exclude<NewsType, 'GENERAL' | 'ITEMS' | 'PLUGIN'>

const props = defineProps<{
  allowed: ResourceKind[]
  allowedStandalone?: NewsType[]
  resourceType: NewsType
  resourceId: string | null
}>()

const emit = defineEmits<{
  'update:resourceType': [value: NewsType]
  'update:resourceId': [value: string | null]
}>()

const OPTIONS_SIZE = 200

const tabs = computed<Tab[]>(() => {
  const allowed = new Set<NewsType>([...(props.allowedStandalone ?? ['GENERAL']), ...props.allowed])
  return NEWS_TYPE_ORDER.filter((t) => allowed.has(t)).map((t) => ({ key: t, label: NEWS_TYPE_LABELS[t] }))
})

const isStandalone = computed(() => STANDALONE_NEWS_TYPES.includes(props.resourceType))

const options = ref<{ value: string; label: string }[]>([])
const loading = ref(false)
const error = ref('')

const LOADERS: Record<ResourceKind, () => Promise<{ value: string; label: string }[]>> = {
  BATCH: async () => {
    const { getBatches } = await import('@/api/batches')
    return (await getBatches({ size: OPTIONS_SIZE, sort: 'releasedAt,desc' })).content.map((b) => ({ value: b.id, label: b.name }))
  },
  CAMPAIGN: async () => {
    const { getCampaigns } = await import('@/api/campaigns')
    return (await getCampaigns({ size: OPTIONS_SIZE })).content.map((c) => ({ value: c.id, label: c.name }))
  },
  MILESTONE_SET: async () => {
    const { getMilestoneSets } = await import('@/api/milestones')
    return (await getMilestoneSets({ size: OPTIONS_SIZE })).content.map((s) => ({ value: s.id, label: s.title }))
  },
  CURVE: async () => {
    const { getCurves } = await import('@/api/admin/curves')
    return (await getCurves()).map((c) => ({ value: c.id, label: c.name }))
  },
}

async function loadOptions(kind: NewsType) {
  options.value = []
  error.value = ''
  const loader = LOADERS[kind as ResourceKind]
  if (!loader) return
  loading.value = true
  try {
    const loadedOptions = await loader()
    if (kind === props.resourceType) options.value = loadedOptions
  } catch {
    if (kind === props.resourceType) error.value = `Could not load the ${NEWS_TYPE_LABELS[kind].toLowerCase()} list`
  } finally {
    if (kind === props.resourceType) loading.value = false
  }
}

watch(() => props.resourceType, loadOptions, { immediate: true })

function selectKind(kind: string) {
  if (kind === props.resourceType) return
  emit('update:resourceType', kind as NewsType)
  emit('update:resourceId', null)
}
</script>

<template>
  <div class="resource-selector">
    <span class="field-label">Type</span>
    <BaseTabs variant="segmented" label="Type" :tabs="tabs" :model-value="resourceType" @update:model-value="selectKind" />

    <Transition name="collapse">
      <div v-if="!isStandalone" class="collapsible">
        <div class="resource-selector__picker">
          <SkeletonLoader v-if="loading" class="placeholder" height="var(--control-h)" />
          <p v-else-if="error" class="caption resource-selector__error" role="alert">{{ error }}</p>
          <BaseSelect
            v-else
            :model-value="resourceId ?? ''"
            :options="options"
            :disabled="!options.length"
            searchable
            :placeholder="options.length ? `Select a ${NEWS_TYPE_LABELS[resourceType].toLowerCase()}` : 'Nothing to pick'"
            @update:model-value="emit('update:resourceId', $event || null)"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.resource-selector {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
}

.resource-selector > .collapsible {
  align-self: stretch;
}

.resource-selector__picker {
  display: flex;
  align-items: center;
  min-height: var(--control-h);
  padding-top: var(--space-xs);
}

.resource-selector__picker > * {
  flex: 1;
}

.resource-selector__error {
  color: var(--error);
}
</style>
