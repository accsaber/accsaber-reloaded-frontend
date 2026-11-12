<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import HintTooltip from '@/components/common/HintTooltip.vue'
import type { MarketListingResponse } from '@/types/api/market'
import { formatEssence } from '@/utils/essence'
import { digitsOnly } from '@/utils/formatters'
import { isAuction, isSameMarketUser, sanitizeEssenceInput } from '@/utils/market'
import { computed, ref, useId, watch } from 'vue'
import EssenceAmount from '@/components/domain/EssenceAmount.vue'

const props = defineProps<{
  listing: MarketListingResponse
  viewerId: string | null
  loggedIn: boolean
  balance: number | null
  reserved: number | null
  busy: boolean
  amountError: string | null
  formError: string | null
}>()

const emit = defineEmits<{
  bid: [amount: number]
  buy: []
}>()

const inputId = useId()
const amount = ref('')
const armedBid = ref(false)
const armedBuy = ref(false)

const auction = computed(() => isAuction(props.listing))
const buyout = computed(() => props.listing.buyoutPrice)
const amountNumber = computed(() => sanitizeEssenceInput(amount.value))
const minimumBid = computed(() => props.listing.minimumNextBid ?? props.listing.startingBid ?? 1)

const willBuyout = computed(
  () => buyout.value != null && amountNumber.value != null && amountNumber.value >= buyout.value,
)

const disabledReason = computed(() => {
  if (!props.loggedIn) return 'Log in to bid or buy on the market.'
  if (isSameMarketUser(props.listing.seller, props.viewerId)) return 'This is your listing.'
  if (isSameMarketUser(props.listing.currentBidder, props.viewerId))
    return "You're the highest bidder."
  return null
})

const bidLocked = computed(() => disabledReason.value !== null)
const actionSlot = computed(() => (disabledReason.value ? 'trigger' : 'default'))
const buyLocked = computed(() => !props.loggedIn || isSameMarketUser(props.listing.seller, props.viewerId))
const buyReason = computed(() => (buyLocked.value ? disabledReason.value : null))
const buySlot = computed(() => (buyReason.value ? 'trigger' : 'default'))

const overBalance = computed(
  () =>
    !bidLocked.value &&
    amountNumber.value != null &&
    props.balance != null &&
    amountNumber.value > props.balance,
)

const bidButtonLabel = computed(() => {
  if (armedBid.value && buyout.value != null) return `Confirm buyout · ${formatEssence(buyout.value)}`
  return 'Place bid'
})

const buyButtonLabel = computed(() => {
  if (buyout.value == null) return ''
  return armedBuy.value
    ? `Confirm · ${formatEssence(buyout.value)}`
    : `Buy now · ${formatEssence(buyout.value)}`
})

watch(
  () => props.listing.minimumNextBid,
  (next) => {
    if (next == null) return
    const current = amountNumber.value
    if (current == null || current < next) amount.value = String(next)
  },
  { immediate: true },
)

watch([amount, () => props.listing.id], () => {
  armedBid.value = false
  armedBuy.value = false
})

function onAmountInput(value: string | number) {
  amount.value = digitsOnly(value)
}

function submitBid() {
  const value = amountNumber.value
  if (bidLocked.value || props.busy || value == null) return
  if (willBuyout.value && !armedBid.value) {
    armedBid.value = true
    return
  }
  armedBid.value = false
  emit('bid', value)
}

function submitBuy() {
  if (buyLocked.value || props.busy) return
  if (!armedBuy.value) {
    armedBuy.value = true
    return
  }
  armedBuy.value = false
  emit('buy')
}
</script>

<template>
  <div class="bid-panel">
    <div v-if="auction" class="bid-panel__label">
      <label class="field-label" :for="inputId">Your bid</label>
      <span class="caption">Minimum <EssenceAmount :amount="minimumBid" /></span>
    </div>

    <div class="bid-panel__row">
      <BaseInput
        v-if="auction"
        :id="inputId"
        :model-value="amount"
        inputmode="numeric"
        autocomplete="off"
        :disabled="bidLocked || busy"
        :error="amountError ?? undefined"
        @update:model-value="onAmountInput"
        @keydown.enter="submitBid"
      />
      <component :is="disabledReason ? HintTooltip : 'div'" v-if="auction" class="bid-panel__action"
        v-bind="disabledReason ? { text: disabledReason, variant: 'bare', as: 'span' } : {}">
        <template #[actionSlot]>
          <BaseButton variant="primary" :disabled="bidLocked || amountNumber == null" :loading="busy"
            @click="submitBid">
            {{ bidButtonLabel }}
          </BaseButton>
        </template>
      </component>
      <component :is="buyReason ? HintTooltip : 'div'" v-if="buyout != null" class="bid-panel__action"
        v-bind="buyReason ? { text: buyReason, variant: 'bare', as: 'span' } : {}">
        <template #[buySlot]>
          <BaseButton :variant="auction ? 'default' : 'primary'" :disabled="buyLocked" :loading="busy"
            @click="submitBuy">
            {{ buyButtonLabel }}
          </BaseButton>
        </template>
      </component>
    </div>

    <p v-if="willBuyout && !bidLocked && buyout != null" class="caption bid-panel__warning" role="alert">
      Buys it now for <EssenceAmount :amount="buyout" />
    </p>
    <p v-else-if="overBalance" class="caption bid-panel__warning">That's more than your available balance.</p>

    <p v-if="formError" class="caption bid-panel__error" role="alert">{{ formError }}</p>

    <p v-if="loggedIn && balance != null" class="caption">
      Balance <EssenceAmount :amount="balance" />
      <template v-if="(reserved ?? 0) > 0">
        with <EssenceAmount :amount="reserved ?? 0" /> held in bids
      </template>
    </p>
  </div>
</template>

<style scoped>
.bid-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.bid-panel__label {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
}

.bid-panel__row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-sm);
}

.bid-panel__row :deep(.base-input) {
  flex: 0 1 180px;
  min-width: 0;
}

.bid-panel__action {
  display: inline-flex;
}

.bid-panel__action :deep(.base-button:disabled) {
  pointer-events: none;
}

span.bid-panel__action {
  cursor: not-allowed;
}

.bid-panel__warning {
  color: var(--warning);
}

.bid-panel__error {
  color: var(--error);
}
</style>
