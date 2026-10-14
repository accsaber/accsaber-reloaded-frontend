<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { parseApiError } from '@/api/client'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useEssenceStore } from '@/stores/essence'
import { useInventoryStore } from '@/stores/inventory'
import type { UserItemResponse } from '@/types/api/items'
import type { CreateMarketListingRequest } from '@/types/api/market'
import { KOFI_URL } from '@/utils/constants'
import { displayItemName } from '@/utils/items'
import { digitsOnly } from '@/utils/formatters'
import {
  LISTING_DURATION_PRESETS,
  MAX_ACTIVE_LISTINGS,
  sanitizeEssenceInput,
} from '@/utils/market'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MarketItemPicker from './market/MarketItemPicker.vue'
import MarketWallet from './market/MarketWallet.vue'

usePageMeta({
  title: 'New Listing | Market | AccSaber',
  description: 'List an item from your inventory on the AccSaber market.',
})

const router = useRouter()
const authStore = useAuthStore()
const essenceStore = useEssenceStore()
const inventoryStore = useInventoryStore()

type ListingMode = 'auction' | 'shop' | 'auction_buyout'

const MODE_TOGGLES: { key: ListingMode; label: string }[] = [
  { key: 'auction', label: 'Auction' },
  { key: 'shop', label: 'Buy now' },
  { key: 'auction_buyout', label: 'Auction + buyout' },
]

const NO_LIMIT = 'none'

const pickerItems = ref<UserItemResponse[]>([])
const pickerLoading = ref(true)
const pickerPage = ref(1)
const pickerTotalPages = ref(0)
const pickerSearch = ref('')
let pickerRequestId = 0

const selected = ref<UserItemResponse | null>(null)
const mode = ref<ListingMode>('auction')
const title = ref('')
const description = ref('')
const quantityInput = ref('1')
const startingBidInput = ref('')
const buyoutInput = ref('')
const minIncrementInput = ref('1')
const durationMinutes = ref<number | null>(1440)

watch(mode, (next) => {
  if (next !== 'shop' && durationMinutes.value == null) durationMinutes.value = 1440
})

const submitting = ref(false)
const formError = ref<string | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const activeSellingCount = ref<number | null>(null)

const CAP_MESSAGE = `You already have ${MAX_ACTIVE_LISTINGS} active listings. Supporters get unlimited listings.`

const isSupporter = computed(() => authStore.authMe?.supporterTier != null)

const disabledLinkIds = computed(() => {
  const ids = new Set<string>()
  for (const equipped of Object.values(inventoryStore.equipped)) {
    if (equipped?.linkId) ids.add(equipped.linkId)
  }
  return ids
})

const ownedQuantity = computed(() => selected.value?.quantity ?? 1)
const stackable = computed(
  () => (selected.value?.item.stackable ?? false) && ownedQuantity.value > 1,
)
const quantity = computed(() => sanitizeEssenceInput(quantityInput.value) ?? 1)
const startingBid = computed(() => sanitizeEssenceInput(startingBidInput.value))
const buyoutPrice = computed(() => sanitizeEssenceInput(buyoutInput.value))
const minIncrement = computed(() => sanitizeEssenceInput(minIncrementInput.value) ?? 1)
const isAuctionMode = computed(() => mode.value !== 'shop')
const hasBuyout = computed(() => mode.value !== 'auction')
const slotsFull = computed(
  () =>
    !isSupporter.value &&
    activeSellingCount.value != null &&
    activeSellingCount.value >= MAX_ACTIVE_LISTINGS,
)

const showKofi = computed(
  () => slotsFull.value || /supporters get unlimited/i.test(formError.value ?? ''),
)

const durationToggles = computed(() => [
  ...LISTING_DURATION_PRESETS.map((p) => ({ key: String(p.minutes), label: p.label })),
  ...(mode.value === 'shop' ? [{ key: NO_LIMIT, label: '∞ No time limit' }] : []),
])

function setDuration(key: string) {
  durationMinutes.value = key === NO_LIMIT ? null : Number(key)
}

const selectedName = computed(() =>
  selected.value ? displayItemName(selected.value.modifiers, selected.value.item.name) : '',
)

async function fetchPickerItems() {
  const userId = authStore.userId
  if (!userId) return
  const id = ++pickerRequestId
  pickerLoading.value = true
  try {
    const { getUserInventory } = await import('@/api/items')
    const page = await getUserInventory(userId, {
      tradeable: true,
      search: pickerSearch.value.trim() || undefined,
      page: pickerPage.value - 1,
      size: 24,
    })
    if (id !== pickerRequestId) return
    pickerItems.value = page.content
    pickerTotalPages.value = page.totalPages
  } catch {
    if (id !== pickerRequestId) return
    pickerItems.value = []
    pickerTotalPages.value = 0
  }
  if (id === pickerRequestId) pickerLoading.value = false
}

async function fetchSlots() {
  const userId = authStore.userId
  if (!userId || isSupporter.value) return
  try {
    const { getMarketListings } = await import('@/api/market')
    const page = await getMarketListings({ sellerId: userId, status: 'active', size: 1 })
    activeSellingCount.value = page.totalElements
  } catch {
    activeSellingCount.value = null
  }
}

function onSelect(item: UserItemResponse) {
  selected.value = item
  quantityInput.value = '1'
  fieldErrors.value = {}
  formError.value = null
}

function validate(): boolean {
  const errors: Record<string, string> = {}
  if (!selected.value) errors.userItemLinkId = 'Pick an item to list.'
  if (!title.value.trim()) errors.title = 'Give your listing a title.'
  else if (title.value.trim().length > 100) errors.title = 'Titles are capped at 100 characters.'
  if (description.value.length > 1000)
    errors.description = 'Descriptions are capped at 1000 characters.'
  if (isAuctionMode.value && startingBid.value == null)
    errors.startingBid = 'Set a starting bid of at least 1.'
  if (hasBuyout.value && buyoutPrice.value == null)
    errors.buyoutPrice = 'Set a buyout price of at least 1.'
  if (
    mode.value === 'auction_buyout' &&
    startingBid.value != null &&
    buyoutPrice.value != null &&
    buyoutPrice.value < startingBid.value
  )
    errors.buyoutPrice = 'The buyout price cannot be below the starting bid.'
  if (stackable.value && (quantity.value < 1 || quantity.value > ownedQuantity.value))
    errors.quantity = `You own ${ownedQuantity.value} of this item.`
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submit() {
  if (submitting.value || slotsFull.value) return
  formError.value = null
  if (!validate() || !selected.value) return
  const request: CreateMarketListingRequest = {
    userItemLinkId: selected.value.linkId,
    quantity: stackable.value ? quantity.value : 1,
    title: title.value.trim(),
    description: description.value.trim() ? description.value.trim() : null,
    startingBid: isAuctionMode.value ? startingBid.value : null,
    buyoutPrice: hasBuyout.value ? buyoutPrice.value : null,
    minIncrement: isAuctionMode.value ? minIncrement.value : 1,
    durationMinutes: durationMinutes.value,
  }
  submitting.value = true
  try {
    const { createMarketListing } = await import('@/api/market')
    const listing = await createMarketListing(request)
    router.push({ name: 'market-listing', params: { listingId: listing.id } })
  } catch (e) {
    const parsed = parseApiError(e, 'Could not create the listing.')
    const errors: Record<string, string> = {}
    for (const fe of parsed.fieldErrors) errors[fe.field] = fe.message
    fieldErrors.value = errors
    if (parsed.fieldErrors.length === 0) formError.value = parsed.message
  } finally {
    submitting.value = false
  }
}

watch(
  () => authStore.isLoggedIn,
  (loggedIn) => {
    if (!loggedIn) return
    fetchPickerItems()
    fetchSlots()
    essenceStore.fetchBalance()
    if (authStore.userId) inventoryStore.fetchEquipped(authStore.userId)
  },
  { immediate: true },
)

watch(pickerSearch, () => {
  if (pickerPage.value === 1) fetchPickerItems()
  else pickerPage.value = 1
})
watch(pickerPage, fetchPickerItems)

const breadcrumbs: Crumb[] = [
  { label: 'Market Hub', to: { name: 'market' } },
  { label: 'New listing' },
]
</script>

<template>
  <div class="create-page" :style="{ '--page-accent': 'var(--accent-overall)' }">
    <Breadcrumbs :crumbs="breadcrumbs" />

    <div class="create-page__header">
      <div>
        <h1 class="create-page__title">New Listing</h1>
        <p v-if="isSupporter" class="create-page__subtitle">Unlimited listings</p>
        <p v-else-if="activeSellingCount != null" class="create-page__subtitle">
          {{ activeSellingCount }} / {{ MAX_ACTIVE_LISTINGS }} listings used
        </p>
      </div>
      <MarketWallet
        v-if="authStore.isLoggedIn && essenceStore.balance !== null"
        :balance="essenceStore.balance"
        :reserved="essenceStore.reserved ?? 0"
      />
    </div>

    <EmptyState v-if="!authStore.isLoggedIn" message="Sign in to list items on the market." />

    <div v-else class="create-page__layout">
      <section class="create-page__picker" aria-label="Choose an item">
        <h2 class="create-page__section-title">Choose an item</h2>
        <p v-if="fieldErrors.userItemLinkId" class="create-page__field-error">
          {{ fieldErrors.userItemLinkId }}
        </p>
        <MarketItemPicker
          :items="pickerItems"
          :loading="pickerLoading"
          :page="pickerPage"
          :total-pages="pickerTotalPages"
          :search="pickerSearch"
          :selected-link-id="selected?.linkId ?? null"
          :disabled-link-ids="disabledLinkIds"
          @update:search="pickerSearch = $event"
          @update:page="pickerPage = $event"
          @select="onSelect"
        />
      </section>

      <section class="create-page__form" aria-label="Listing details">
        <h2 class="create-page__section-title">Listing details</h2>

        <p v-if="selected" class="create-page__selected">
          Listing <strong>{{ selectedName }}</strong>
          <template v-if="stackable"> (you own {{ ownedQuantity }})</template>
        </p>
        <p v-else class="create-page__selected create-page__selected--empty">
          No item selected yet.
        </p>

        <BaseInput
          v-model="title"
          label="Title"
          placeholder="What are you selling?"
          maxlength="100"
          :error="fieldErrors.title"
        />

        <BaseTextarea
          v-model="description"
          label="Description"
          :rows="4"
          :maxlength="1000"
          placeholder="Optional details for buyers..."
          :error="fieldErrors.description"
        />

        <BaseInput
          v-if="stackable"
          :model-value="quantityInput"
          label="Quantity"
          inputmode="numeric"
          :error="fieldErrors.quantity"
          @update:model-value="quantityInput = digitsOnly($event)"
        />

        <div class="create-page__field">
          <span class="create-page__label">Sale type</span>
          <ChartToggleGroup :toggles="MODE_TOGGLES" :active="[mode]" label="Sale type"
            @select="mode = $event as ListingMode" />
        </div>

        <div class="create-page__prices">
          <BaseInput
            v-if="isAuctionMode"
            :model-value="startingBidInput"
            label="Starting bid"
            inputmode="numeric"
            placeholder="1"
            :error="fieldErrors.startingBid"
            @update:model-value="startingBidInput = digitsOnly($event)"
          />
          <BaseInput
            v-if="hasBuyout"
            :model-value="buyoutInput"
            label="Buyout price"
            inputmode="numeric"
            placeholder="1"
            :error="fieldErrors.buyoutPrice"
            @update:model-value="buyoutInput = digitsOnly($event)"
          />
          <BaseInput
            v-if="isAuctionMode"
            :model-value="minIncrementInput"
            label="Min raise"
            inputmode="numeric"
            placeholder="1"
            :error="fieldErrors.minIncrement"
            @update:model-value="minIncrementInput = digitsOnly($event)"
          />
        </div>

        <div class="create-page__field">
          <span class="create-page__label">Duration</span>
          <ChartToggleGroup :toggles="durationToggles" :active="[String(durationMinutes ?? NO_LIMIT)]"
            label="Duration" @select="setDuration" />
          <p v-if="fieldErrors.durationMinutes" class="create-page__field-error">
            {{ fieldErrors.durationMinutes }}
          </p>
        </div>

        <p v-if="slotsFull && !formError" class="create-page__field-error">{{ CAP_MESSAGE }}</p>
        <p v-if="formError" class="create-page__field-error" role="alert">{{ formError }}</p>
        <p v-if="showKofi" class="create-page__hint">
          <a class="create-page__kofi" :href="KOFI_URL" target="_blank" rel="noopener noreferrer">
            Support on Ko-fi
          </a>
        </p>

        <BaseButton
          variant="primary"
          size="lg"
          :disabled="!selected || slotsFull"
          :loading="submitting"
          @click="submit"
        >
          Create listing
        </BaseButton>
      </section>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

.create-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.create-page__title {
  font-size: var(--text-page-title);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.create-page__subtitle {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: var(--space-xs) 0 0;
}

.create-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: var(--space-xl);
  align-items: start;
}

.create-page__section-title {
  margin: 0 0 var(--space-md);
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.create-page__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  position: sticky;
  top: calc(var(--navbar-height, 64px) + var(--space-md));
}

.create-page__selected {
  margin: 0;
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.create-page__selected strong {
  color: var(--text-primary);
}

.create-page__selected--empty {
  color: var(--text-tertiary);
}

.create-page__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.create-page__label {
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.create-page__hint {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.create-page__prices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--space-sm);
}

.create-page__field-error {
  margin: 0;
  font-size: var(--text-caption);
  color: var(--error);
}

.create-page__kofi {
  color: var(--page-accent, var(--accent));
  text-decoration: none;
}

.create-page__kofi:hover {
  text-decoration: underline;
}

@media (max-width: 1023px) {
  .create-page__layout {
    grid-template-columns: 1fr;
  }

  .create-page__form {
    position: static;
  }
}
</style>
