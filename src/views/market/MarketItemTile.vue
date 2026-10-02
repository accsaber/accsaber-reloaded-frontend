<script setup lang="ts">
import BorderComposition from '@/components/domain/BorderComposition.vue'
import FragmentedItem from '@/components/cosmetics/effects/FragmentedItem.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import { useModifierColor } from '@/composables/useModifierColor'
import { useItemModifierStore } from '@/stores/itemModifiers'
import type { ItemModifierRef, ItemResponse, UserItemResponse } from '@/types/api/items'
import {
  buildEffectLayers,
  isBorderTypeKey,
  rarityClass,
  readBorderColorValue,
  readBorderShapeValue,
  readFragmentSpec,
  sortModifiersByKey,
  userItemTokenContext,
} from '@/utils/items'
import { computed, onMounted } from 'vue'

const props = defineProps<{
  userItem: UserItemResponse
  quantity?: number
  itemOverride?: ItemResponse | null
  composeBorders?: boolean
  avatarUrl?: string | null
}>()

const modifierStore = useItemModifierStore()

const item = computed(() => props.itemOverride ?? props.userItem.item)

const ownFx = computed(() => isBorderTypeKey(item.value.typeKey))
const composedView = computed(() => props.composeBorders === true && ownFx.value)

const shapeValue = computed(() =>
  composedView.value && item.value.typeKey === 'profile_border_shape'
    ? readBorderShapeValue(item.value.value)
    : null,
)

const colorValue = computed(() =>
  composedView.value && item.value.typeKey === 'profile_border_color'
    ? readBorderColorValue(item.value.value)
    : null,
)
const modifiers = computed<ItemModifierRef[]>(() => sortModifiersByKey(props.userItem.modifiers ?? []))
const effectLayers = computed(() =>
  buildEffectLayers(props.userItem.modifiers, props.userItem.unusualEffect),
)
const fragmentSpec = computed(() => (ownFx.value ? null : readFragmentSpec(props.userItem.unusualEffect)))
const overlayLayers = computed(() => (ownFx.value ? [] : effectLayers.value))
const tokenCtx = computed(() => userItemTokenContext(props.userItem))
const shownQuantity = computed(() => props.quantity ?? props.userItem.quantity ?? 1)

const { accent } = useModifierColor(modifiers)
const accentStyle = computed(() => (accent.value ? { '--cell-accent': accent.value } : undefined))

onMounted(() => {
  modifierStore.fetchModifiers()
})
</script>

<template>
  <div
    class="market-item-tile"
    :class="[rarityClass(item.rarity), { 'market-item-tile--title-fx': item.typeKey === 'title' }]"
    :style="accentStyle"
  >
    <span class="market-item-tile__art">
      <FragmentedItem v-if="fragmentSpec" :item="item" :spec="fragmentSpec" />
      <BorderComposition
        v-else-if="composedView"
        :shape="shapeValue"
        :color="colorValue"
        :avatar-url="avatarUrl"
        :effects="effectLayers"
        :context="tokenCtx"
        hide-stat-counters
      />
      <ItemPreview v-else :item="item" :effects="effectLayers" :context="tokenCtx" hide-stat-counters />
    </span>

    <ModifierCompositions
      v-for="layer in overlayLayers"
      :key="layer.key"
      :spec="layer.spec"
      :context="tokenCtx"
      :type-key="item.typeKey"
      measure-selector=".title-renderer, .item-preview > *"
      hide-stat-counters
    />

    <span v-if="userItem.serialNumber != null" class="market-item-tile__serial">#{{ userItem.serialNumber }}</span>
    <span v-if="shownQuantity > 1" class="market-item-tile__qty">x{{ shownQuantity }}</span>
  </div>
</template>

<style scoped>
.market-item-tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--bg-surface);
  border: 1px solid var(--cell-accent, var(--rarity-color));
  border-radius: var(--radius-card);
  overflow: hidden;
  container-type: inline-size;
  container-name: inv-cell;
  --rarity-color: var(--text-tertiary);
  --cell-accent: var(--rarity-color);
}

.market-item-tile.rarity--common { --rarity-color: var(--text-tertiary); }
.market-item-tile.rarity--uncommon { --rarity-color: var(--success); }
.market-item-tile.rarity--rare { --rarity-color: var(--info); }
.market-item-tile.rarity--epic { --rarity-color: var(--tier-apex); }
.market-item-tile.rarity--legendary { --rarity-color: var(--tier-gold); }
.market-item-tile.rarity--mythic { --rarity-color: var(--error); }

.market-item-tile__art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.market-item-tile--title-fx .market-item-tile__art {
  position: relative;
  z-index: 1;
}

.market-item-tile__serial {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  color: var(--text-tertiary);
}

.market-item-tile__qty {
  position: absolute;
  bottom: var(--space-xs);
  right: var(--space-xs);
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-base) 80%, transparent);
  border: 1px solid var(--cell-accent, var(--bg-overlay));
  border-radius: var(--radius-pill);
  line-height: 1;
}
</style>
