<script setup lang="ts">
import { parseApiError } from '@/api/client'
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import Breadcrumbs, { type Crumb } from '@/components/common/Breadcrumbs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import UserPicker from '@/components/domain/UserPicker.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useAuthStore } from '@/stores/auth'
import { useEssenceStore } from '@/stores/essence'
import type { UserItemResponse } from '@/types/api/items'
import { TRADE_MAX_ITEMS_PER_SIDE } from '@/types/api/trades'
import { formatEssenceAmount, formatEssenceNet } from '@/utils/essence'
import { sanitizeEssenceInput } from '@/utils/market'
import TradeBuilderSide, { type DraftEntry } from '@/views/trades/TradeBuilderSide.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

usePageMeta({
  title: 'New Trade Offer | AccSaber',
})

const authStore = useAuthStore()
const essenceStore = useEssenceStore()
const route = useRoute()
const router = useRouter()

const breadcrumbs: Crumb[] = [
  { label: 'Market Hub', to: { name: 'market' } },
  { label: 'Trade Offers', to: { name: 'trade-offers' } },
  { label: 'New Offer' },
]

type Side = 'offered' | 'requested'

const recipientUserId = ref<string | null>((route.query.to as string) || null)
const recipientName = ref<string | null>(null)
const message = ref('')
const submitting = ref(false)
const errorMsg = ref<string | null>(null)

const draft = reactive<Record<Side, DraftEntry[]>>({ offered: [], requested: [] })
const essenceInput = reactive<Record<Side, string>>({ offered: '', requested: '' })
const itemCache = reactive(new Map<string, UserItemResponse>())

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

const canSubmit = computed(
  () =>
    hasRecipient.value
    && (draft.offered.length > 0 || draft.requested.length > 0 || essence.value.offered > 0 || essence.value.requested > 0)
    && !insufficientEssence.value
    && !submitting.value,
)

function toggle(side: Side, ui: UserItemResponse) {
  if (draft[side].some((e) => e.linkId === ui.linkId)) {
    draft[side] = draft[side].filter((e) => e.linkId !== ui.linkId)
  } else if (!ui.pendingTrade && draft[side].length < TRADE_MAX_ITEMS_PER_SIDE) {
    draft[side] = [...draft[side], { linkId: ui.linkId, quantity: 1 }]
  }
}

function setQuantity(side: Side, linkId: string, quantity: number) {
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
    const { createTrade } = await import('@/api/trades')
    await createTrade({
      toUserId: recipientUserId.value,
      offeredItems: toInputs(draft.offered),
      requestedItems: toInputs(draft.requested),
      offeredEssence: essence.value.offered,
      requestedEssence: essence.value.requested,
      message: message.value.trim() || undefined,
    })
    if (essence.value.offered > 0) essenceStore.fetchBalance(true)
    router.push({ name: 'trade-offers', query: { section: 'sent' } })
  } catch (e) {
    const parsed = parseApiError(e, 'Failed to create trade')
    errorMsg.value = parsed.fieldErrors[0]?.message ?? parsed.message
  } finally {
    submitting.value = false
  }
}

watch(recipientUserId, () => {
  draft.requested = []
  recipientName.value = null
})

onMounted(() => {
  if (authStore.isLoggedIn) essenceStore.fetchBalance()
})
</script>

<template>
  <div class="trade-builder">
    <Breadcrumbs :crumbs="breadcrumbs" />
    <h1>New Trade Offer</h1>

    <EmptyState v-if="!authStore.isLoggedIn" message="Log in to create a trade offer." />

    <template v-else>
      <div class="trade-builder__recipient">
        <label class="field-label">Send to</label>
        <UserPicker v-model="recipientUserId" @select="recipientName = $event?.userName ?? null" />
        <p v-if="isSelfRecipient" class="caption trade-builder__warn">You cannot send a trade offer to yourself.</p>
      </div>

      <div class="trade-builder__sides">
        <TradeBuilderSide v-model:essence="essenceInput.offered" title="You give" :owner-id="authStore.userId"
          :entries="draft.offered" :items="itemCache" essence-label="Essence you add" tray-hint="Click your items below to add them"
          empty-message="No tradeable items in your inventory." @toggle="toggle('offered', $event)"
          @quantity="(linkId, value) => setQuantity('offered', linkId, value)">
          <template v-if="essenceStore.balance != null" #essence-note>
            <span class="caption" :class="{ 'trade-builder__warn': insufficientEssence }">
              {{ formatEssenceAmount(essenceStore.balance) }} available,
              {{ formatEssenceAmount(essenceStore.reserved ?? 0) }} reserved in offers
            </span>
          </template>
        </TradeBuilderSide>

        <TradeBuilderSide v-model:essence="essenceInput.requested" title="You get"
          :owner-id="hasRecipient ? recipientUserId : null" :entries="draft.requested" :items="itemCache"
          essence-label="Essence you ask for" tray-hint="Click their items below to ask for them" :empty-message="`${recipientName ?? 'This player'} has no tradeable items.`"
          :idle-message="hasRecipient ? undefined : 'Pick a player to see their items.'"
          @toggle="toggle('requested', $event)"
          @quantity="(linkId, value) => setQuantity('requested', linkId, value)" />
      </div>

      <BaseBanner v-if="errorMsg" variant="error" role="alert" @close="errorMsg = null">{{ errorMsg }}</BaseBanner>

      <div class="trade-builder__send">
        <div class="trade-builder__message">
          <BaseInput v-model="message" label="Message" />
        </div>
        <span v-if="essence.offered > 0 || essence.requested > 0" class="caption">{{ formatEssenceNet(essenceNet) }}</span>
        <BaseButton variant="primary" :disabled="!canSubmit" :loading="submitting" @click="submit">
          Send Trade Offer
        </BaseButton>
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

.trade-builder__recipient {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  max-width: 480px;
}

.trade-builder__warn {
  color: var(--error);
}

.trade-builder__sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2xl);
}

.trade-builder__send {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-end;
  gap: var(--space-md);
}

.trade-builder__send > .caption {
  line-height: var(--control-h);
}

.trade-builder__message {
  flex: 1 1 320px;
}

@media (max-width: 1023px) {
  .trade-builder__sides {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
