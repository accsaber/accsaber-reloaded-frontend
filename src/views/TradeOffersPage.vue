<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseTabs from '@/components/common/BaseTabs.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import TradeOfferRow, { type TradeAction } from '@/views/trades/TradeOfferRow.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import { useAuthStore } from '@/stores/auth'
import { useEssenceStore } from '@/stores/essence'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { useTradeStore } from '@/stores/trades'
import type { TradeResponse, TradeStatus } from '@/types/api/trades'
import { computed, onMounted, ref, watch } from 'vue'

usePageMeta({
  title: 'Trade Offers | AccSaber',
  description: 'Trade items with other AccSaber players.',
})

const authStore = useAuthStore()
const essenceStore = useEssenceStore()
const tradeStore = useTradeStore()
const { queryRef } = useQueryParams()

type SectionKey = 'incoming' | 'incoming-history' | 'sent' | 'sent-history'
type Direction = 'incoming' | 'outgoing'

const HISTORY: TradeStatus[] = ['accepted', 'declined', 'cancelled', 'expired']

const SECTIONS: Record<SectionKey, { direction: Direction; history: boolean; emptyMessage: string }> = {
  incoming: { direction: 'incoming', history: false, emptyMessage: 'You have no incoming trade offers.' },
  'incoming-history': { direction: 'incoming', history: true, emptyMessage: 'No incoming offer history yet.' },
  sent: { direction: 'outgoing', history: false, emptyMessage: 'You have no outgoing trade offers.' },
  'sent-history': { direction: 'outgoing', history: true, emptyMessage: 'No sent offer history yet.' },
}

const STATE_TABS = [
  { key: 'open', label: 'Open' },
  { key: 'history', label: 'History' },
]

const breadcrumbs: Crumb[] = [
  { label: 'Market Hub', to: { name: 'market' } },
  { label: 'Trade Offers' },
]

const sectionParam = queryRef<SectionKey>('section')
const activeKey = computed<SectionKey>(() => (sectionParam.value && sectionParam.value in SECTIONS ? sectionParam.value : 'incoming'))
const section = computed(() => SECTIONS[activeKey.value])

const { currentPage, paginationParams, setPage } = usePageableRoute({
  defaultSort: 'createdAt',
  defaultOrder: 'desc',
  defaultSize: 20,
  secondarySort: null,
})

const directionTabs = computed(() => [
  {
    key: 'incoming',
    label: tradeStore.pendingIncomingCount ? `Incoming (${tradeStore.pendingIncomingCount})` : 'Incoming',
  },
  { key: 'outgoing', label: 'Sent' },
])

function selectSection(direction: string, history: boolean) {
  const key = (Object.keys(SECTIONS) as SectionKey[]).find(
    (k) => SECTIONS[k].direction === direction && SECTIONS[k].history === history,
  )
  sectionParam.value = !key || key === 'incoming' ? '' : key
}

const trades = ref<TradeResponse[]>([])
const totalPages = ref(0)
const loading = ref(true)
const batch = ref(0)
const acting = ref<{ id: string; action: TradeAction } | null>(null)
const actionError = ref<string | null>(null)

let requestId = 0

async function fetchActive() {
  if (!authStore.isLoggedIn) return
  const id = ++requestId
  const key = activeKey.value
  loading.value = true
  try {
    const { getTrades } = await import('@/api/trades')
    const page = await getTrades({
      direction: section.value.direction,
      status: section.value.history ? HISTORY : ['pending'],
      ...paginationParams.value,
    })
    if (id !== requestId) return
    trades.value = page.content
    totalPages.value = page.totalPages
    if (key === 'incoming') tradeStore.pendingIncomingCount = page.totalElements
  } catch {
    if (id !== requestId) return
    trades.value = []
  }
  batch.value++
  loading.value = false
}

function resolve(tradeId: string) {
  trades.value = trades.value.filter((t) => t.id !== tradeId)
  if (activeKey.value === 'incoming') tradeStore.pendingIncomingCount = Math.max(0, tradeStore.pendingIncomingCount - 1)
  if (trades.value.length === 0) fetchActive()
}

async function runAction(tradeId: string, action: TradeAction) {
  acting.value = { id: tradeId, action }
  actionError.value = null
  try {
    const api = await import('@/api/trades')
    const calls = { accept: api.acceptTrade, decline: api.declineTrade, cancel: api.cancelTrade }
    await calls[action](tradeId)
    resolve(tradeId)
  } catch (e) {
    actionError.value = parseApiError(e, `Could not ${action} this trade.`).message
  } finally {
    acting.value = null
  }
  if (action === 'accept') essenceStore.fetchBalance(true)
}

watch(() => JSON.stringify([activeKey.value, paginationParams.value]), fetchActive, { immediate: true })

onMounted(() => {
  if (!authStore.isLoggedIn) return
  useItemModifierStore().fetchModifiers()
  essenceStore.fetchBalance()
  if (activeKey.value !== 'incoming') tradeStore.refreshIncomingCount()
})
</script>

<template>
  <div class="trades-page">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <header class="trades-page__header">
      <h1>Trade Offers</h1>
      <BaseButton v-if="authStore.isLoggedIn" variant="primary" href="/trade-offers/new">New Trade Offer</BaseButton>
    </header>

    <EmptyState v-if="!authStore.isLoggedIn" message="Log in to view your trade offers." />

    <template v-else>
      <div class="trades-page__controls">
        <BaseTabs :tabs="directionTabs" :model-value="section.direction" label="Offer direction"
          @update:model-value="selectSection($event, section.history)" />
        <BaseTabs :tabs="STATE_TABS" :model-value="section.history ? 'history' : 'open'" variant="segmented"
          label="Offer state" @update:model-value="selectSection(section.direction, $event === 'history')" />
      </div>

      <BaseBanner v-if="actionError" variant="error" role="alert" @close="actionError = null">
        {{ actionError }}
      </BaseBanner>

      <div v-if="batch === 0" class="trades-page__reserved" aria-busy="true" />

      <EmptyState v-else-if="trades.length === 0" :message="section.emptyMessage" />

      <TransitionGroup v-else :key="batch" tag="div" name="collapse" class="trades-page__list stagger"
        :class="{ refreshing: loading }" :style="{ '--n': trades.length }">
        <div v-for="(t, i) in trades" :key="t.id" class="collapsible" :style="{ '--i': i }">
          <div class="trades-page__item">
            <TradeOfferRow :trade="t" :perspective="section.direction"
              :busy="acting?.id === t.id ? acting.action : null" :spendable-balance="essenceStore.balance"
              @act="runAction(t.id, $event)" />
          </div>
        </div>
      </TransitionGroup>

      <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages"
        @update:page="setPage($event)" />
    </template>
  </div>
</template>

<style scoped>
.trades-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}

.trades-page__header,
.trades-page__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
}

.trades-page__reserved {
  min-height: 60vh;
}

.trades-page__item {
  padding-bottom: var(--space-md);
  transition: padding var(--dur-exit) var(--ease-in);
}

.collapse-leave-to > .trades-page__item {
  padding-bottom: 0;
}
</style>
