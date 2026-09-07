<script setup lang="ts">
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import type {
  ItemModifierRef,
  ItemModifierResponse,
  ItemResponse,
  UserItemResponse,
} from '@/types/api/items'
import { formatEssence } from '@/utils/essence'
import { displayItemName } from '@/utils/items'
import { computed, ref } from 'vue'

const props = defineProps<{
  items: ItemResponse[]
  modifiers: ItemModifierResponse[]
  foundersSerial: number
  maxSerial: number
}>()

const selectedId = ref(props.items[0]?.id ?? '')
const activeKeys = ref<string[]>([])
const serial = ref(Math.min(12, props.maxSerial))

const item = computed(() => props.items.find((i) => i.id === selectedId.value) ?? props.items[0])
const foundersModifier = computed(() => props.modifiers.find((m) => m.key === 'founders') ?? null)
const isFounders = computed(() => serial.value <= props.foundersSerial)

function toModifierRef(modifier: ItemModifierResponse): ItemModifierRef {
  return {
    id: modifier.id,
    key: modifier.key,
    name: modifier.name,
    colorHex: modifier.colorHex,
    effectSpec: modifier.effectSpec,
  }
}

const toggleable = computed(() => props.modifiers.filter((m) => m.key !== 'founders'))

const activeModifiers = computed<ItemModifierRef[]>(() => {
  const chosen = toggleable.value.filter((m) => activeKeys.value.includes(m.key)).map(toModifierRef)
  if (isFounders.value && foundersModifier.value) chosen.push(toModifierRef(foundersModifier.value))
  return chosen
})

const userItem = computed<UserItemResponse>(() => ({
  linkId: `bench:${item.value.id}`,
  item: item.value,
  modifiers: activeModifiers.value,
  unusualEffect: null,
  serialNumber: serial.value,
  quantity: 1,
  source: 'crate_drop',
  sourceId: null,
  awardedByStaffId: null,
  reason: null,
  awardedAt: item.value.createdAt,
}))

const fullName = computed(() => displayItemName(activeModifiers.value, item.value.name))

function toggleModifier(key: string) {
  activeKeys.value = activeKeys.value.includes(key)
    ? activeKeys.value.filter((k) => k !== key)
    : [...activeKeys.value, key]
}

function cycleItem() {
  const at = props.items.findIndex((i) => i.id === selectedId.value)
  selectedId.value = props.items[(at + 1) % props.items.length].id
}
</script>

<template>
  <figure class="bench">
    <div class="bench__stage">
      <div class="bench__cell">
        <InventoryItemCell :user-item="userItem" @select="cycleItem" />
      </div>
      <span class="bench__name">{{ fullName }}</span>
      <span class="bench__rarity" :class="`rarity--${item.rarity}`">{{ item.rarity }}</span>
    </div>

    <div class="bench__controls">
      <div class="bench__group">
        <span class="bench__label" id="bench-items">Item</span>
        <div class="bench__row" role="group" aria-labelledby="bench-items">
          <button
            v-for="option in items"
            :key="option.id"
            type="button"
            class="bench__pick"
            :class="`rarity--${option.rarity}`"
            :aria-pressed="option.id === selectedId"
            @click="selectedId = option.id"
          >
            {{ option.name }}
          </button>
        </div>
      </div>

      <div class="bench__group">
        <span class="bench__label" id="bench-mods">Modifiers</span>
        <div class="bench__row" role="group" aria-labelledby="bench-mods">
          <button
            v-for="modifier in toggleable"
            :key="modifier.key"
            type="button"
            class="bench__chip"
            :style="{ '--chip': modifier.colorHex }"
            :aria-pressed="activeKeys.includes(modifier.key)"
            @click="toggleModifier(modifier.key)"
          >
            {{ modifier.name }}
          </button>
          <span
            v-if="isFounders && foundersModifier"
            class="bench__chip bench__chip--auto"
            :style="{ '--chip': foundersModifier.colorHex }"
          >
            {{ foundersModifier.name }}
          </span>
        </div>
      </div>

      <label class="bench__group bench__serial">
        <span class="bench__label">Serial</span>
        <span class="bench__serial-body">
          <input v-model.number="serial" type="range" min="1" :max="maxSerial" step="1" />
          <span class="bench__serial-value">#{{ serial }}</span>
        </span>
      </label>

      <dl class="bench__readout">
        <div>
          <dt>Rarity pays</dt>
          <dd v-if="item.worth != null">{{ formatEssence(item.worth) }}</dd>
          <dd v-else>nothing, this one is bound</dd>
        </div>
        <div>
          <dt>Founder's</dt>
          <dd>{{ isFounders ? `yes, serial ${serial}` : `no, past serial ${foundersSerial}` }}</dd>
        </div>
      </dl>
    </div>
  </figure>
</template>

<style scoped>
.bench {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--space-xl);
  align-items: start;
  margin: 0 0 var(--space-md);
  padding: var(--space-lg);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-surface);
}

.bench__stage {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bench__cell {
  width: 100%;
  padding: var(--space-md);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  background: var(--bg-base);
}

.bench__name {
  margin-top: var(--space-sm);
  font-size: var(--text-card-title);
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
}

.bench__rarity {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rarity-color, var(--text-tertiary));
}

.rarity--common { --rarity-color: var(--text-tertiary); }
.rarity--uncommon { --rarity-color: var(--success); }
.rarity--rare { --rarity-color: var(--info); }
.rarity--epic { --rarity-color: var(--tier-apex); }
.rarity--legendary { --rarity-color: var(--tier-gold); }
.rarity--mythic { --rarity-color: var(--error); }

.bench__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.bench__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.bench__label {
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.bench__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.bench__pick,
.bench__chip {
  padding: 5px 10px;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-pill);
  background: var(--bg-elevated);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 500;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.bench__pick:hover,
.bench__chip:hover {
  color: var(--text-primary);
}

.bench__pick[aria-pressed='true'] {
  border-color: var(--rarity-color);
  color: var(--rarity-color);
}

.bench__chip[aria-pressed='true'],
.bench__chip--auto {
  border-color: var(--chip);
  color: var(--chip);
}

.bench__chip--auto {
  cursor: default;
  opacity: 0.8;
}

.bench__serial-body {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.bench__serial input {
  flex: 1;
  min-width: 0;
  accent-color: var(--accent);
}

.bench__serial-value {
  min-width: 4ch;
  font-family: var(--font-mono);
  font-size: var(--text-stat-inline);
  font-weight: 500;
  color: var(--text-primary);
}

.bench__readout {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xl);
  margin: 0;
  padding-top: var(--space-md);
  border-top: 1px solid var(--bg-overlay);
}

.bench__readout dt {
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.bench__readout dd {
  margin: 2px 0 0;
  font-family: var(--font-mono);
  font-size: var(--text-stat-inline);
  color: var(--text-primary);
}

@media (max-width: 640px) {
  .bench {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
  }

  .bench__cell {
    max-width: 180px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bench__pick,
  .bench__chip {
    transition: none;
  }
}
</style>
