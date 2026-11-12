<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import EssenceAmount from '@/components/domain/EssenceAmount.vue'
import TradeOfferRowItem from '@/views/trades/TradeOfferRowItem.vue'
import UserChip from '@/components/domain/UserChip.vue'
import type { TradeResponse } from '@/types/api/trades'
import { formatEssenceAmount, formatEssenceNet } from '@/utils/essence'
import { formatRelativeDate } from '@/utils/formatters'
import { computed } from 'vue'

export type TradeAction = 'accept' | 'decline' | 'cancel'

const props = defineProps<{
  trade: TradeResponse
  perspective: 'incoming' | 'outgoing'
  busy?: TradeAction | null
  spendableBalance?: number | null
}>()

defineEmits<{
  act: [action: TradeAction]
}>()

const incoming = computed(() => props.perspective === 'incoming')
const pending = computed(() => props.trade.status === 'pending')
const counterpart = computed(() => (incoming.value ? props.trade.fromUser : props.trade.toUser))

const sides = computed(() => {
  const t = props.trade
  const offered = { items: t.offeredItems, essence: t.offeredEssence }
  const requested = { items: t.requestedItems, essence: t.requestedEssence }
  const [give, get] = incoming.value ? [requested, offered] : [offered, requested]
  return [{ label: 'You give', ...give }, { label: 'You get', ...get }]
})

const net = computed(() => sides.value[1].essence - sides.value[0].essence)
const essenceInvolved = computed(() => props.trade.offeredEssence > 0 || props.trade.requestedEssence > 0)
const shortfall = computed(() =>
  incoming.value && props.spendableBalance != null && props.trade.requestedEssence > props.spendableBalance,
)
</script>

<template>
  <article class="trade-row">
    <header class="trade-row__head">
      <UserChip :user="counterpart" link />
      <span class="caption">{{ formatRelativeDate(trade.createdAt) }}</span>
      <span v-if="!pending" class="trade-row__status" :class="`trade-row__status--${trade.status}`">
        {{ trade.status }}
      </span>
    </header>

    <p v-if="trade.message" class="trade-row__message">{{ trade.message }}</p>

    <div class="trade-row__sides">
      <section v-for="side in sides" :key="side.label" class="trade-row__side">
        <span class="field-label">{{ side.label }}</span>
        <EssenceAmount v-if="side.essence > 0" class="trade-row__essence" :amount="side.essence" />
        <div v-if="side.items.length" class="trade-row__items">
          <TradeOfferRowItem v-for="ref in side.items" :key="ref.linkId" :item-ref="ref" />
        </div>
        <span v-else-if="side.essence === 0" class="caption">Nothing</span>
      </section>
    </div>

    <footer v-if="pending" class="trade-row__foot">
      <span v-if="shortfall" class="caption trade-row__short">
        Costs {{ formatEssenceAmount(trade.requestedEssence) }} essence, you have
        {{ formatEssenceAmount(spendableBalance ?? 0) }}
      </span>
      <span v-else-if="essenceInvolved" class="caption">{{ formatEssenceNet(net) }}</span>
      <div class="trade-row__actions">
        <template v-if="incoming">
          <BaseButton :disabled="!!busy" :loading="busy === 'decline'" @click="$emit('act', 'decline')">
            Decline
          </BaseButton>
          <BaseButton variant="primary" :disabled="shortfall || !!busy" :loading="busy === 'accept'"
            @click="$emit('act', 'accept')">
            Accept
          </BaseButton>
        </template>
        <BaseButton v-else :loading="busy === 'cancel'" @click="$emit('act', 'cancel')">Cancel Offer</BaseButton>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.trade-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.trade-row__head {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.trade-row__status {
  margin-left: auto;
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.trade-row__status--accepted {
  color: var(--success);
}

.trade-row__message {
  max-width: 65ch;
  margin: 0;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.trade-row__sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-lg);
}

.trade-row__side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
}

.trade-row__essence {
  font-size: var(--text-stat-lg);
}

.trade-row__items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.trade-row__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-md);
}

.trade-row__short {
  color: var(--error);
}

.trade-row__actions {
  display: flex;
  gap: var(--space-sm);
}

@media (max-width: 640px) {
  .trade-row__sides {
    grid-template-columns: minmax(0, 1fr);
  }

  .trade-row__foot {
    flex-direction: column;
    align-items: stretch;
  }

  .trade-row__actions > * {
    flex: 1;
  }
}
</style>
