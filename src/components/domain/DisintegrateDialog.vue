<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import type { DisintegrateEntryRequest, UserItemResponse } from '@/types/api/items'
import { formatEssence } from '@/utils/essence'
import { displayItemName } from '@/utils/items'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  items: UserItemResponse[]
  busy?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  confirm: [entries: DisintegrateEntryRequest[]]
  remove: [linkId: string]
  cancel: []
}>()

const quantities = ref<Record<string, number>>({})

const rows = computed(() =>
  props.items.map((userItem) => {
    const owned = userItem.quantity ?? 1
    const quantity = Math.min(owned, Math.max(1, quantities.value[userItem.linkId] ?? owned))
    return {
      linkId: userItem.linkId,
      name: displayItemName(userItem.modifiers, userItem.item.name),
      owned,
      quantity,
      essence: (userItem.item.worth ?? 0) * quantity,
    }
  }),
)

const totalEssence = computed(() => rows.value.reduce((sum, row) => sum + row.essence, 0))
const totalUnits = computed(() => rows.value.reduce((sum, row) => sum + row.quantity, 0))

watch(
  () => props.open,
  (open) => {
    if (open) quantities.value = {}
  },
  { immediate: true },
)

function setQty(linkId: string, owned: number, next: number): void {
  if (!Number.isFinite(next)) return
  quantities.value = {
    ...quantities.value,
    [linkId]: Math.min(owned, Math.max(1, Math.round(next))),
  }
}

function onInput(linkId: string, owned: number, event: Event): void {
  setQty(linkId, owned, Number((event.target as HTMLInputElement).value))
}

function onConfirm(): void {
  if (props.busy || rows.value.length === 0) return
  emit(
    'confirm',
    rows.value.map((row) => ({ linkId: row.linkId, quantity: row.quantity })),
  )
}
</script>

<template>
  <BaseModal :open="open" title="Disintegrate" max-width="520px" @close="emit('cancel')">
    <div class="disintegrate">
      <p class="disintegrate__lead">
        <template v-if="rows.length === 1">
          Disintegrate <strong>{{ rows[0].name }}</strong
          >? This is permanent and cannot be undone.
        </template>
        <template v-else>
          Disintegrate <strong>{{ rows.length }} items</strong> ({{ totalUnits }} in total)? This is
          permanent and cannot be undone.
        </template>
      </p>

      <ul class="disintegrate__list">
        <li v-for="row in rows" :key="row.linkId" class="disintegrate__row">
          <span class="disintegrate__name">{{ row.name }}</span>

          <div v-if="row.owned > 1" class="disintegrate__stepper">
            <button
              type="button"
              class="disintegrate__step"
              aria-label="Decrease quantity"
              :disabled="busy || row.quantity <= 1"
              @click="setQty(row.linkId, row.owned, row.quantity - 1)"
            >
              &minus;
            </button>
            <input
              class="disintegrate__input"
              type="number"
              inputmode="numeric"
              :min="1"
              :max="row.owned"
              :value="row.quantity"
              :disabled="busy"
              :aria-label="`Quantity of ${row.name} to disintegrate`"
              @change="onInput(row.linkId, row.owned, $event)"
            />
            <button
              type="button"
              class="disintegrate__step"
              aria-label="Increase quantity"
              :disabled="busy || row.quantity >= row.owned"
              @click="setQty(row.linkId, row.owned, row.quantity + 1)"
            >
              +
            </button>
          </div>
          <span v-else class="disintegrate__qty-hint">x1</span>

          <span class="disintegrate__row-essence">+{{ formatEssence(row.essence) }}</span>

          <button
            v-if="rows.length > 1"
            type="button"
            class="disintegrate__remove"
            :disabled="busy"
            :aria-label="`Remove ${row.name} from the selection`"
            @click="emit('remove', row.linkId)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </li>
      </ul>

      <p v-if="error" class="disintegrate__error">
        {{ error }} Nothing was destroyed - adjust the selection and try again.
      </p>

      <p class="disintegrate__yield">
        You will receive <strong>{{ formatEssence(totalEssence) }}</strong> essence.
      </p>
    </div>

    <template #footer>
      <BaseButton size="md" :disabled="busy" @click="emit('cancel')">Cancel</BaseButton>
      <BaseButton
        variant="destructive"
        size="md"
        :loading="busy"
        :disabled="rows.length === 0"
        @click="onConfirm"
      >
        Disintegrate
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.disintegrate {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.disintegrate__lead {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
  line-height: 1.5;
}

.disintegrate__lead strong {
  color: var(--text-primary);
  font-weight: 600;
}

.disintegrate__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 320px;
  overflow-y: auto;
}

.disintegrate__row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.disintegrate__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-body);
  color: var(--text-primary);
}

.disintegrate__stepper {
  display: inline-flex;
  align-items: stretch;
  flex-shrink: 0;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  overflow: hidden;
}

.disintegrate__step {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 1rem;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.disintegrate__step:hover:not(:disabled) {
  background: var(--bg-elevated);
}

.disintegrate__step:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.disintegrate__input {
  width: 48px;
  padding: 2px 0;
  text-align: center;
  background: var(--bg-base);
  border: none;
  border-left: 1px solid var(--bg-overlay);
  border-right: 1px solid var(--bg-overlay);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-body);
}

.disintegrate__input:focus {
  outline: none;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--error) 30%, transparent);
}

.disintegrate__input::-webkit-inner-spin-button,
.disintegrate__input::-webkit-outer-spin-button {
  appearance: none;
  margin: 0;
}

.disintegrate__qty-hint {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-tertiary);
}

.disintegrate__row-essence {
  flex-shrink: 0;
  min-width: 64px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--tier-gold);
}

.disintegrate__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 2px;
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 120ms ease;
}

.disintegrate__remove:hover:not(:disabled) {
  color: var(--error);
}

.disintegrate__error {
  margin: 0;
  padding: var(--space-sm);
  background: color-mix(in srgb, var(--error) 12%, transparent);
  border: 1px solid var(--error);
  border-radius: var(--radius-card);
  color: var(--text-primary);
  font-size: var(--text-caption);
  line-height: 1.5;
}

.disintegrate__yield {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.disintegrate__yield strong {
  color: var(--tier-gold);
  font-weight: 600;
}
</style>
