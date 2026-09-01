<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import type { ItemRarity } from '@/types/api/items'
import { RARITY_ORDER } from '@/utils/items'
import { sanitizeEssenceInput } from '@/utils/market'
import ItemEffectFilter, {
  type EffectCrateGroup,
  type EffectOption,
} from './ItemEffectFilter.vue'

export interface ItemFilterTypeOption {
  key: string
  label: string
}

export interface ItemFilterTypeGroup {
  label: string | null
  options: ItemFilterTypeOption[]
}

export interface ItemFilterModifierOption {
  key: string
  label: string
  colorHex: string | null
}

export interface ItemFilterCollectionOption {
  id: string
  label: string
  iconUrl: string | null
}

const props = withDefaults(
  defineProps<{
    rarities: ItemRarity[]
    typeKeys: string[]
    typeGroups: ItemFilterTypeGroup[]
    modifierKeys: string[]
    modifierOptions: ItemFilterModifierOption[]
    effectKeys?: string[]
    effectGroups?: EffectCrateGroup[]
    ungroupedEffects?: EffectOption[]
    collectionIds?: string[]
    collectionOptions?: ItemFilterCollectionOption[]
    showPrice?: boolean
    minPrice?: number | null
    maxPrice?: number | null
    hasActiveFilters: boolean
  }>(),
  {
    effectKeys: () => [],
    effectGroups: () => [],
    ungroupedEffects: () => [],
    collectionIds: () => [],
    collectionOptions: () => [],
    showPrice: false,
    minPrice: null,
    maxPrice: null,
  },
)

const emit = defineEmits<{
  'update:rarities': [value: ItemRarity[]]
  'update:typeKeys': [value: string[]]
  'update:modifierKeys': [value: string[]]
  'update:effectKeys': [value: string[]]
  'update:collectionIds': [value: string[]]
  'update:minPrice': [value: number | null]
  'update:maxPrice': [value: number | null]
  clear: []
}>()

function toggled(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
}

function toggleRarity(rarity: ItemRarity) {
  emit('update:rarities', toggled(props.rarities, rarity) as ItemRarity[])
}

function toggleType(key: string) {
  emit('update:typeKeys', toggled(props.typeKeys, key))
}

function toggleModifier(key: string) {
  emit('update:modifierKeys', toggled(props.modifierKeys, key))
}

function toggleEffect(key: string) {
  emit('update:effectKeys', toggled(props.effectKeys, key))
}

function toggleCollection(id: string) {
  emit('update:collectionIds', toggled(props.collectionIds, id))
}

function commitPrice(edge: 'min' | 'max', event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const value = raw.trim() === '' ? null : sanitizeEssenceInput(raw)
  if (edge === 'min') emit('update:minPrice', value)
  else emit('update:maxPrice', value)
}
</script>

<template>
  <div class="item-filters">
    <fieldset class="item-filters__group">
      <legend class="item-filters__legend">Rarity</legend>
      <label
        v-for="rarity in RARITY_ORDER"
        :key="rarity"
        class="item-filters__option"
        :class="`rarity--${rarity}`"
      >
        <input type="checkbox" :checked="rarities.includes(rarity)" @change="toggleRarity(rarity)" />
        <span class="item-filters__option-label">{{ rarity }}</span>
      </label>
    </fieldset>

    <fieldset v-if="typeGroups.length > 0" class="item-filters__group">
      <legend class="item-filters__legend">Item type</legend>
      <template v-for="(group, index) in typeGroups" :key="group.label ?? `flat-${index}`">
        <span v-if="group.label" class="item-filters__subhead">{{ group.label }}</span>
        <label
          v-for="option in group.options"
          :key="option.key"
          class="item-filters__option"
          :class="{ 'item-filters__option--nested': group.label }"
        >
          <input
            type="checkbox"
            :checked="typeKeys.includes(option.key)"
            @change="toggleType(option.key)"
          />
          <span class="item-filters__option-label item-filters__option-label--plain">
            {{ option.label }}
          </span>
        </label>
      </template>
    </fieldset>

    <fieldset v-if="modifierOptions.length > 0" class="item-filters__group">
      <legend class="item-filters__legend">Modifier</legend>
      <div class="item-filters__columns">
        <label v-for="option in modifierOptions" :key="option.key" class="item-filters__option">
          <input
            type="checkbox"
            :checked="modifierKeys.includes(option.key)"
            @change="toggleModifier(option.key)"
          />
          <span
            class="item-filters__option-label item-filters__option-label--plain"
            :style="option.colorHex ? { color: option.colorHex } : undefined"
          >
            {{ option.label }}
          </span>
        </label>
      </div>
    </fieldset>

    <fieldset
      v-if="effectGroups.length > 0 || ungroupedEffects.length > 0"
      class="item-filters__group"
    >
      <legend class="item-filters__legend">Unusual effect</legend>
      <ItemEffectFilter
        :groups="effectGroups"
        :ungrouped="ungroupedEffects"
        :selected="effectKeys"
        @toggle="toggleEffect"
      />
    </fieldset>

    <fieldset v-if="collectionOptions.length > 0" class="item-filters__group">
      <legend class="item-filters__legend">Collection</legend>
      <label v-for="option in collectionOptions" :key="option.id" class="item-filters__option">
        <input
          type="checkbox"
          :checked="collectionIds.includes(option.id)"
          @change="toggleCollection(option.id)"
        />
        <img
          v-if="option.iconUrl"
          class="item-filters__collection-icon"
          :src="option.iconUrl"
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span class="item-filters__option-label item-filters__option-label--plain">
          {{ option.label }}
        </span>
      </label>
    </fieldset>

    <fieldset v-if="showPrice" class="item-filters__group">
      <legend class="item-filters__legend">Price</legend>
      <div class="item-filters__price-row">
        <input
          class="item-filters__price-input"
          type="text"
          inputmode="numeric"
          placeholder="Min"
          aria-label="Minimum price"
          :value="minPrice ?? ''"
          @change="commitPrice('min', $event)"
        />
        <span class="item-filters__price-dash" aria-hidden="true">-</span>
        <input
          class="item-filters__price-input"
          type="text"
          inputmode="numeric"
          placeholder="Max"
          aria-label="Maximum price"
          :value="maxPrice ?? ''"
          @change="commitPrice('max', $event)"
        />
      </div>
    </fieldset>

    <BaseButton v-if="hasActiveFilters" size="sm" @click="emit('clear')">Clear filters</BaseButton>
  </div>
</template>

<style scoped>
.item-filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 260px;
  max-height: min(65vh, 560px);
  overflow-y: auto;
  padding-right: var(--space-xs);
}

.item-filters__columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs) var(--space-sm);
}

.item-filters__group {
  margin: 0;
  padding: 0;
  border: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.item-filters__legend {
  padding: 0;
  margin-bottom: var(--space-xs);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.item-filters__option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  font-size: var(--text-body);
}

.item-filters__option input {
  accent-color: var(--page-accent, var(--accent));
}

.item-filters__option-label {
  text-transform: capitalize;
  color: var(--rarity-color, var(--text-primary));
}

.item-filters__option-label--plain {
  color: var(--text-primary);
  text-transform: none;
}

.item-filters__collection-icon {
  width: 18px;
  height: 18px;
  margin-right: calc(var(--space-xs) - var(--space-sm));
  border-radius: var(--radius-btn);
  object-fit: contain;
  flex-shrink: 0;
}

.item-filters__subhead {
  margin-top: var(--space-xs);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.item-filters__option--nested {
  margin-left: var(--space-md);
}

.item-filters__option.rarity--common { --rarity-color: var(--text-secondary); }
.item-filters__option.rarity--uncommon { --rarity-color: var(--success); }
.item-filters__option.rarity--rare { --rarity-color: var(--info); }
.item-filters__option.rarity--epic { --rarity-color: var(--tier-apex); }
.item-filters__option.rarity--legendary { --rarity-color: var(--tier-gold); }
.item-filters__option.rarity--mythic { --rarity-color: var(--error); }

.item-filters__price-row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.item-filters__price-input {
  width: 0;
  flex: 1;
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--text-body);
}

.item-filters__price-input:focus {
  outline: none;
  border-color: var(--page-accent, var(--accent));
}

.item-filters__price-dash {
  color: var(--text-tertiary);
}
</style>
