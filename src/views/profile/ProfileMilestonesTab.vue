<script setup lang="ts">
import MilestoneListView from '@/components/domain/MilestoneListView.vue'
import type { MilestoneSort } from '@/api/milestones'
import { useSetGroups } from '@/composables/useSetGroups'
import type { MilestoneCompletionResponse, MilestoneSetResponse } from '@/types/api/milestones'
import { ref, watch } from 'vue'

const props = defineProps<{
  userId: string
  isSelfProfile?: boolean
  pinnedIds?: Set<string>
  canPinMore?: boolean
  pinPending?: Set<string>
}>()

const emit = defineEmits<{ 'pin-toggle': [milestoneId: string] }>()

const loading = ref(false)
const milestones = ref<MilestoneCompletionResponse[]>([])
const sets = ref<MilestoneSetResponse[]>([])
const sort = ref<MilestoneSort>('tier')

const { resolvedGroups, standaloneSets, fetchGroups, resetGroups } = useSetGroups(sets)

let requestId = 0

async function fetchCompletion() {
  const id = ++requestId
  const { getMilestoneCompletionStats } = await import('@/api/milestones')
  const result = await getMilestoneCompletionStats(props.userId, sort.value).catch(() => [])
  if (id === requestId) milestones.value = result
}

async function fetchSets() {
  try {
    const { getMilestoneSets } = await import('@/api/milestones')
    sets.value = (await getMilestoneSets({ size: 100 })).content
    await fetchGroups()
  } catch {
    sets.value = []
    resetGroups()
  }
}

async function load() {
  loading.value = true
  await Promise.all([fetchCompletion(), sets.value.length ? null : fetchSets()])
  loading.value = false
}

function handleSortChange(newSort: MilestoneSort) {
  sort.value = newSort
  fetchCompletion()
}

watch(() => props.userId, load, { immediate: true })
</script>

<template>
  <MilestoneListView :milestones="milestones" :sets="sets" :sort="sort" :loading="loading" logged-in
    :groups="resolvedGroups" :standalone-sets="standaloneSets"
    :pinnable="isSelfProfile" :pinned-ids="pinnedIds" :can-pin-more="canPinMore" :pin-pending="pinPending"
    @update:sort="handleSortChange" @pin-toggle="emit('pin-toggle', $event)" />
</template>
