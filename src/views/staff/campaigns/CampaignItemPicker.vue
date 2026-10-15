<script setup lang="ts">
import { getItems } from '@/api/items'
import BaseModal from '@/components/common/BaseModal.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import { useItemSearch } from '@/composables/useItemSearch'
import { useItemTypeStore } from '@/stores/itemTypes'
import type { ItemResponse, UserItemResponse } from '@/types/api/items'
import { isItemObtainable, rarityClass } from '@/utils/items'
import ItemPickerGrid from '@/components/domain/ItemPickerGrid.vue'
import { computed, ref } from 'vue'

const props = defineProps<{ loading?: boolean; unrestricted?: boolean }>()

const emit = defineEmits<{
  close: []
  pick: [payload: { itemId: string; quantity: number }]
}>()

const itemTypeStore = useItemTypeStore()

const selectedItem = ref<ItemResponse | null>(null)
const quantity = ref(1)

async function loadItems() {
  if (props.unrestricted) return getItems()
  await itemTypeStore.fetchItemTypes()
  const crateTypeId = itemTypeStore.byKey.get('crate')?.id ?? null
  return getItems(crateTypeId ? { typeId: crateTypeId } : undefined)
}

const { pickable, fetching, error, search, page, totalPages, paged } = useItemSearch(
  loadItems,
  (i) => i.active && !i.deprecated && isItemObtainable(i) && (props.unrestricted || i.typeKey === 'crate'),
)

const noun = computed(() => (props.unrestricted ? 'items' : 'crates'))

const emptyMessage = computed(() =>
  pickable.value.length === 0
    ? `No ${noun.value} available`
    : `No ${noun.value} found`,
)

function selectItem(userItem: UserItemResponse) {
  selectedItem.value = userItem.item
  quantity.value = 1
}

function clearSelection() {
  selectedItem.value = null
  quantity.value = 1
}

function confirm() {
  const item = selectedItem.value
  if (!item) return
  const qty = Math.max(1, Math.floor(quantity.value || 1))
  emit('pick', { itemId: item.id, quantity: qty })
}
</script>

<template>
  <BaseModal :open="true" title="Add reward" @close="emit('close')">
    <div class="item-picker">
      <ItemPickerGrid
        v-if="!selectedItem"
        v-model:search="search"
        v-model:page="page"
        :items="paged"
        :loading="fetching"
        :total-pages="totalPages"
        :error="error"
        :empty-message="emptyMessage"
        :placeholder="`Search ${noun} by name`"
        @select="selectItem"
      />

      <template v-else>
        <div class="item-picker__selected">
          <span class="item-picker__selected-art" :class="rarityClass(selectedItem.rarity)">
            <ItemPreview :item="selectedItem" selected />
          </span>
          <div class="item-picker__selected-meta">
            <p class="item-picker__name">{{ selectedItem.name }}</p>
            <p class="item-picker__sub">
              <span class="item-picker__type">{{ itemTypeStore.typeLabel(selectedItem.typeKey) }}</span>
              <span class="item-picker__rarity" :class="rarityClass(selectedItem.rarity)">
                {{ selectedItem.rarity }}
              </span>
            </p>
          </div>
          <button type="button" class="item-picker__change" @click="clearSelection">
            Change
          </button>
        </div>

        <label class="item-picker__field">
          <span>Quantity</span>
          <input v-model.number="quantity" type="number" min="1" step="1" />
        </label>

        <div class="item-picker__actions">
          <button type="button" class="item-picker__cancel" @click="emit('close')">Cancel</button>
          <button type="button" class="item-picker__confirm" :disabled="loading || !selectedItem"
            @click="confirm">
            {{ loading ? 'Adding...' : 'Add reward' }}
          </button>
        </div>
      </template>
    </div>
  </BaseModal>
</template>

<style scoped>
.item-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: min(680px, 100%);
  min-height: 0;
}

.item-picker__name {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text-primary);
}

.item-picker__sub {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
}

.item-picker__type {
  text-transform: capitalize;
}

.item-picker__rarity {
  color: var(--rarity-color, var(--text-tertiary));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.item-picker__selected {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: var(--space-sm);
  align-items: center;
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--bg-overlay);
}

.item-picker__selected-art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  background: var(--bg-base);
  border: 1px solid var(--rarity-color, var(--text-tertiary));
  border-radius: var(--radius-card);
  overflow: hidden;
}

.item-picker__selected-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
}

.item-picker__change {
  padding: var(--space-xs) 10px;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.item-picker__change:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.item-picker__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.item-picker__field > span {
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.item-picker__field input[type="number"] {
  width: 100px;
  padding: var(--space-sm) 10px;
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-primary);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  outline: none;
  transition: border-color 120ms ease;
}

.item-picker__field input[type="number"]:focus {
  border-color: var(--page-accent, var(--accent));
}

.item-picker__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.item-picker__cancel,
.item-picker__confirm {
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: color 120ms ease, background 120ms ease, border-color 120ms ease;
}

.item-picker__cancel {
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
}

.item-picker__cancel:hover {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.item-picker__confirm {
  color: var(--bg-base);
  background: var(--page-accent, var(--accent));
  border: 1px solid var(--page-accent, var(--accent));
}

.item-picker__confirm:hover:not(:disabled) {
  background: color-mix(in srgb, var(--page-accent, var(--accent)) 88%, var(--text-primary));
}

.item-picker__confirm:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
