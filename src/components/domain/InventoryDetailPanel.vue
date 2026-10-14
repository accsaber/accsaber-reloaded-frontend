<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import BorderComposition from '@/components/domain/BorderComposition.vue'
import CrateContentsList from '@/components/domain/CrateContentsList.vue'
import CrateModifierList from '@/components/domain/CrateModifierList.vue'
import CratePreviewModal from '@/components/domain/CratePreviewModal.vue'
import FragmentedItem from '@/components/cosmetics/effects/FragmentedItem.vue'
import ItemPreview from '@/components/domain/ItemPreview.vue'
import ModifierChip from '@/components/domain/ModifierChip.vue'
import ModifierCompositions from '@/components/cosmetics/effects/ModifierCompositions.vue'
import { useModifierColor } from '@/composables/useModifierColor'
import { useItemTypeStore } from '@/stores/itemTypes'
import { useThemeStore } from '@/stores/theme'
import type { BorderColorValue, BorderShapeValue, CrateContentResponse, CrateModifierResponse, ItemModifierRef, ItemResponse, ItemVariant, UnusualEffectResponse, UserItemResponse } from '@/types/api/items'
import { formatEssence } from '@/utils/essence'
import { formatRelativeDate } from '@/utils/formatters'
import {
  buildEffectLayers,
  displayItemName,
  isBorderTypeKey,
  isEquippableTypeKey,
  rarityClass,
  readBorderColorValue,
  readBorderShapeValue,
  obtainableUntilSentence,
  readFragmentSpec,
  readItemVariants,
  readThemeValue,
  resolveItemVariant,
  sortModifiersByKey,
  userItemTokenContext,
} from '@/utils/items'
import { computed, ref } from 'vue'

const props = defineProps<{
  userItem: UserItemResponse | null
  canManage: boolean
  canUnequip?: boolean
  sourceLabel?: string
  equipped: boolean
  equippedVariantKey?: string | null
  busy?: boolean
  locked?: boolean
  downloading?: boolean
  crateContents?: CrateContentResponse[]
  crateContentsLoading?: boolean
  crateModifiers?: CrateModifierResponse[]
  crateModifiersLoading?: boolean
  crateEffects?: UnusualEffectResponse[]
  crateEffectsLoading?: boolean
  ownedItemIds?: Set<string>
  equippedBorderShape?: BorderShapeValue | null
  equippedBorderColor?: BorderColorValue | null
  avatarUrl?: string | null
}>()

const emit = defineEmits<{
  equip: [linkId: string]
  unequip: [typeKey: string]
  disintegrate: [linkId: string]
  download: [linkId: string]
  openCrate: [linkId: string]
  applyThemeMode: [linkId: string, alt: boolean]
  selectVariant: [linkId: string, variantKey: string]
  loadCrateEffects: []
  previewCrate: [crate: ItemResponse]
}>()

const itemTypeStore = useItemTypeStore()
const themeStore = useThemeStore()

const item = computed(() => props.userItem?.item ?? null)
const isCrate = computed(() => item.value?.typeKey === 'crate')

const themeValue = computed(() =>
  item.value?.typeKey === 'theme' ? readThemeValue(item.value.value) : null,
)
const themeModes = computed(() => {
  const tv = themeValue.value
  if (!tv?.altTokens) return null
  const label = (t: Record<string, string>) => (t.base === 'light' ? 'Light' : 'Dark')
  return [
    { alt: false, label: label(tv.tokens) },
    { alt: true, label: label(tv.altTokens) },
  ]
})
const activeThemeMode = computed<boolean | null>(() => {
  const tv = themeValue.value
  if (!tv?.altTokens || !props.equipped || !themeStore.activeTokens) return null
  const active = JSON.stringify(themeStore.activeTokens)
  if (active === JSON.stringify(tv.altTokens)) return true
  if (active === JSON.stringify(tv.tokens)) return false
  return null
})
const itemVariants = computed<ItemVariant[] | null>(() =>
  item.value ? readItemVariants(item.value.value) : null,
)
const activeVariantKey = computed<string | null>(() => {
  if (!itemVariants.value || !props.equipped) return null
  return props.equippedVariantKey ?? itemVariants.value[0]?.key ?? null
})
const previewItem = computed<ItemResponse | null>(() => {
  const it = item.value
  if (!it || !itemVariants.value) return it
  const key = activeVariantKey.value ?? itemVariants.value[0]?.key
  if (!key) return it
  return {
    ...it,
    value: resolveItemVariant(it.value as { variants?: ItemVariant[] }, key) as ItemResponse['value'],
  }
})

const isBorderShapeItem = computed(() => item.value?.typeKey === 'profile_border_shape')
const isBorderColorItem = computed(() => item.value?.typeKey === 'profile_border_color')

const selectedShapeValue = computed<BorderShapeValue | null>(() =>
  isBorderShapeItem.value && previewItem.value ? readBorderShapeValue(previewItem.value.value) : null,
)
const selectedColorValue = computed<BorderColorValue | null>(() =>
  isBorderColorItem.value && previewItem.value ? readBorderColorValue(previewItem.value.value) : null,
)

const compositionShape = computed<BorderShapeValue | null>(() =>
  isBorderShapeItem.value ? selectedShapeValue.value : (props.equippedBorderShape ?? null),
)
const compositionColor = computed<BorderColorValue | null>(() =>
  isBorderColorItem.value ? selectedColorValue.value : (props.equippedBorderColor ?? null),
)

const showComposition = computed(() =>
  props.canManage && (isBorderShapeItem.value || isBorderColorItem.value),
)

const modifiers = computed<ItemModifierRef[]>(() =>
  sortModifiersByKey(props.userItem?.modifiers ?? []),
)
const unusualEffect = computed(() => props.userItem?.unusualEffect ?? null)
const effectLayers = computed(() =>
  buildEffectLayers(props.userItem?.modifiers, props.userItem?.unusualEffect),
)
const ownFx = computed(() => isBorderTypeKey(item.value?.typeKey))
const fragmentSpec = computed(() => (ownFx.value ? null : readFragmentSpec(props.userItem?.unusualEffect)))
const overlayLayers = computed(() => (ownFx.value ? [] : effectLayers.value))
const tokenCtx = computed(() => props.userItem ? userItemTokenContext(props.userItem) : {})
const quantity = computed(() => props.userItem?.quantity ?? 1)
const pbCount = computed(() => props.userItem?.counters?.play_count ?? null)

const { accent } = useModifierColor(modifiers)

const itemNameStyle = computed(() => (accent.value ? { color: accent.value } : undefined))

const fullItemName = computed(() => {
  const u = props.userItem
  if (!u) return ''
  return displayItemName(u.modifiers, u.item.name)
})

const typeName = computed(() => {
  if (!item.value) return ''
  return itemTypeStore.typeLabel(item.value.typeKey)
})

const equippable = computed(() => !!item.value && isEquippableTypeKey(item.value.typeKey))
const showEquipActions = computed(() => !props.locked && props.canManage && equippable.value && item.value?.active && !item.value.deprecated)
const showDownload = computed(() => !props.locked && props.canManage && !!item.value?.downloadable && item.value.active && !item.value.deprecated)

const untradeable = computed(() => !item.value?.tradeable)
const essenceWorth = computed(() => item.value?.worth ?? 0)
const showDisintegrate = computed(
  () => !props.locked && props.canManage && !untradeable.value && essenceWorth.value > 0,
)
const disintegrateEssence = computed(() => essenceWorth.value * quantity.value)
const showOpenCrate = computed(
  () => isCrate.value && props.canManage && !props.locked && !!item.value?.active && !item.value.deprecated,
)

const previewOpen = ref(false)

function openPreview() {
  previewOpen.value = true
  emit('loadCrateEffects')
}

const crateReady = computed(
  () => !props.crateContentsLoading && (props.crateContents ?? []).length > 0,
)
const showCrateEmptyNote = computed(
  () => showOpenCrate.value && !props.crateContentsLoading && !crateReady.value,
)

interface ChoiceGroup {
  label: string
  options: { key: string; label: string; active: boolean; pick: () => void }[]
}

const choiceGroups = computed<ChoiceGroup[]>(() => {
  const linkId = props.userItem?.linkId
  if (!linkId || props.locked) return []
  const groups: ChoiceGroup[] = []
  if (itemVariants.value && showEquipActions.value) {
    groups.push({
      label: 'Variant',
      options: itemVariants.value.map((variant) => ({
        key: variant.key,
        label: variant.label,
        active: activeVariantKey.value === variant.key,
        pick: () => emit('selectVariant', linkId, variant.key),
      })),
    })
  }
  if (themeModes.value) {
    groups.push({
      label: 'Theme mode',
      options: themeModes.value.map((mode) => ({
        key: mode.label,
        label: mode.label,
        active: activeThemeMode.value === mode.alt,
        pick: () => emit('applyThemeMode', linkId, mode.alt),
      })),
    })
  }
  return groups
})
const showActions = computed(() => showEquipActions.value || showDownload.value || showDisintegrate.value || untradeable.value)
const obtainableSentence = computed(() =>
  item.value ? obtainableUntilSentence(item.value) : null,
)
const hasMetaRows = computed(() => {
  if (!props.locked) return true
  return (
    item.value?.unlockLevel != null || !!item.value?.requirement || !!obtainableSentence.value
  )
})

const sourceLabel = computed(() => {
  if (!props.userItem) return ''
  if (props.sourceLabel) return props.sourceLabel
  switch (props.userItem.source) {
    case 'milestone': return 'Milestone reward'
    case 'milestone_set': return 'Milestone set reward'
    case 'campaign_milestone': return 'Campaign reward'
    case 'level': return `Level ${props.userItem.sourceId ?? '?'} reward`
    case 'trade': return 'Acquired via trade'
    case 'manual': return 'Awarded by staff'
    default: return props.userItem.source
  }
})

</script>

<template>
  <div v-if="userItem && item" class="inv-detail">
    <div
      class="inv-detail__art"
      :class="[rarityClass(item.rarity), { 'inv-detail__art--title-fx': item.typeKey === 'title' || item.typeKey === 'clan_title_effect' }]"
    >
      <BorderComposition
        v-if="showComposition"
        :shape="compositionShape"
        :color="compositionColor"
        :avatar-url="avatarUrl"
        :effects="effectLayers"
        :context="tokenCtx"
      />
      <FragmentedItem v-else-if="fragmentSpec" :item="previewItem ?? item" :spec="fragmentSpec" :selected="true" />
      <ItemPreview v-else :item="previewItem ?? item" :effects="effectLayers" :context="tokenCtx" :selected="true" />
      <ModifierCompositions
        v-for="layer in overlayLayers"
        :key="layer.key"
        :spec="layer.spec"
        :context="tokenCtx"
        :type-key="item?.typeKey"
        measure-selector=".title-renderer, .item-preview > *"
      />
    </div>

    <div class="inv-detail__head">
      <span class="inv-detail__type">{{ typeName }}</span>
      <h3 class="inv-detail__name" :style="itemNameStyle">
        <span v-if="locked" class="inv-detail__name-lock" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
        {{ fullItemName }}
      </h3>
      <span class="inv-detail__rarity" :class="rarityClass(item.rarity)">{{ item.rarity }}</span>
    </div>

    <p v-if="item.description" class="inv-detail__description">{{ item.description }}</p>

    <div v-if="isCrate" class="inv-detail__crate-open-row">
      <BaseButton
        v-if="showOpenCrate"
        variant="primary"
        size="md"
        :loading="busy"
        :disabled="!crateReady"
        @click="$emit('openCrate', userItem.linkId)"
      >
        Open crate
      </BaseButton>

      <BaseButton size="md" @click="openPreview">Preview</BaseButton>
    </div>

    <p v-if="showCrateEmptyNote" class="inv-detail__crate-open-note">Crates without revealed content cannot be opened.</p>

    <CrateContentsList
      v-if="isCrate"
      :contents="crateContents ?? []"
      :loading="crateContentsLoading"
      :owned-item-ids="ownedItemIds"
    />

    <CrateModifierList
      v-if="isCrate && item"
      :modifiers="crateModifiers ?? []"
      :crate-id="item.id"
      :loading="crateModifiersLoading"
    />

    <CratePreviewModal
      v-if="isCrate"
      :open="previewOpen"
      :crate="item"
      :contents="crateContents ?? []"
      :contents-loading="crateContentsLoading"
      :modifiers="crateModifiers ?? []"
      :modifiers-loading="crateModifiersLoading"
      :effects="crateEffects ?? []"
      :effects-loading="crateEffectsLoading"
      :owned-item-ids="ownedItemIds"
      @close="previewOpen = false"
    />

    <div
      v-for="group in choiceGroups"
      :key="group.label"
      class="inv-detail__choices"
      role="group"
      :aria-label="group.label"
    >
      <button
        v-for="option in group.options"
        :key="option.key"
        type="button"
        class="inv-detail__choice"
        :class="{ 'inv-detail__choice--active': option.active }"
        :disabled="busy"
        @click="option.pick"
      >
        {{ option.label }}
      </button>
    </div>

    <dl v-if="hasMetaRows" class="inv-detail__meta">
      <template v-if="locked">
        <div v-if="item.unlockLevel != null" class="inv-detail__row">
          <dt>Unlock</dt>
          <dd class="inv-detail__mono">Level {{ item.unlockLevel }}</dd>
        </div>
        <div v-if="item.requirement" class="inv-detail__row">
          <dt>Requirement</dt>
          <dd>{{ item.requirement }}</dd>
        </div>
      </template>
      <template v-else>
        <div class="inv-detail__row">
          <dt>{{ modifiers.length > 1 ? 'Modifiers' : 'Modifier' }}</dt>
          <dd>
            <div v-if="modifiers.length" class="inv-detail__chips">
              <ModifierChip v-for="m in modifiers" :key="m.id" :modifier="m" />
            </div>
            <span v-else>-</span>
          </dd>
        </div>
        <div v-if="pbCount != null" class="inv-detail__row">
          <dt>PB Counter</dt>
          <dd class="inv-detail__mono">{{ pbCount }}</dd>
        </div>
        <div v-if="unusualEffect" class="inv-detail__row">
          <dt>Effect</dt>
          <dd>{{ unusualEffect.name || unusualEffect.key }}</dd>
        </div>
        <div v-if="quantity > 1" class="inv-detail__row">
          <dt>Quantity</dt>
          <dd class="inv-detail__mono">x{{ quantity }}</dd>
        </div>
        <div v-if="userItem.serialNumber != null" class="inv-detail__row">
          <dt>Serial</dt>
          <dd class="inv-detail__mono">#{{ userItem.serialNumber }}</dd>
        </div>
        <div v-if="untradeable" class="inv-detail__row">
          <dt>Source</dt>
          <dd>{{ sourceLabel }}</dd>
        </div>
        <div v-if="userItem.crate" class="inv-detail__row">
          <dt>Collection</dt>
          <dd>
            <button
              type="button"
              class="inv-detail__collection"
              :aria-label="`Preview ${userItem.crate.name}`"
              @click="emit('previewCrate', userItem.crate)"
            >
              <img
                v-if="userItem.crate.iconUrl"
                class="inv-detail__collection-icon"
                :src="userItem.crate.iconUrl"
                alt=""
                loading="lazy"
                decoding="async"
              />
              {{ userItem.crate.name }}
            </button>
          </dd>
        </div>
        <div class="inv-detail__row">
          <dt>Awarded</dt>
          <dd>{{ formatRelativeDate(userItem.awardedAt) }}</dd>
        </div>
        <div v-if="userItem.reason" class="inv-detail__row">
          <dt>Reason</dt>
          <dd>{{ userItem.reason }}</dd>
        </div>
      </template>
      <div v-if="obtainableSentence" class="inv-detail__row">
        <dt>Availability</dt>
        <dd>{{ obtainableSentence }}</dd>
      </div>
    </dl>

    <div v-if="locked" class="inv-detail__pill">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      Not in your inventory
    </div>

    <div v-if="!locked && item.deprecated" class="inv-detail__notice">This item has been deprecated.</div>

    <div v-if="showActions" class="inv-detail__actions">
      <div class="inv-detail__actions-row">
        <BaseButton
          v-if="showDownload"
          variant="primary"
          size="md"
          :loading="downloading"
          @click="$emit('download', userItem.linkId)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </BaseButton>

        <BaseButton
          v-if="showEquipActions && !equipped"
          variant="primary"
          size="md"
          :loading="busy"
          @click="$emit('equip', userItem.linkId)"
        >
          Equip
        </BaseButton>
        <BaseButton
          v-else-if="showEquipActions && canUnequip"
          size="md"
          :loading="busy"
          @click="$emit('unequip', item.typeKey)"
        >
          Unequip
        </BaseButton>
        <span v-else-if="showEquipActions" class="inv-detail__pill inv-detail__pill--accent">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Equipped
        </span>

        <BaseButton
          v-if="showDisintegrate"
          variant="destructive"
          size="md"
          :disabled="equipped || busy"
          @click="$emit('disintegrate', userItem.linkId)"
        >
          Disintegrate
          <span class="inv-detail__essence-yield">· +{{ formatEssence(disintegrateEssence) }}</span>
        </BaseButton>

        <span v-if="untradeable" class="inv-detail__pill" aria-label="Untradeable">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Untradeable
        </span>
      </div>
    </div>
  </div>

  <div v-else class="inv-detail inv-detail--empty">
    <p>Select an item to see its details.</p>
  </div>
</template>

<style scoped>
.inv-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.inv-detail--empty {
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: var(--text-tertiary);
  font-size: var(--text-caption);
  text-align: center;
}

.inv-detail__art {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: 220px;
  background: var(--bg-base);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.inv-detail__art--title-fx :deep(.item-preview) {
  position: relative;
  z-index: 1;
}

.inv-detail__art img {
  max-width: 75%;
  max-height: 75%;
  object-fit: contain;
}

.inv-detail__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.inv-detail__type {
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.inv-detail__name {
  margin: 0;
  font-size: var(--text-section-heading);
  font-weight: 600;
  color: var(--text-primary);
}

.inv-detail__rarity {
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rarity-color, var(--text-tertiary));
}

.inv-detail__description {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-body);
  line-height: 1.5;
}

.inv-detail__meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: 0;
  padding: var(--space-sm) 0;
  border-top: 1px solid var(--bg-overlay);
  border-bottom: 1px solid var(--bg-overlay);
}

.inv-detail__row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  font-size: var(--text-caption);
}

.inv-detail__row dt {
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.inv-detail__row dd {
  margin: 0;
  color: var(--text-primary);
  text-align: right;
}

.inv-detail__collection {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  text-align: right;
  cursor: pointer;
  transition: color 120ms ease;
}

.inv-detail__collection:hover {
  color: var(--page-accent, var(--accent));
}

.inv-detail__collection-icon {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-btn);
  object-fit: contain;
  flex-shrink: 0;
}

.inv-detail__mono {
  font-family: var(--font-mono);
}

.inv-detail__chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  justify-content: flex-end;
}

.inv-detail__choices {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  min-width: 0;
}

.inv-detail__choice {
  flex: 1 1 auto;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}

.inv-detail__choice:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

.inv-detail__choice--active {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.inv-detail__notice {
  padding: var(--space-sm) var(--space-md);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
  border-radius: var(--radius-card);
  color: var(--warning);
  font-size: var(--text-caption);
}

.inv-detail__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);
}

.inv-detail__actions-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.inv-detail__crate-open-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.inv-detail__crate-open-note {
  margin-top: var(--space-xs);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.inv-detail__essence-yield {
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}

.inv-detail__name-lock {
  display: inline-flex;
  align-items: center;
  margin-right: var(--space-xs);
  color: var(--text-tertiary);
  vertical-align: -2px;
}

.inv-detail__pill {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  font-family: var(--font-sans);
  font-size: var(--text-caption);
  font-weight: 500;
  color: var(--text-tertiary);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: color-mix(in srgb, var(--bg-base) 60%, transparent);
}

.inv-detail__pill--accent {
  font-weight: 600;
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
</style>
