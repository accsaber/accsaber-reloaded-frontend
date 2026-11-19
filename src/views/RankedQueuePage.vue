<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import PlaylistDropdown from '@/components/domain/PlaylistDropdown.vue'
import QueueMapList, { type QueueEntry } from '@/components/domain/QueueMapList.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useWithdrawSuggestion } from '@/composables/useWithdrawSuggestion'
import { useAuthStore } from '@/stores/auth'
import type { Tab } from '@/types/display'
import { QUEUE_STATUSES } from '@/utils/constants'
import { computed, defineAsyncComponent, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type HubTab = 'queue' | 'suggested' | 'rejected'
const PseudoLoginModal = defineAsyncComponent(() => import('@/components/domain/PseudoLoginModal.vue'))

const TABS: Tab[] = [
  { key: 'suggested', label: 'Suggested' },
  { key: 'queue', label: 'Queue' },
  { key: 'rejected', label: 'Rejected' },
]
const VIEWS: Record<HubTab, {
  list: 'queue' | 'suggested' | 'deactivated'
  params: Record<string, unknown>
  countLabel: string
  empty: string
}> = {
  suggested: { list: 'suggested', params: { status: 'SUGGESTED' }, countLabel: 'suggested maps', empty: 'No suggested maps' },
  queue: { list: 'queue', params: { status: QUEUE_STATUSES.join(',') }, countLabel: 'maps in the queue', empty: 'No maps in the queue' },
  rejected: { list: 'deactivated', params: { active: false }, countLabel: 'rejected maps', empty: 'No rejected maps' },
}

usePageMeta({
  title: 'Ranking Hub | AccSaber',
  description: 'Suggested, queued and rejected maps on AccSaber, with their votes and comments.',
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const tab = computed<HubTab>(() => (route.query.tab as string) in VIEWS ? (route.query.tab as HubTab) : 'queue')
const view = computed(() => VIEWS[tab.value])

const { confirmModal, canWithdraw, askWithdraw } = useWithdrawSuggestion()

const loginMounted = ref(false)
const loginOpen = ref(false)

function setTab(next: string) {
  void router.replace({ query: next === 'queue' ? {} : { tab: next } })
}

function open(name: 'ranking-hub-suggest' | 'ranking-hub-criteria') {
  if (auth.userId) return void router.push({ name })
  loginMounted.value = true
  loginOpen.value = true
}

async function fetchPage(params: Record<string, unknown>) {
  const { getDifficulties } = await import('@/api/maps')
  return getDifficulties(params as never)
}

function rowRoute(entry: QueueEntry) {
  return { name: 'ranking-hub-detail', params: { difficultyId: entry.id } }
}
</script>

<template>
  <QueueMapList title="Ranking Hub" :count-label="view.countLabel" :empty-message="view.empty" :list="view.list"
    :base-params="view.params" :fetch-page="fetchPage" :row-route="rowRoute"
    :row-action="tab === 'suggested' ? canWithdraw : undefined">
    <template #tabs>
      <BaseTabs :tabs="TABS" :model-value="tab" @update:model-value="setTab" />
    </template>
    <template #actions>
      <BaseButton @click="open('ranking-hub-suggest')">Suggest a Map</BaseButton>
      <BaseButton @click="open('ranking-hub-criteria')">Criteria Checker</BaseButton>
      <PlaylistDropdown queued />
    </template>
    <template #row-action="{ entry, remove }">
      <BaseButton size="sm" variant="destructive" @click="askWithdraw(entry, remove)">Withdraw</BaseButton>
    </template>
  </QueueMapList>

  <ConfirmModal v-bind="confirmModal" />

  <PseudoLoginModal v-if="loginMounted" :open="loginOpen" @close="loginOpen = false" />
</template>
