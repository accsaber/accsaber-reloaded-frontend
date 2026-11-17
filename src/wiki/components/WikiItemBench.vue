<script setup lang="ts">
import BaseTabs from '@/components/common/BaseTabs.vue'
import ChartToggleGroup from '@/components/common/ChartToggleGroup.vue'
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import '@/wiki/components/demo.css'
import type {
  ItemModifierRef,
  ItemModifierResponse,
  ItemResponse,
} from '@/types/api/items'
import { formatEssence } from '@/utils/essence'
import { asUserItem, displayItemName } from '@/utils/items'
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

const itemTabs = computed(() => props.items.map((i) => ({ key: i.id, label: i.name })))
const modifierToggles = computed(() =>
  props.modifiers
    .filter((m) => m.key !== 'founders')
    .map((m) => ({ key: m.key, label: m.name, color: m.colorHex })),
)

const activeModifiers = computed<ItemModifierRef[]>(() => {
  const chosen = props.modifiers
    .filter((m) => m.key !== 'founders' && activeKeys.value.includes(m.key))
    .map(toModifierRef)
  if (isFounders.value && foundersModifier.value) chosen.push(toModifierRef(foundersModifier.value))
  return chosen
})

const userItem = computed(() =>
  asUserItem(item.value, {
    linkId: `bench:${item.value.id}`,
    modifiers: activeModifiers.value,
    serialNumber: serial.value,
    source: 'crate_drop',
    awardedAt: item.value.createdAt,
  }),
)

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
  <figure class="wiki-demo bench">
    <div class="bench__stage">
      <div class="bench__cell">
        <InventoryItemCell :key="item.id" :user-item="userItem" @select="cycleItem" />
      </div>
      <span class="bench__name card-title">{{ fullName }}</span>
      <span class="caption bench__rarity" :class="`rarity--${item.rarity}`">{{ item.rarity }}</span>
    </div>

    <div class="bench__controls">
      <div class="wiki-demo__field">
        <span class="field-label">Item</span>
        <BaseTabs v-model="selectedId" variant="segmented" label="Item" :tabs="itemTabs" />
      </div>

      <div class="wiki-demo__field">
        <span class="field-label">Modifiers</span>
        <ChartToggleGroup label="Modifiers" :toggles="modifierToggles" :active="activeKeys" @select="toggleModifier" />
      </div>

      <label class="wiki-demo__field">
        <span class="field-label">Serial</span>
        <span class="bench__serial-body">
          <input v-model.number="serial" class="slider" type="range" min="1" :max="maxSerial" step="1" />
          <span class="bench__serial-value">#{{ serial }}</span>
        </span>
      </label>

      <dl class="bench__readout">
        <div class="wiki-demo__field">
          <dt class="field-label">Essence Value</dt>
          <dd v-if="item.worth != null">{{ formatEssence(item.worth) }}</dd>
          <dd v-else>nothing, this one is bound</dd>
        </div>
        <div class="wiki-demo__field">
          <dt class="field-label">Founder's</dt>
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
}

.bench__stage {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.bench__cell {
  width: 100%;
  padding: var(--space-md);
  border-radius: var(--radius-card);
  background: var(--bg-base);
}

.bench__name {
  margin-top: var(--space-sm);
  line-height: 1.3;
}

.bench__rarity {
  text-transform: capitalize;
  color: var(--rarity-color, var(--text-tertiary));
}

.bench__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.bench__controls :deep(.chart-toggles) {
  background: var(--bg-base);
}

.bench__serial-body {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.bench__serial-body .slider {
  flex: 1;
  min-width: 0;
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
}

.bench__readout dd {
  margin: 0;
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
</style>
