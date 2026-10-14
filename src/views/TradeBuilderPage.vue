<script setup lang="ts">
import { parseApiError } from '@/api/client'
import { getUserInventory } from '@/api/items'
import { createTrade } from '@/api/trades'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeaderBleed from '@/components/common/PageHeaderBleed.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import TradeBuilderSlot from '@/components/domain/TradeBuilderSlot.vue'
import UserPicker from '@/components/domain/UserPicker.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useEssenceStore } from '@/stores/essence'
import type { UserItemResponse } from '@/types/api/items'
import { TRADE_MAX_ITEMS_PER_SIDE } from '@/types/api/trades'
import type { Page } from '@/types/pagination'
import { ESSENCE_GLYPH, formatEssenceAmount, formatEssenceNet } from '@/utils/essence'
import { digitsOnly } from '@/utils/formatters'
import { sanitizeEssenceInput } from '@/utils/market'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

usePageMeta({
  title: 'New Trade Offer | AccSaber',
})

const authStore = useAuthStore()
const essenceStore = useEssenceStore()
const route = useRoute()
const router = useRouter()

const PAGE_SIZE = 24

const breadcrumbs: Crumb[] = [
  { label: 'Market Hub', to: { name: 'market' } },
  { label: 'Trade Offers', to: { name: 'trade-offers' } },
  { label: 'New Offer' },
]

type Side = 'offered' | 'requested'

interface DraftEntry {
  linkId: string
  quantity: number
}

const recipientUserId = ref<string | null>((route.query.to as string) || null)
const recipientName = ref<string | null>(null)
const message = ref('')
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

const activeTab = ref<'mine' | 'theirs'>('mine')
const invPage = ref<Page<UserItemResponse> | null>(null)
const invLoading = ref(false)
const invCurrentPage = ref(1)
const search = ref('')
const debouncedSearch = useDebouncedRef(search, 250)

const draft = reactive<Record<Side, DraftEntry[]>>({ offered: [], requested: [] })
const essenceInput = reactive<Record<Side, string>>({ offered: '', requested: '' })
const itemCache = new Map<string, UserItemResponse>()

const isSelfRecipient = computed(() => !!recipientUserId.value && recipientUserId.value === authStore.userId)
const hasRecipient = computed(() => !!recipientUserId.value && !isSelfRecipient.value)

const essence = computed<Record<Side, number>>(() => ({
  offered: sanitizeEssenceInput(essenceInput.offered) ?? 0,
  requested: sanitizeEssenceInput(essenceInput.requested) ?? 0,
}))
const essenceNet = computed(() => essence.value.requested - essence.value.offered)
const insufficientEssence = computed(
  () => essenceStore.balance != null && essence.value.offered > essenceStore.balance,
)

const sides = computed(() => [
  { key: 'offered' as const, title: 'Your items', essenceLabel: 'essence you add' },
  {
    key: 'requested' as const,
    title: recipientName.value ? `${recipientName.value}'s items` : 'Their items',
    essenceLabel: 'essence you request',
  },
])

const draftIds = computed(() => new Set([...draft.offered, ...draft.requested].map((e) => e.linkId)))

const canSubmit = computed(
  () =>
    hasRecipient.value
    && (draft.offered.length > 0 || draft.requested.length > 0 || essence.value.offered > 0 || essence.value.requested > 0)
    && !insufficientEssence.value
    && !submitting.value,
)

const inventoryOwner = computed(() => (activeTab.value === 'mine' ? authStore.userId : recipientUserId.value))
const invItems = computed(() => invPage.value?.content ?? [])

let invRequest = 0

async function loadInventory() {
  const owner = inventoryOwner.value
  if (!owner || !authStore.isLoggedIn) return
  const id = ++invRequest
  invLoading.value = true
  try {
    const page = await getUserInventory(owner, {
      page: invCurrentPage.value - 1,
      size: PAGE_SIZE,
      sort: 'awardedAt,desc',
      tradeable: true,
      search: debouncedSearch.value.trim() || undefined,
    })
    if (id !== invRequest) return
    invPage.value = page
    for (const ui of page.content) itemCache.set(ui.linkId, ui)
  } catch {
    if (id === invRequest) invPage.value = null
  }
  if (id === invRequest) invLoading.value = false
}

function draftSlot(side: Side, index: number) {
  const entry = draft[side][index]
  const ui = entry && itemCache.get(entry.linkId)
  return ui ? { entry, userItem: { ...ui, quantity: entry.quantity }, stackMax: ui.quantity } : null
}

function addToDraft(ui: UserItemResponse) {
  if (ui.pendingTrade || draftIds.value.has(ui.linkId)) return
  const side: Side = activeTab.value === 'mine' ? 'offered' : 'requested'
  if (draft[side].length >= TRADE_MAX_ITEMS_PER_SIDE) return
  draft[side] = [...draft[side], { linkId: ui.linkId, quantity: 1 }]
}

function removeFromDraft(side: Side, linkId: string) {
  draft[side] = draft[side].filter((e) => e.linkId !== linkId)
}

function setQuantity(side: Side, linkId: string, value: number) {
  const max = itemCache.get(linkId)?.quantity ?? 1
  const quantity = Number.isFinite(value) ? Math.max(1, Math.min(max, Math.floor(value))) : 1
  draft[side] = draft[side].map((e) => (e.linkId === linkId ? { ...e, quantity } : e))
}

function toInputs(entries: DraftEntry[]) {
  return entries.map((e) => ({ userItemLinkId: e.linkId, quantity: e.quantity }))
}

async function submit() {
  if (!recipientUserId.value || !canSubmit.value) return
  submitting.value = true
  errorMsg.value = null
  try {
    await createTrade({
      toUserId: recipientUserId.value,
      offeredItems: toInputs(draft.offered),
      requestedItems: toInputs(draft.requested),
      offeredEssence: essence.value.offered,
      requestedEssence: essence.value.requested,
      message: message.value.trim() || undefined,
    })
    if (essence.value.offered > 0) essenceStore.fetchBalance(true)
    router.push({ name: 'trade-offers' })
  } catch (e) {
    const parsed = parseApiError(e, 'Failed to create trade')
    errorMsg.value = parsed.fieldErrors[0]?.message ?? parsed.message
  } finally {
    submitting.value = false
  }
}

watch(inventoryOwner, () => {
  search.value = ''
  invCurrentPage.value = 1
  invPage.value = null
})
watch(debouncedSearch, () => { invCurrentPage.value = 1 })
watch([inventoryOwner, invCurrentPage, debouncedSearch], loadInventory, { immediate: true })

watch(recipientUserId, () => {
  draft.requested = []
  recipientName.value = null
  if (!hasRecipient.value) activeTab.value = 'mine'
})

onMounted(() => {
  if (authStore.isLoggedIn) essenceStore.fetchBalance()
})
</script>

<template>
  <div class="trade-builder" :style="{ '--page-accent': 'var(--accent-overall)' }">
    <Breadcrumbs :crumbs="breadcrumbs" />
    <PageHeaderBleed title="New Trade Offer" />

    <EmptyState v-if="!authStore.isLoggedIn" message="Sign in to create a trade offer." />

    <template v-else>
      <section class="trade-builder__field">
        <label class="trade-builder__label">Send to</label>
        <UserPicker v-model="recipientUserId" placeholder="Search players by name..."
          @select="recipientName = $event?.userName ?? null" />
        <p v-if="isSelfRecipient" class="trade-builder__hint trade-builder__hint--warn">
          You can't send a trade offer to yourself.
        </p>
      </section>

      <div class="trade-builder__layout">
        <section class="trade-builder__inventory-panel">
          <div class="trade-builder__tabs" role="tablist">
            <button type="button" role="tab" class="trade-builder__tab"
              :class="{ 'trade-builder__tab--active': activeTab === 'mine' }" :aria-selected="activeTab === 'mine'"
              @click="activeTab = 'mine'">Your inventory</button>
            <button type="button" role="tab" class="trade-builder__tab"
              :class="{ 'trade-builder__tab--active': activeTab === 'theirs' }" :aria-selected="activeTab === 'theirs'"
              :disabled="!hasRecipient" @click="activeTab = 'theirs'">Their inventory</button>
          </div>

          <SearchBox :key="activeTab" v-model="search"
            :placeholder="activeTab === 'mine' ? 'Search your tradeable items...' : 'Search their tradeable items...'" />

          <div v-if="invLoading && !invPage" class="trade-builder__grid">
            <SkeletonLoader v-for="i in 12" :key="i" variant="card" />
          </div>

          <EmptyState v-else-if="invItems.length === 0"
            :message="activeTab === 'mine' ? 'No tradeable items in your inventory.' : `${recipientName ?? 'They'} has no tradeable items.`" />

          <div v-else class="trade-builder__grid">
            <div v-for="ui in invItems" :key="ui.linkId" class="trade-builder__inv-cell"
              :class="{ 'trade-builder__inv-cell--locked': ui.pendingTrade || draftIds.has(ui.linkId) }">
              <InventoryItemCell :user-item="ui" :selected="draftIds.has(ui.linkId)" @select="addToDraft(ui)" />
              <span v-if="ui.pendingTrade" class="trade-builder__lock-badge">In trade</span>
              <span v-else-if="draftIds.has(ui.linkId)" class="trade-builder__lock-badge">Added</span>
            </div>
          </div>

          <PaginationControls v-if="(invPage?.totalPages ?? 0) > 1" :page="invCurrentPage"
            :total-pages="invPage?.totalPages ?? 0" @update:page="invCurrentPage = $event" />
        </section>

        <aside class="trade-builder__offer-panel">
          <template v-for="side in sides" :key="side.key">
            <div v-if="side.key === 'requested'" class="trade-builder__swap" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </div>

            <section class="trade-builder__offer-side">
              <header class="trade-builder__offer-head">
                <span class="trade-builder__offer-title">{{ side.title }}</span>
                <span class="trade-builder__offer-count">{{ draft[side.key].length }} / {{ TRADE_MAX_ITEMS_PER_SIDE }}</span>
              </header>
              <div class="trade-builder__slots">
                <div v-for="i in TRADE_MAX_ITEMS_PER_SIDE" :key="i" class="trade-builder__slot">
                  <template v-for="slot in [draftSlot(side.key, i - 1)]" :key="slot?.entry.linkId ?? 'empty'">
                    <TradeBuilderSlot v-if="slot" :user-item="slot.userItem" :quantity="slot.entry.quantity"
                      :stack-max="slot.stackMax" :stackable="slot.userItem.item.stackable"
                      @remove="removeFromDraft(side.key, $event)"
                      @update:quantity="(linkId, value) => setQuantity(side.key, linkId, value)" />
                  </template>
                </div>
              </div>
              <div class="trade-builder__essence-row">
                <span class="trade-builder__essence-glyph" aria-hidden="true">{{ ESSENCE_GLYPH }}</span>
                <input class="trade-builder__essence-input" type="text" inputmode="numeric" placeholder="0"
                  :aria-label="side.essenceLabel" :value="essenceInput[side.key]"
                  @input="essenceInput[side.key] = digitsOnly(($event.target as HTMLInputElement).value)" />
                <span class="trade-builder__essence-label">{{ side.essenceLabel }}</span>
              </div>
              <p v-if="side.key === 'offered' && essenceStore.balance != null" class="trade-builder__hint"
                :class="{ 'trade-builder__hint--warn': insufficientEssence }">
                {{ formatEssenceAmount(essenceStore.balance) }} available ·
                {{ formatEssenceAmount(essenceStore.reserved ?? 0) }} reserved in offers
              </p>
            </section>
          </template>

          <BaseInput v-model="message" label="Message (optional)" />

          <p v-if="essence.offered > 0 || essence.requested > 0" class="trade-builder__net"
            :class="{ 'trade-builder__net--negative': essenceNet < 0 }">
            {{ formatEssenceNet(essenceNet) }}
          </p>

          <div v-if="errorMsg" class="trade-builder__error">{{ errorMsg }}</div>

          <BaseButton variant="primary" size="lg" :disabled="!canSubmit" :loading="submitting" @click="submit">
            Send Trade Offer
          </BaseButton>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.trade-builder {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
}

.trade-builder__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-width: 480px;
}

.trade-builder__label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}

.trade-builder__hint {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.trade-builder__hint--warn {
  color: var(--warning);
}

.trade-builder__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: var(--space-xl);
  align-items: start;
}

.trade-builder__inventory-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.trade-builder__tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--bg-overlay);
}

.trade-builder__tab {
  padding: var(--space-sm) var(--space-md);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.trade-builder__tab:hover:not(:disabled) {
  color: var(--text-primary);
}

.trade-builder__tab--active {
  color: var(--page-accent);
  border-bottom-color: var(--page-accent);
}

.trade-builder__tab:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.trade-builder__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: var(--space-sm);
}

.trade-builder__inv-cell {
  position: relative;
}

.trade-builder__inv-cell--locked {
  opacity: 0.45;
  cursor: not-allowed;
}

.trade-builder__inv-cell--locked :deep(.inventory-cell) {
  cursor: not-allowed;
}

.trade-builder__lock-badge {
  position: absolute;
  bottom: var(--space-xs);
  right: var(--space-xs);
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--warning);
  background: color-mix(in srgb, var(--bg-base) 85%, transparent);
  padding: 2px 6px;
  border-radius: var(--radius-btn);
  pointer-events: none;
  z-index: 2;
}

.trade-builder__offer-panel {
  position: sticky;
  top: calc(var(--navbar-height, 64px) + var(--space-md));
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.trade-builder__offer-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.trade-builder__offer-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.trade-builder__offer-title {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.trade-builder__offer-count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.trade-builder__slots {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-xs);
}

.trade-builder__slot {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--bg-base);
  border: 1px dashed var(--bg-overlay);
  border-radius: var(--radius-card);
}

.trade-builder__slot:has(> *) {
  border-style: solid;
  border-color: transparent;
}

.trade-builder__swap {
  display: flex;
  justify-content: center;
  color: var(--text-tertiary);
  transform: rotate(90deg);
}

.trade-builder__essence-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.trade-builder__essence-glyph {
  color: var(--tier-gold);
  font-size: var(--text-body);
  line-height: 1;
}

.trade-builder__essence-input {
  width: 96px;
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-body);
}

.trade-builder__essence-input:focus {
  outline: none;
  border-color: var(--page-accent);
}

.trade-builder__essence-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.trade-builder__net {
  margin: 0;
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--success);
}

.trade-builder__net--negative {
  color: var(--warning);
}

.trade-builder__error {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid color-mix(in srgb, var(--error) 30%, transparent);
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border-radius: var(--radius-card);
  color: var(--error);
  font-size: var(--text-caption);
}

@media (max-width: 1023px) {
  .trade-builder__layout {
    grid-template-columns: 1fr;
  }

  .trade-builder__offer-panel {
    position: static;
  }
}
</style>
