<script setup lang="ts">
import FragmentedItem from '@/components/cosmetics/effects/FragmentedItem.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import { useModifierColor } from '@/composables/useModifierColor'
import { useItemModifierStore } from '@/stores/itemModifiers'
import type { ItemModifierRef, UserItemResponse } from '@/types/api/items'
import { buildEffectLayers, readFragmentSpec } from '@/utils/cosmetics/effectLayers'
import {
  displayItemName,
  isBorderTypeKey,
  rarityClass,
  sortModifiersByKey,
  userItemTokenContext,
} from '@/utils/items'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  userItem: UserItemResponse
  selected?: boolean
  equipped?: boolean
  locked?: boolean
  highlighted?: boolean
  selectMode?: boolean
  checked?: boolean
  selectable?: boolean
}>()

const emit = defineEmits<{
  select: [linkId: string]
  toggle: [linkId: string]
}>()

function onClick() {
  if (props.selectMode) {
    if (props.selectable) emit('toggle', props.userItem.linkId)
    return
  }
  emit('select', props.userItem.linkId)
}

const modifierStore = useItemModifierStore()

const item = computed(() => props.userItem.item)
const modifiers = computed<ItemModifierRef[]>(() => sortModifiersByKey(props.userItem.modifiers ?? []))
const effectLayers = computed(() =>
  buildEffectLayers(props.userItem.modifiers, props.userItem.unusualEffect),
)
const ownFx = computed(() => isBorderTypeKey(item.value.typeKey))
const fragmentSpec = computed(() => (ownFx.value ? null : readFragmentSpec(props.userItem.unusualEffect)))
const overlayLayers = computed(() => (ownFx.value ? [] : effectLayers.value))
const tokenCtx = computed(() => userItemTokenContext(props.userItem))
const quantity = computed(() => props.userItem.quantity ?? 1)
const plain = computed(() => item.value.rarity === 'common' && modifiers.value.every((m) => m.key === 'normal'))

const { accent } = useModifierColor(modifiers)

const cellAccentStyle = computed(() => (accent.value ? { '--cell-accent': accent.value } : undefined))
const itemNameStyle = computed(() => (accent.value ? { color: accent.value } : undefined))
const fullItemName = computed(() => displayItemName(modifiers.value, item.value.name))

const justEquipped = ref(false)

watch(() => props.equipped, (now, was) => { justEquipped.value = !!now && !was })

onMounted(() => {
  modifierStore.fetchModifiers()
})
</script>

<template>
  <div class="inventory-cell-wrap">
    <button
      type="button"
      class="inventory-cell"
      :class="[
        rarityClass(item.rarity),
        {
          'inventory-cell--plain': plain,
          'inventory-cell--selected': selected,
          'inventory-cell--highlighted': highlighted,
          'inventory-cell--equipped': equipped,
          confirm: justEquipped,
          'inventory-cell--deprecated': item.deprecated,
          'inventory-cell--locked': locked,
          'inventory-cell--title-fx': item.typeKey === 'title' || item.typeKey === 'clan_title_effect',
          'inventory-cell--checked': selectMode && checked,
          'inventory-cell--unselectable': selectMode && !selectable,
        },
      ]"
      :style="cellAccentStyle"
      :aria-label="item.name"
      :aria-pressed="selectMode ? !!checked : selected"
      :disabled="selectMode && !selectable"
      @click="onClick"
      @animationend.self="justEquipped = false"
    >
      <span class="inventory-cell__art">
        <FragmentedItem v-if="fragmentSpec" :item="item" :spec="fragmentSpec" :selected="selected" />
        <ItemPreview
          v-else
          :item="item"
          :effects="effectLayers"
          :context="tokenCtx"
          :selected="selected"
          hide-stat-counters
        />
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

      <span v-if="selectMode && selectable" class="inventory-cell__check" aria-hidden="true">
        <svg v-if="checked" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>

      <svg v-if="equipped && !locked" class="inventory-cell__equipped" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
        role="img" aria-label="Equipped">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span v-if="!locked && quantity > 1" class="inventory-cell__qty">x{{ quantity }}</span>

      <span v-if="locked" class="inventory-cell__lock" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
    </button>

    <div class="inventory-cell-tooltip" role="tooltip" :style="cellAccentStyle">
      <span class="inventory-cell-tooltip__name" :style="itemNameStyle">{{ fullItemName }}</span>
      <p v-if="item.description" class="inventory-cell-tooltip__desc">{{ item.description }}</p>
      <span class="inventory-cell-tooltip__meta">
        <span class="inventory-cell-tooltip__rarity" :class="rarityClass(item.rarity)">{{ item.rarity }}</span>
        <template v-if="!locked && userItem.serialNumber != null"> · #{{ userItem.serialNumber }}</template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.inventory-cell-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  container-type: inline-size;
  container-name: inv-cell;
}

.inventory-cell-wrap:hover .inventory-cell-tooltip {
  opacity: 1;
  transform: translate(-50%, 0);
}

.inventory-cell-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translate(-50%, 4px);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 180px;
  max-width: 260px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-elevated);
  border: 1px solid var(--cell-accent, var(--bg-overlay));
  border-radius: var(--radius-card);
  pointer-events: none;
  opacity: 0;
  z-index: 30;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.inventory-cell-tooltip__name {
  font-family: var(--font-sans);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.inventory-cell-tooltip__desc {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: 1.4;
}

.inventory-cell-tooltip__meta {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.inventory-cell-tooltip__rarity {
  color: var(--rarity-color);
  text-transform: capitalize;
}

.inventory-cell {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
  background: var(--bg-surface);
  border: 1px solid var(--cell-accent, var(--rarity-color, var(--text-tertiary)));
  border-radius: var(--radius-card);
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out);
  --cell-accent: var(--rarity-color, var(--text-tertiary));
}

.inventory-cell--plain {
  border-color: transparent;
}

.inventory-cell:hover {
  background: var(--bg-elevated);
  transform: scale(1.02);
}

.inventory-cell--selected,
.inventory-cell--checked {
  background: var(--bg-elevated);
  border-color: var(--cell-accent);
  box-shadow: inset 0 0 0 1px var(--cell-accent);
}

.inventory-cell--unselectable {
  opacity: 0.35;
  cursor: not-allowed;
}

.inventory-cell--unselectable:hover {
  transform: none;
}

.inventory-cell__check {
  position: absolute;
  bottom: var(--space-xs);
  right: var(--space-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--bg-base);
  background: var(--bg-base);
  border: 1px solid var(--text-tertiary);
  border-radius: var(--radius-btn);
  pointer-events: none;
}

.inventory-cell--checked .inventory-cell__check {
  background: var(--cell-accent);
  border-color: var(--cell-accent);
}

.inventory-cell--highlighted {
  animation: inventory-cell-flash calc(var(--dur-enter) * 3) var(--ease-out) 2;
}

@keyframes inventory-cell-flash {
  0%,
  100% {
    border-color: var(--cell-accent);
  }
  40% {
    border-color: var(--text-primary);
  }
}

@media (prefers-reduced-motion: reduce) {
  .inventory-cell--highlighted {
    animation: none;
  }
}

.inventory-cell--deprecated {
  opacity: 0.55;
}

.inventory-cell--locked {
  opacity: 0.5;
}

.inventory-cell--locked .inventory-cell__art {
  filter: grayscale(0.6);
}

.inventory-cell__lock {
  position: absolute;
  bottom: var(--space-xs);
  left: var(--space-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
  pointer-events: none;
}

.inventory-cell__art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.inventory-cell--title-fx .inventory-cell__art {
  position: relative;
  z-index: 1;
}

.inventory-cell__equipped {
  position: absolute;
  top: var(--space-sm);
  left: var(--space-sm);
  color: var(--accent);
}

.inventory-cell__qty {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1;
  color: var(--text-primary);
  pointer-events: none;
}
</style>
