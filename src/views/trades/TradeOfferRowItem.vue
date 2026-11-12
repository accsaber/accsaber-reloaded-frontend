<script setup lang="ts">
import HintTooltip from '@/components/common/HintTooltip.vue'
import FragmentedItem from '@/components/cosmetics/effects/FragmentedItem.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import { useModifierColor } from '@/composables/useModifierColor'
import type { ItemModifierRef } from '@/types/api/items'
import type { TradeItemRef } from '@/types/api/trades'
import { buildEffectLayers, readFragmentSpec } from '@/utils/cosmetics/effectLayers'
import { displayItemName, isBorderTypeKey, rarityClass, sortModifiersByKey } from '@/utils/items'
import { computed } from 'vue'

const props = defineProps<{
  itemRef: TradeItemRef
}>()

const sortedModifiers = computed<ItemModifierRef[]>(() => sortModifiersByKey(props.itemRef.modifiers ?? []))
const effectLayers = computed(() =>
  buildEffectLayers(props.itemRef.modifiers, props.itemRef.unusualEffect),
)
const ownFx = computed(() => isBorderTypeKey(props.itemRef.item.typeKey))
const fragmentSpec = computed(() => (ownFx.value ? null : readFragmentSpec(props.itemRef.unusualEffect)))
const overlayLayers = computed(() => (ownFx.value ? [] : effectLayers.value))
const tokenCtx = computed(() => ({ serial: props.itemRef.serialNumber }))
const quantity = computed(() => props.itemRef.quantity ?? 1)
const name = computed(() => displayItemName(props.itemRef.modifiers, props.itemRef.item.name))

const { accent } = useModifierColor(sortedModifiers)
const accentStyle = computed(() => (accent.value ? { '--cell-accent': accent.value } : undefined))
</script>

<template>
  <HintTooltip :text="name" variant="bare" :width="280">
    <template #trigger>
      <span class="trade-row-item" :class="rarityClass(itemRef.item.rarity)" :style="accentStyle">
        <FragmentedItem v-if="fragmentSpec" :item="itemRef.item" :spec="fragmentSpec" />
        <ItemPreview v-else :item="itemRef.item" :effects="effectLayers" :context="tokenCtx" :selected="false" />
        <ModifierCompositions
          v-for="layer in overlayLayers"
          :key="layer.key"
          :spec="layer.spec"
          :context="tokenCtx"
          :type-key="itemRef.item.typeKey"
          measure-selector=".title-renderer, .item-preview > *"
        />
        <span v-if="itemRef.serialNumber != null" class="trade-row-item__mark trade-row-item__mark--serial">
          #{{ itemRef.serialNumber }}
        </span>
        <span v-if="quantity > 1" class="trade-row-item__mark trade-row-item__mark--qty">x{{ quantity }}</span>
      </span>
    </template>
    <span class="trade-row-item__name">{{ name }}</span>
    <span v-if="itemRef.item.description" class="trade-row-item__line">{{ itemRef.item.description }}</span>
    <span class="trade-row-item__line trade-row-item__rarity" :class="rarityClass(itemRef.item.rarity)">
      {{ itemRef.item.rarity }}
    </span>
  </HintTooltip>
</template>

<style scoped>
.trade-row-item {
  --cell-accent: var(--rarity-color);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: var(--bg-base);
  border: 1px solid var(--cell-accent);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.trade-row-item__mark {
  position: absolute;
  right: var(--space-xs);
  font-size: 0.625rem;
  line-height: 1;
}

.trade-row-item__mark--serial {
  top: var(--space-xs);
  color: var(--text-tertiary);
}

.trade-row-item__mark--qty {
  bottom: var(--space-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.trade-row-item__name,
.trade-row-item__line {
  display: block;
  text-align: left;
}

.trade-row-item__name {
  font-size: var(--text-body);
  font-weight: 600;
}

.trade-row-item__line {
  color: var(--text-secondary);
}

.trade-row-item__rarity {
  color: var(--rarity-color);
  text-transform: capitalize;
}
</style>
