<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import TradeOfferRow from '@/components/domain/TradeOfferRow.vue'
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
type TradeAction = 'accept' | 'decline' | 'cancel'

const HISTORY: TradeStatus[] = ['accepted', 'declined', 'cancelled', 'expired']

const SECTIONS: Record<SectionKey, {
  label: string
  direction: 'incoming' | 'outgoing'
  statuses: TradeStatus[]
  sub?: boolean
  emptyMessage: string
}> = {
  incoming: { label: 'Incoming Offers', direction: 'incoming', statuses: ['pending'], emptyMessage: 'You have no incoming trade offers.' },
  'incoming-history': { label: 'Incoming Offer History', direction: 'incoming', statuses: HISTORY, sub: true, emptyMessage: 'No incoming offer history yet.' },
  sent: { label: 'Sent Offers', direction: 'outgoing', statuses: ['pending'], emptyMessage: 'You have no outgoing trade offers.' },
  'sent-history': { label: 'Sent Offer History', direction: 'outgoing', statuses: HISTORY, sub: true, emptyMessage: 'No sent offer history yet.' },
}

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

const trades = ref<TradeResponse[]>([])
const totalPages = ref(0)
const loading = ref(true)
const actionBusy = ref<string | null>(null)
const actionError = ref<string | null>(null)

let requestId = 0

async function fetchActive() {
  if (!authStore.isLoggedIn) return
  const id = ++requestId
  const key = activeKey.value
  loading.value = true
  try {
    const { getTrades } = await import('@/api/trades')
    const page = await getTrades({ direction: section.value.direction, status: section.value.statuses, ...paginationParams.value })
    if (id !== requestId) return
    trades.value = page.content
    totalPages.value = page.totalPages
    if (key === 'incoming') tradeStore.pendingIncomingCount = page.totalElements
  } catch {
    if (id === requestId) trades.value = []
  }
  if (id === requestId) loading.value = false
}

function resolve(tradeId: string) {
  trades.value = trades.value.filter((t) => t.id !== tradeId)
  if (activeKey.value === 'incoming') tradeStore.pendingIncomingCount = Math.max(0, tradeStore.pendingIncomingCount - 1)
  if (trades.value.length === 0) fetchActive()
}

async function runAction(tradeId: string, action: TradeAction) {
  actionBusy.value = tradeId
  actionError.value = null
  try {
    const api = await import('@/api/trades')
    const calls = { accept: api.acceptTrade, decline: api.declineTrade, cancel: api.cancelTrade }
    await calls[action](tradeId)
    resolve(tradeId)
  } catch (e) {
    actionError.value = parseApiError(e, `Could not ${action} this trade.`).message
  } finally {
    actionBusy.value = null
  }
  if (action === 'accept') essenceStore.fetchBalance(true)
}

function selectSection(key: SectionKey) {
  sectionParam.value = key === 'incoming' ? '' : key
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
  <div class="trades-page" :style="{ '--page-accent': 'var(--accent-overall)' }">
    <Breadcrumbs :crumbs="breadcrumbs" />
    <PageHeaderBleed title="Trade Offers" />

    <EmptyState v-if="!authStore.isLoggedIn" message="Sign in to view your trade offers." />

    <div v-else class="trades-page__layout">
      <main class="trades-page__main">
        <BaseBanner v-if="actionError" variant="error" role="alert" @close="actionError = null">
          {{ actionError }}
        </BaseBanner>

        <template v-if="loading && trades.length === 0">
          <SkeletonLoader v-for="i in 4" :key="i" variant="card" height="96px" />
        </template>

        <EmptyState v-else-if="trades.length === 0" :message="section.emptyMessage" />

        <template v-else>
          <TradeOfferRow v-for="t in trades" :key="t.id" :trade="t" :perspective="section.direction"
            :busy="actionBusy === t.id" :spendable-balance="essenceStore.balance"
            @accept="runAction($event, 'accept')" @decline="runAction($event, 'decline')"
            @cancel="runAction($event, 'cancel')" />

          <PaginationControls v-if="totalPages > 1" :page="currentPage" :total-pages="totalPages"
            @update:page="setPage($event)" />
        </template>
      </main>

      <aside class="trades-page__sidebar">
        <BaseButton variant="primary" size="lg" href="/trade-offers/new">New Trade Offer</BaseButton>

        <nav class="trades-page__nav">
          <button v-for="(cfg, key) in SECTIONS" :key="key" class="trades-page__nav-btn"
            :class="{ 'trades-page__nav-btn--active': activeKey === key, 'trades-page__nav-btn--sub': cfg.sub }"
            @click="selectSection(key)">
            <span class="trades-page__nav-label">{{ cfg.label }}</span>
            <span v-if="key === 'incoming'" class="trades-page__nav-count">({{ tradeStore.pendingIncomingCount }} Pending)</span>
          </button>
        </nav>
      </aside>
    </div>
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

.trades-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: var(--space-xl);
  align-items: start;
}

.trades-page__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.trades-page__sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  position: sticky;
  top: calc(var(--navbar-height, 64px) + var(--space-md));
}

.trades-page__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  padding: var(--space-sm);
}

.trades-page__nav-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid transparent;
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-body);
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}

.trades-page__nav-btn:hover {
  background: var(--bg-elevated);
}

.trades-page__nav-btn--active {
  background: color-mix(in srgb, var(--page-accent) 12%, var(--bg-surface));
  border-color: color-mix(in srgb, var(--page-accent) 40%, transparent);
  color: var(--page-accent);
}

.trades-page__nav-btn--sub {
  padding-left: var(--space-lg);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.trades-page__nav-label {
  font-weight: 500;
}

.trades-page__nav-count {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.trades-page__nav-btn--active .trades-page__nav-count {
  color: var(--page-accent);
}

@media (max-width: 1023px) {
  .trades-page__layout {
    grid-template-columns: 1fr;
  }

  .trades-page__sidebar {
    position: static;
    flex-direction: column;
  }
}
</style>
