<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseSwitch from '@/components/common/BaseSwitch.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CrateOpeningOverlay from '@/views/profile/CrateOpeningOverlay.vue'
import DisintegrateDialog from '@/views/profile/DisintegrateDialog.vue'
import InventoryDetailPanel from '@/components/domain/InventoryDetailPanel.vue'
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import InventoryLayout, { INVENTORY_NARROW_QUERY } from '@/components/domain/InventoryLayout.vue'
import PublicCratePreview from '@/components/domain/PublicCratePreview.vue'
import ItemFilterPanel, {
  type ItemFilterCollectionOption,
} from '@/components/domain/ItemFilterPanel.vue'
import { useCrateContents } from '@/composables/useCrateContents'
import { useCrateModifiers } from '@/composables/useCrateModifiers'
import { useCrateUnusualEffects } from '@/composables/useCrateUnusualEffects'
import { useEquippedRenderProps } from '@/composables/useEquippedRenderProps'
import { useItemDownload } from '@/composables/useItemDownload'
import { useItemFilterOptions } from '@/composables/useItemFilterOptions'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useOwnedItemIds } from '@/composables/useOwnedItemIds'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useQueryParams } from '@/composables/useQueryParams'
import { useReducedMotion } from '@/composables/useReducedMotion'
import {
  disintegrateItems,
  getUserInventory,
  getUserInventoryCrates,
} from '@/api/items'
import { parseApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useEssenceStore } from '@/stores/essence'
import { useInventoryStore } from '@/stores/inventory'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { useThemeStore } from '@/stores/theme'
import type {
  CrateOpenResponse,
  DisintegrateEntryRequest,
  InventoryEntry,
  ItemRarity,
  ItemResponse,
  ItemTypeKey,
  UserItemResponse,
} from '@/types/api/items'
import type { ItemVariant } from '@/types/cosmetics/common'
import type { Page } from '@/types/pagination'
import { ESSENCE_GLYPH, formatEssence, formatEssenceAmount } from '@/utils/essence'
import { buildEffectLayers } from '@/utils/cosmetics/effectLayers'
import { readThemeValue } from '@/utils/cosmetics/readers'
import { resolveItemVariant } from '@/utils/items'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const props = defineProps<{
  userId: string
  avatarUrl?: string | null
}>()

const authStore = useAuthStore()
const essenceStore = useEssenceStore()
const inventoryStore = useInventoryStore()
const itemModifierStore = useItemModifierStore()
const themeStore = useThemeStore()

const route = useRoute()
const { queryRef } = useQueryParams()
const reducedMotion = useReducedMotion()
const narrow = useMediaQuery(INVENTORY_NARROW_QUERY)

const isOwnProfile = computed(() => authStore.isLoggedIn && authStore.userId === props.userId)
const canOfferTrade = computed(() => authStore.isLoggedIn && !!authStore.userId && authStore.userId !== props.userId)

const typeKeys = ref<string[]>([])
const rarities = ref<ItemRarity[]>([])
const modifierKeys = ref<string[]>([])
const collectionIds = ref<string[]>([])
const search = ref('')

const hasActiveFilters = computed(
  () =>
    typeKeys.value.length > 0 ||
    rarities.value.length > 0 ||
    modifierKeys.value.length > 0 ||
    collectionIds.value.length > 0,
)

function clearFilters() {
  typeKeys.value = []
  rarities.value = []
  modifierKeys.value = []
  collectionIds.value = []
}

const unownedParam = queryRef<'1'>('unowned')
const showUnowned = computed<boolean>({
  get: () => unownedParam.value === '1',
  set: (on) => {
    unownedParam.value = on ? '1' : ''
  },
})

const { currentPage, sortState, paginationParams, setPage, setSort, resetPage } = usePageableRoute({
  defaultSort: 'date',
  defaultOrder: 'desc',
  defaultSize: 20,
  sortFieldMap: {
    date: 'awardedAt',
    name: 'item.name',
    type: 'item.type.key',
    serial: 'serialNumber',
    quantity: 'quantity',
    rarity: 'rarity',
  },
  secondarySort: null,
})

const sortOptions = [
  { value: 'date', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'crate', label: 'Collection' },
]

const { typeGroups, modifierOptions } = useItemFilterOptions({
  hiddenModifierKeys: ['decorated'],
})

const filtersOpen = ref(false)
const collections = ref<ItemResponse[]>([])
const previewCrate = ref<ItemResponse | null>(null)

function openCratePreview(crate: ItemResponse) {
  mobileDetailOpen.value = false
  previewCrate.value = crate
}

const collectionOptions = computed<ItemFilterCollectionOption[]>(() =>
  collections.value.map((c) => ({ id: c.id, label: c.name, iconUrl: c.iconUrl })),
)

async function fetchCollections() {
  try {
    collections.value = await getUserInventoryCrates(props.userId)
  } catch {
    collections.value = []
  }
}

const data = ref<Page<InventoryEntry> | null>(null)
const loading = ref(false)
const selectedLinkId = ref<string | null>(null)
const pendingHighlightId = ref(
  typeof route.query.inventoryHighlight === 'string' ? route.query.inventoryHighlight : null,
)
const flashLinkId = ref<string | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null
const actionBusy = ref(false)
const mobileDetailOpen = ref(false)
const MAX_SELECTION = 200

const selectMode = ref(false)
const selection = ref<UserItemResponse[]>([])
const pendingDisintegration = ref<UserItemResponse[]>([])
const disintegrateError = ref<string | null>(null)
const feedback = ref<{ variant: 'success' | 'error'; message: string } | null>(null)
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

const unownedKeys = computed(
  () => new Set((data.value?.content ?? []).filter((u) => !u.linkId).map((u) => u.item.id)),
)

function isUnowned(userItem: UserItemResponse): boolean {
  return unownedKeys.value.has(userItem.linkId)
}

const items = computed<UserItemResponse[]>(() =>
  (data.value?.content ?? []).map((u) => ({ ...u, linkId: u.linkId ?? u.item.id })),
)

const totalPages = computed(() => data.value?.totalPages ?? 0)

const selectedItem = computed<UserItemResponse | null>(
  () => items.value.find((u) => u.linkId === selectedLinkId.value) ?? null,
)

interface CrateOpening {
  userItem: UserItemResponse
  result: CrateOpenResponse | null
  error: string | null
  busy: boolean
  equipBusy: boolean
  equippedLinkId: string | null
}

const crateOpening = ref<CrateOpening | null>(null)
const crateRefreshed = ref(false)

function patchOpening(patch: Partial<CrateOpening>) {
  if (crateOpening.value) Object.assign(crateOpening.value, patch)
}

const crateItem = computed(
  () => crateOpening.value?.userItem.item ?? selectedItem.value?.item ?? null,
)

const { contents: crateContents, loading: crateContentsLoading } = useCrateContents(crateItem)

const { modifiers: crateModifiers, loading: crateModifiersLoading } = useCrateModifiers(crateItem)

const {
  effects: crateEffects,
  loading: crateEffectsLoading,
  load: loadCrateEffects,
} = useCrateUnusualEffects(
  () => (crateItem.value?.typeKey === 'crate' ? crateItem.value.id : null),
)

const isCrateSelected = computed(() => selectedItem.value?.item.typeKey === 'crate')
const { ownedIds } = useOwnedItemIds(() => props.userId, isCrateSelected)

const isSelectedLocked = computed(() => !!selectedItem.value && isUnowned(selectedItem.value))

const isSelectedEquipped = computed(() => !!selectedItem.value && isEquipped(selectedItem.value))

const selectedEquippedVariantKey = computed<string | null>(() => {
  const it = selectedItem.value?.item
  if (!isSelectedEquipped.value || !it) return null
  return inventoryStore.equipped[it.typeKey]?.variantKey ?? null
})

const { borderShapeValue: equippedBorderShape, borderColorValue: equippedBorderColor }
  = useEquippedRenderProps(() => inventoryStore.equipped)

function isEquipped(userItem: UserItemResponse): boolean {
  if (!isOwnProfile.value || isUnowned(userItem)) return false
  const slot = inventoryStore.equipped[userItem.item.typeKey]
  return !!slot && slot.linkId === userItem.linkId
}

function applyPendingHighlight() {
  const linkId = pendingHighlightId.value
  if (!linkId) return
  pendingHighlightId.value = null
  if (!items.value.some((u) => u.linkId === linkId)) return
  selectedLinkId.value = linkId
  flashLinkId.value = linkId
  void nextTick(() => {
    document
      .querySelector(`[data-link-id="${CSS.escape(linkId)}"]`)
      ?.scrollIntoView({ block: 'center', behavior: reducedMotion.value ? 'auto' : 'smooth' })
  })
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashLinkId.value = null
  }, 1600)
}

const request = computed(() => ({
  userId: props.userId,
  params: {
    ...paginationParams.value,
    typeKey: typeKeys.value.length > 0 ? (typeKeys.value as ItemTypeKey[]) : undefined,
    rarity: rarities.value.length > 0 ? rarities.value : undefined,
    modifierKey: modifierKeys.value.length > 0 ? modifierKeys.value : undefined,
    crateItemId: collectionIds.value.length > 0 ? collectionIds.value : undefined,
    search: search.value.trim() || undefined,
    includeUnowned: showUnowned.value,
  },
}))

let requestId = 0

async function fetchInventory(silent = false) {
  const id = ++requestId
  const { userId, params } = request.value
  if (!silent) loading.value = true
  try {
    const page = await getUserInventory(userId, params)
    if (id !== requestId) return
    data.value = page
    if (!items.value.some((u) => u.linkId === selectedLinkId.value)) {
      selectedLinkId.value = items.value[0]?.linkId ?? null
    }
    applyPendingHighlight()
  } catch {
    if (id === requestId) data.value = null
  } finally {
    if (id === requestId) loading.value = false
  }
}

function selectItem(linkId: string) {
  selectedLinkId.value = linkId
  if (narrow.value) mobileDetailOpen.value = true
}

function isDisintegratable(userItem: UserItemResponse): boolean {
  if (!isOwnProfile.value || isUnowned(userItem)) return false
  if (!userItem.item.tradeable || (userItem.item.worth ?? 0) <= 0) return false
  return !isEquipped(userItem)
}

const selectedLinkIds = computed(() => new Set(selection.value.map((u) => u.linkId)))

const selectionEssence = computed(() =>
  selection.value.reduce((sum, u) => sum + (u.item.worth ?? 0) * (u.quantity ?? 1), 0),
)

function toggleSelection(linkId: string) {
  if (selectedLinkIds.value.has(linkId)) {
    selection.value = selection.value.filter((u) => u.linkId !== linkId)
    return
  }
  if (selection.value.length >= MAX_SELECTION) return
  const target = items.value.find((u) => u.linkId === linkId)
  if (target && isDisintegratable(target)) selection.value = [...selection.value, target]
}

function selectPage() {
  const known = selectedLinkIds.value
  const additions = items.value.filter((u) => isDisintegratable(u) && !known.has(u.linkId))
  selection.value = [...selection.value, ...additions].slice(0, MAX_SELECTION)
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  selection.value = []
}

function findOwnedLink(linkId: string): UserItemResponse | null {
  const target = items.value.find((u) => u.linkId === linkId)
  return target && !isUnowned(target) ? target : null
}

function reportActionError(err: unknown, fallback: string) {
  const parsed = parseApiError(err, fallback)
  showFeedback('error', parsed.fieldErrors[0]?.message ?? parsed.message)
}

function applyTheme(userItem: UserItemResponse, tokens: Record<string, string> | null | undefined) {
  if (!tokens) return
  themeStore.setThemeFromTokens(
    `item:${userItem.item.id}`,
    tokens,
    buildEffectLayers(userItem.modifiers, userItem.unusualEffect),
  )
}

async function equipLink(userItem: UserItemResponse, variantKey?: string) {
  await inventoryStore.equip(userItem.linkId, props.userId, variantKey)
  if (userItem.item.typeKey !== 'theme') return
  const value = variantKey
    ? resolveItemVariant(userItem.item.value as { variants?: ItemVariant[] }, variantKey)
    : userItem.item.value
  applyTheme(userItem, readThemeValue(value)?.tokens)
}

async function handleEquip(linkId: string, variantKey?: string) {
  const target = findOwnedLink(linkId)
  if (!target) return
  actionBusy.value = true
  try {
    await equipLink(target, variantKey)
  } catch (err) {
    reportActionError(err, variantKey ? 'Could not switch variant.' : 'Could not equip item.')
  } finally {
    actionBusy.value = false
  }
}

async function handleApplyThemeMode(linkId: string, alt: boolean) {
  const target = findOwnedLink(linkId)
  if (!target) return
  const theme = readThemeValue(target.item.value)
  const tokens = alt ? theme?.altTokens : theme?.tokens
  if (!tokens) return
  actionBusy.value = true
  try {
    if (!isEquipped(target)) await inventoryStore.equip(target.linkId, props.userId)
    applyTheme(target, tokens)
  } catch (err) {
    reportActionError(err, 'Could not apply theme.')
  } finally {
    actionBusy.value = false
  }
}

const { downloadingLinkId, download } = useItemDownload()

async function handleDownload(linkId: string) {
  if (downloadingLinkId.value) return
  const target = findOwnedLink(linkId)
  if (!target) return
  try {
    const filename = await download(target)
    showFeedback('success', `Saved ${filename}`)
  } catch (err) {
    showFeedback('error', parseApiError(err, 'Download failed - try again.').message)
  }
}

function showFeedback(variant: 'success' | 'error', message: string) {
  feedback.value = { variant, message }
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => {
    feedback.value = null
  }, 4000)
}

function mutateLink(linkId: string, nextQuantity: number | null) {
  const apply = <T extends { linkId?: string; quantity: number }>(list: T[]): T[] =>
    nextQuantity === null
      ? list.filter((u) => u.linkId !== linkId)
      : list.map((u) => (u.linkId === linkId ? { ...u, quantity: nextQuantity } : u))

  selection.value = apply(selection.value)

  if (data.value) {
    const removed = nextQuantity === null && data.value.content.some((u) => u.linkId === linkId)
    data.value = {
      ...data.value,
      content: apply(data.value.content),
      totalElements: removed ? Math.max(0, data.value.totalElements - 1) : data.value.totalElements,
    }
  }

  if (nextQuantity === null && selectedLinkId.value === linkId) {
    selectedLinkId.value = items.value[0]?.linkId ?? null
  }
}

function openDisintegrateDialog(targets: UserItemResponse[]) {
  if (targets.length === 0) return
  disintegrateError.value = null
  pendingDisintegration.value = targets
}

function handleDisintegrateRequest(linkId: string) {
  const target = findOwnedLink(linkId)
  if (target) openDisintegrateDialog([target])
}

function handleDisintegrateCancel() {
  if (actionBusy.value) return
  pendingDisintegration.value = []
  disintegrateError.value = null
}

function handleDisintegrateRemove(linkId: string) {
  if (actionBusy.value) return
  pendingDisintegration.value = pendingDisintegration.value.filter((u) => u.linkId !== linkId)
  selection.value = selection.value.filter((u) => u.linkId !== linkId)
  if (pendingDisintegration.value.length === 0) disintegrateError.value = null
}

function findOwnedCrateLink(itemId: string): UserItemResponse | null {
  return items.value.find((u) => u.item.id === itemId && !isUnowned(u)) ?? null
}

const canOpenAnother = computed(() => {
  const current = crateOpening.value
  return !!current && findOwnedCrateLink(current.userItem.item.id) !== null
})

async function requestCrateOpen(target: UserItemResponse) {
  try {
    const { openCrate } = await import('@/api/crates')
    const res = await openCrate(target.linkId)
    mutateLink(res.consumedLinkId, null)
    patchOpening({ result: res, busy: false })
  } catch (err) {
    const parsed = parseApiError(err, 'Could not open crate.')
    if (parsed.status === 404) mutateLink(target.linkId, null)
    patchOpening({ error: parsed.fieldErrors[0]?.message ?? parsed.message, busy: false })
  }
}

function startOpening(target: UserItemResponse) {
  crateRefreshed.value = false
  crateOpening.value = {
    userItem: target,
    result: null,
    error: null,
    busy: true,
    equipBusy: false,
    equippedLinkId: null,
  }
  requestCrateOpen(target)
}

function handleOpenCrate(linkId: string) {
  const target = findOwnedLink(linkId)
  if (!target || target.item.typeKey !== 'crate') return
  if (crateContentsLoading.value || crateContents.value.length === 0) return
  mobileDetailOpen.value = false
  startOpening(target)
  void nextTick(loadCrateEffects)
}

function handleOpenAnother() {
  const current = crateOpening.value
  if (!current || current.busy) return
  const next = findOwnedCrateLink(current.userItem.item.id)
  if (next) startOpening(next)
}

async function handleCrateEquip(reward: UserItemResponse) {
  if (!crateOpening.value || crateOpening.value.equipBusy) return
  patchOpening({ equipBusy: true })
  try {
    await equipLink(reward)
    patchOpening({ equipBusy: false, equippedLinkId: reward.linkId })
  } catch {
    patchOpening({ equipBusy: false })
  }
}

function handleCrateOpened() {
  crateRefreshed.value = true
  fetchInventory()
}

function handleCrateOverlayClose() {
  const rewardLinkId = crateOpening.value?.result?.reward.linkId ?? null
  const refreshed = crateRefreshed.value
  crateOpening.value = null
  crateRefreshed.value = false
  if (rewardLinkId) selectedLinkId.value = rewardLinkId
  if (!refreshed) fetchInventory()
}

async function handleDisintegrateConfirm(entries: DisintegrateEntryRequest[]) {
  if (entries.length === 0) return
  actionBusy.value = true
  try {
    const res = await disintegrateItems(entries)
    essenceStore.setBalance(res.balance)
    for (const entry of res.entries) mutateLink(entry.linkId, entry.remainingQuantity ?? null)
    showFeedback('success', `+${formatEssence(res.essenceGained)} essence`)
    pendingDisintegration.value = []
    disintegrateError.value = null
    selection.value = []
    selectMode.value = false
    mobileDetailOpen.value = false
    fetchInventory(true)
  } catch (err) {
    const parsed = parseApiError(err, 'Could not disintegrate.')
    disintegrateError.value = parsed.fieldErrors[0]?.message ?? parsed.message
    if (parsed.status === 409 && isOwnProfile.value && authStore.userId) {
      await inventoryStore.fetchEquipped(authStore.userId, true)
    }
    if (parsed.status === 404) fetchInventory(true)
  } finally {
    actionBusy.value = false
  }
}

watch([typeKeys, rarities, modifierKeys, collectionIds, search], () => resetPage())

watch(() => JSON.stringify(request.value), () => fetchInventory(), { immediate: true })

watch(showUnowned, () => {
  selectMode.value = false
  selection.value = []
})

watch(() => props.userId, (id) => {
  if (!id) return
  fetchCollections()
  if (isOwnProfile.value) {
    inventoryStore.fetchEquipped(id)
    essenceStore.fetchBalance(true)
  }
}, { immediate: true })

watch([totalPages, currentPage], () => {
  if (loading.value) return
  if (totalPages.value >= 1 && currentPage.value > totalPages.value) {
    setPage(totalPages.value)
  }
})

onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  if (flashTimer) clearTimeout(flashTimer)
})
</script>

<template>
  <div class="inv-tab">
    <BaseBanner v-if="feedback" :variant="feedback.variant" role="status" @close="feedback = null">
      {{ feedback.message }}
    </BaseBanner>

    <div class="inv-tab__controls">
      <div class="inv-tab__filters">
        <SearchBox v-model="search" placeholder="Search items..." class="inv-tab__search" />

        <div class="inv-tab__filters-right">
          <BaseSelect
            :model-value="sortState.key"
            :options="sortOptions"
            placeholder="Sort"
            @update:model-value="setSort"
          />
          <button
            type="button"
            class="inv-tab__sort-dir"
            :aria-label="sortState.direction === 'asc' ? 'Sort descending' : 'Sort ascending'"
            @click="setSort(sortState.key)"
          >
            <svg
              class="inv-tab__sort-icon"
              :class="{ 'inv-tab__sort-icon--asc': sortState.direction === 'asc' }"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </button>
          <FilterPopover :open="filtersOpen" @update:open="filtersOpen = $event">
            <template #trigger>
              <FilterButton :active="filtersOpen || hasActiveFilters" :has-indicator="hasActiveFilters" />
            </template>
            <ItemFilterPanel
              :rarities="rarities"
              :type-keys="typeKeys"
              :type-groups="typeGroups"
              :modifier-keys="modifierKeys"
              :modifier-options="modifierOptions"
              :collection-ids="collectionIds"
              :collection-options="collectionOptions"
              :has-active-filters="hasActiveFilters"
              @update:rarities="rarities = $event"
              @update:type-keys="typeKeys = $event"
              @update:modifier-keys="modifierKeys = $event"
              @update:collection-ids="collectionIds = $event"
              @clear="clearFilters"
            />
          </FilterPopover>
        </div>
      </div>

      <div class="inv-tab__actions-bar">
        <div class="inv-tab__actions-left">
          <BaseSwitch v-model="showUnowned" label="Unowned" aria-label="Show unowned items" />

          <BaseButton v-if="isOwnProfile && !showUnowned" size="sm" @click="toggleSelectMode">
            {{ selectMode ? 'Done' : 'Select' }}
          </BaseButton>
        </div>

        <div class="inv-tab__actions-right">
          <span
            v-if="isOwnProfile && essenceStore.balance !== null"
            class="inv-tab__wallet"
            :aria-label="`Essence balance: ${formatEssenceAmount(essenceStore.balance)}`"
            title="Item essence"
          >
            <span class="inv-tab__wallet-glyph" aria-hidden="true">{{ ESSENCE_GLYPH }}</span>
            <span class="inv-tab__wallet-amount">{{ formatEssenceAmount(essenceStore.balance) }}</span>
          </span>
          <RouterLink v-if="isOwnProfile" :to="{ name: 'market' }" custom v-slot="{ navigate, href }">
            <BaseButton variant="primary" :href="href" @click="(e: MouseEvent) => { e.preventDefault(); navigate() }">
              Market Hub
            </BaseButton>
          </RouterLink>
          <RouterLink
            v-else-if="canOfferTrade"
            :to="{ name: 'trade-new', query: { to: userId } }"
            custom
            v-slot="{ navigate, href }"
          >
            <BaseButton variant="primary" :href="href" @click="(e: MouseEvent) => { e.preventDefault(); navigate() }">
              Offer Trade
            </BaseButton>
          </RouterLink>
        </div>
      </div>
    </div>

    <div v-if="selectMode" class="inv-tab__selection">
      <span class="inv-tab__selection-count">
        {{ selection.length }} selected
      </span>
      <span class="inv-tab__selection-essence">
        <span class="inv-tab__wallet-glyph" aria-hidden="true">{{ ESSENCE_GLYPH }}</span>
        {{ formatEssenceAmount(selectionEssence) }}
      </span>
      <div class="inv-tab__selection-actions">
        <BaseButton size="sm" @click="selectPage">Select page</BaseButton>
        <BaseButton size="sm" :disabled="selection.length === 0" @click="selection = []">
          Clear
        </BaseButton>
        <BaseButton
          variant="destructive"
          size="sm"
          :disabled="selection.length === 0"
          @click="openDisintegrateDialog([...selection])"
        >
          Disintegrate
        </BaseButton>
      </div>
    </div>

    <InventoryLayout
      :detail-open="mobileDetailOpen"
      :detail-title="selectedItem?.item.name"
      @close-detail="mobileDetailOpen = false"
    >
      <template v-if="loading">
        <SkeletonLoader v-for="i in 12" :key="i" variant="card" />
      </template>
      <template v-else>
        <InventoryItemCell
          v-for="userItem in items"
          :key="userItem.linkId"
          :data-link-id="userItem.linkId"
          :user-item="userItem"
          :selected="userItem.linkId === selectedLinkId"
          :highlighted="userItem.linkId === flashLinkId"
          :equipped="isEquipped(userItem)"
          :locked="isUnowned(userItem)"
          :select-mode="selectMode"
          :checked="selectedLinkIds.has(userItem.linkId)"
          :selectable="isDisintegratable(userItem)"
          @select="selectItem"
          @toggle="toggleSelection"
        />
      </template>

      <template v-if="!loading && items.length === 0" #empty>
        <EmptyState message="No items found." />
      </template>

      <template #footer>
        <PaginationControls
          v-if="totalPages > 1"
          :page="currentPage"
          :total-pages="totalPages"
          @update:page="setPage"
        />
      </template>

      <template #detail>
        <InventoryDetailPanel
          :user-item="selectedItem"
          :can-manage="isOwnProfile"
          :equipped="isSelectedEquipped"
          :equipped-variant-key="selectedEquippedVariantKey"
          :equipped-border-shape="equippedBorderShape"
          :equipped-border-color="equippedBorderColor"
          :avatar-url="avatarUrl"
          :busy="actionBusy"
          :locked="isSelectedLocked"
          :downloading="downloadingLinkId === selectedLinkId"
          :crate-contents="crateContents"
          :crate-contents-loading="crateContentsLoading"
          :crate-modifiers="crateModifiers"
          :crate-modifiers-loading="crateModifiersLoading"
          :crate-effects="crateEffects"
          :crate-effects-loading="crateEffectsLoading"
          :owned-item-ids="ownedIds"
          @load-crate-effects="loadCrateEffects"
          @equip="handleEquip"
          @apply-theme-mode="handleApplyThemeMode"
          @select-variant="handleEquip"
          @disintegrate="handleDisintegrateRequest"
          @open-crate="handleOpenCrate"
          @download="handleDownload"
          @preview-crate="openCratePreview"
        />
      </template>
    </InventoryLayout>

    <PublicCratePreview
      :open="previewCrate !== null"
      :crate="previewCrate"
      @close="previewCrate = null"
    />

    <DisintegrateDialog
      :open="pendingDisintegration.length > 0"
      :items="pendingDisintegration"
      :busy="actionBusy"
      :error="disintegrateError"
      @confirm="handleDisintegrateConfirm"
      @remove="handleDisintegrateRemove"
      @cancel="handleDisintegrateCancel"
    />

    <CrateOpeningOverlay
      v-if="crateOpening"
      :crate="crateOpening.userItem.item"
      :contents="crateContents"
      :crate-modifiers="crateModifiers"
      :global-modifiers="itemModifierStore.modifiers"
      :unusual-effects="crateEffects"
      :result="crateOpening.result?.reward ?? null"
      :error="crateOpening.error"
      :busy="crateOpening.busy"
      :can-open-another="canOpenAnother"
      :equip-busy="crateOpening.equipBusy"
      :equipped-link-id="crateOpening.equippedLinkId"
      @opened="handleCrateOpened"
      @close="handleCrateOverlayClose"
      @open-another="handleOpenAnother"
      @equip="handleCrateEquip"
    />
  </div>
</template>

<style scoped>
.inv-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.inv-tab__controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.inv-tab__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.inv-tab__filters-right {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.inv-tab__filters :deep(.base-select) {
  flex: 0 0 auto;
}

.inv-tab__filters :deep(.base-select__trigger) {
  min-width: 150px;
  padding: var(--space-xs) var(--space-sm);
}

.inv-tab__search {
  flex: 0 1 320px;
  min-width: 140px;
}

.inv-tab__sort-dir {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xs) var(--space-sm);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}

.inv-tab__sort-dir:hover {
  background: var(--bg-elevated);
  border-color: var(--text-tertiary);
  color: var(--text-primary);
}

.inv-tab__sort-icon {
  transition: transform 120ms ease;
}

.inv-tab__sort-icon--asc {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .inv-tab__sort-icon {
    transition: none;
  }
}

.inv-tab__actions-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.inv-tab__actions-left {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.inv-tab__actions-right {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.inv-tab__wallet {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-btn);
  background: var(--bg-surface);
  white-space: nowrap;
}

.inv-tab__wallet-glyph {
  color: var(--tier-gold);
  font-size: var(--text-body);
  line-height: 1;
}

.inv-tab__wallet-amount {
  font-family: var(--font-mono);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.inv-tab__selection {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--bg-overlay);
  border-radius: var(--radius-card);
}

.inv-tab__selection-count {
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.inv-tab__selection-essence {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-body);
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.inv-tab__selection-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin-left: auto;
}
</style>
