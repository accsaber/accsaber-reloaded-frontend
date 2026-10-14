<script setup lang="ts">
import MilestoneListView from '@/components/domain/MilestoneListView.vue'
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

const { resolvedGroups, standaloneSets, fetchGroups } = useSetGroups(sets)

let requestId = 0

async function fetchCompletion() {
  const id = ++requestId
  const { getMilestoneCompletionStats } = await import('@/api/milestones')
  const result = await getMilestoneCompletionStats(props.userId).catch(() => [])
  if (id === requestId) milestones.value = result
}

async function fetchSets() {
  const { getMilestoneSets } = await import('@/api/milestones')
  const [setRes] = await Promise.all([getMilestoneSets({ size: 100 }).catch(() => null), fetchGroups()])
  sets.value = setRes?.content ?? []
}

async function load() {
  loading.value = true
  await Promise.all([fetchCompletion(), sets.value.length ? null : fetchSets()])
  loading.value = false
}

watch(() => props.userId, load, { immediate: true })
</script>

<template>
  <MilestoneListView :milestones="milestones" :sets="sets" :loading="loading" logged-in
    :groups="resolvedGroups" :standalone-sets="standaloneSets"
    :pinnable="isSelfProfile" :pinned-ids="pinnedIds" :can-pin-more="canPinMore" :pin-pending="pinPending"
    @pin-toggle="emit('pin-toggle', $event)" />
</template>
