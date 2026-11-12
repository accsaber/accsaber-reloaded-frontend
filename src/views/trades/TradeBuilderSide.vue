<script setup lang="ts">
import BaseInput from '@/components/common/BaseInput.vue'
import ItemPickerGrid from '@/components/domain/ItemPickerGrid.vue'
import type { UserItemResponse } from '@/types/api/items'
import { TRADE_MAX_ITEMS_PER_SIDE } from '@/types/api/trades'
import { ESSENCE_GLYPH } from '@/utils/essence'
import { digitsOnly } from '@/utils/formatters'
import TradeBuilderSlot from '@/views/trades/TradeBuilderSlot.vue'
import { TRADE_INVENTORY_PAGE_SIZE, useTradeInventory } from '@/views/trades/useTradeInventory'
import { computed, toRef } from 'vue'

export interface DraftEntry {
  linkId: string
  quantity: number
}

const props = defineProps<{
  title: string
  ownerId: string | null
  entries: DraftEntry[]
  items: Map<string, UserItemResponse>
  essenceLabel: string
  emptyMessage: string
  idleMessage?: string
  trayHint: string
}>()

const essence = defineModel<string>('essence', { required: true })

const emit = defineEmits<{
  toggle: [userItem: UserItemResponse]
  quantity: [linkId: string, value: number]
}>()

const inventory = useTradeInventory(toRef(props, 'ownerId'), props.items)

const chosen = computed(() =>
  props.entries.flatMap((entry) => {
    const userItem = props.items.get(entry.linkId)
    return userItem ? [{ entry, userItem }] : []
  }),
)
const chosenIds = computed(() => new Set(props.entries.map((e) => e.linkId)))
const inTrade = computed(() => new Set(inventory.items.filter((ui) => ui.pendingTrade).map((ui) => ui.linkId)))
</script>

<template>
  <section class="trade-side">
    <header class="trade-side__head">
      <h2 class="section-title">{{ title }}</h2>
      <span class="caption">{{ entries.length }} of {{ TRADE_MAX_ITEMS_PER_SIDE }}</span>
    </header>

    <TransitionGroup tag="div" name="fade" class="trade-side__chosen">
      <TradeBuilderSlot v-for="{ entry, userItem } in chosen" :key="entry.linkId" :user-item="userItem"
        :quantity="entry.quantity" :stack-max="userItem.quantity" @remove="emit('toggle', userItem)"
        @update:quantity="emit('quantity', entry.linkId, $event)" />
      <div v-for="n in TRADE_MAX_ITEMS_PER_SIDE - chosen.length" :key="`free-${n}`" class="trade-side__free"
        aria-hidden="true" />
      <span v-if="chosen.length === 0" key="hint" class="caption trade-side__hint">{{ trayHint }}</span>
    </TransitionGroup>

    <div class="trade-side__essence">
      <span class="trade-side__glyph" aria-hidden="true">{{ ESSENCE_GLYPH }}</span>
      <BaseInput :model-value="essence" :label="essenceLabel" inputmode="numeric" placeholder="0"
        @update:model-value="essence = digitsOnly($event)" />
      <slot name="essence-note" />
    </div>

    <p v-if="idleMessage" class="caption trade-side__idle">{{ idleMessage }}</p>

    <ItemPickerGrid v-else v-model:search="inventory.search" v-model:page="inventory.page"
      :items="inventory.items" :loading="inventory.loading" :total-pages="inventory.totalPages"
      :checked-link-ids="chosenIds" :full="entries.length >= TRADE_MAX_ITEMS_PER_SIDE"
      :disabled-link-ids="inTrade" disabled-title="Already in another trade"
      :page-size="TRADE_INVENTORY_PAGE_SIZE" placeholder="Search items" :empty-message="emptyMessage"
      @select="emit('toggle', $event)" />
  </section>
</template>

<style scoped>
.trade-side {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.trade-side__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.trade-side__chosen {
  position: relative;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-base);
  border-radius: var(--radius-card);
}

.trade-side__free {
  aspect-ratio: 1 / 1;
}

.trade-side__hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}

.trade-side :deep(.item-picker) {
  --tile: 88px;
}

.trade-side__idle {
  flex: 1;
  display: grid;
  place-items: center;
  min-height: calc(var(--control-h) * 8);
}

.trade-side__chosen > .fade-leave-active {
  display: none;
}

.trade-side__glyph {
  position: absolute;
  bottom: 0;
  left: var(--space-md);
  color: var(--tier-gold);
  line-height: var(--control-h);
  pointer-events: none;
}

.trade-side__essence {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-sm);
}

.trade-side__essence :deep(.base-input) {
  width: 160px;
}

.trade-side__essence :deep(.base-input__field) {
  padding-left: calc(var(--space-md) * 2 + 0.5em);
}

@media (max-width: 767px) {
  .trade-side__chosen {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
