<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import PlaylistDropdown from '@/components/domain/PlaylistDropdown.vue'
import QueueMapList from '@/components/domain/QueueMapList.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { RANKING_TABS, useRankingTabs } from '@/composables/useRankingTabs'
import { useWithdrawSuggestion } from '@/composables/useWithdrawSuggestion'
import { useAuthStore } from '@/stores/auth'
import { buildHubRoute } from '@/utils/mapRoute'
import { defineAsyncComponent, ref } from 'vue'
import { useRouter } from 'vue-router'

const PseudoLoginModal = defineAsyncComponent(() => import('@/components/domain/PseudoLoginModal.vue'))

usePageMeta({
  title: 'Ranking Hub | AccSaber',
  description: 'Suggested, queued and rejected maps on AccSaber, with their votes and comments.',
})

const router = useRouter()
const auth = useAuthStore()
const { tab, view, setTab } = useRankingTabs()

const { confirmModal, canWithdraw, askWithdraw } = useWithdrawSuggestion()

const loginMounted = ref(false)
const loginOpen = ref(false)

function open(name: 'ranking-hub-suggest' | 'ranking-hub-criteria') {
  if (auth.userId) return void router.push({ name })
  loginMounted.value = true
  loginOpen.value = true
}

async function fetchPage(params: Record<string, unknown>) {
  const { getDifficulties } = await import('@/api/maps')
  return getDifficulties(params as never)
}

</script>

<template>
  <div>
    <QueueMapList title="Ranking Hub" :count-label="view.countLabel" :empty-message="view.empty" :list="view.list"
      :base-params="view.params" :fetch-page="fetchPage" :row-route="buildHubRoute"
      :row-action="tab === 'suggested' ? canWithdraw : undefined">
      <template #tabs>
        <BaseTabs :tabs="RANKING_TABS" :model-value="tab" @update:model-value="setTab" />
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
  </div>
</template>
