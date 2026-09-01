<script setup lang="ts">
import BaseBanner from '@/components/common/BaseBanner.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FilterButton from '@/components/common/FilterButton.vue'
import FilterPopover from '@/components/common/FilterPopover.vue'
import PaginationControls from '@/components/common/PaginationControls.vue'
import SearchBox from '@/components/common/SearchBox.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import CrateOpeningOverlay from '@/components/domain/CrateOpeningOverlay.vue'
import DisintegrateDialog from '@/components/domain/DisintegrateDialog.vue'
import InventoryDetailPanel from '@/components/domain/InventoryDetailPanel.vue'
import InventoryItemCell from '@/components/domain/InventoryItemCell.vue'
import ItemFilterPanel, {
  type ItemFilterCollectionOption,
} from '@/components/domain/ItemFilterPanel.vue'
import { useCrateContents } from '@/composables/useCrateContents'
import { useCrateModifiers } from '@/composables/useCrateModifiers'
import { useCrateUnusualEffects } from '@/composables/useCrateUnusualEffects'
import { useEquippedRenderProps } from '@/composables/useEquippedRenderProps'
import { useItemDownload } from '@/composables/useItemDownload'
import { useItemFilterOptions } from '@/composables/useItemFilterOptions'
import { useOwnedItemIds } from '@/composables/useOwnedItemIds'
import { usePageableRoute } from '@/composables/usePageableRoute'
import { useReducedMotion } from '@/composables/useReducedMotion'
import {
  disintegrateItems,
  getItems,
  getUserInventory,
  getUserInventoryCrates,
  getUserItems,
} from '@/api/items'
import { parseApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useEssenceStore } from '@/stores/essence'
import { useInventoryStore } from '@/stores/inventory'
import { useItemModifierStore } from '@/stores/itemModifiers'
import { useThemeStore } from '@/stores/theme'
import type { CrateOpenResponse, DisintegrateEntryRequest, ItemRarity, ItemResponse, ItemTypeKey, ItemVariant, UserItemResponse } from '@/types/api/items'
import type { Page } from '@/types/pagination'
import { ESSENCE_GLYPH, formatEssence, formatEssenceAmount } from '@/utils/essence'
import { RARITY_ORDER, buildEffectLayers, readThemeValue, resolveItemVariant } from '@/utils/items'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

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
const router = useRouter()
const reducedMotion = useReducedMotion()

const isOwnProfile = computed(() => authStore.isLoggedIn && authStore.userId === props.userId)
const canOfferTrade = computed(() => authStore.isLoggedIn && !!authStore.userId && authStore.userId !== props.userId)

const typeKeys = ref<string[]>([])
const rarities = ref<ItemRarity[]>([])
const modifierKeys = ref<string[]>([])
const collectionIds = ref<string[]>([])
const search = ref('')
const CATALOG_PAGE_SIZE = 20

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

const showUnowned = computed<boolean>({
  get: () => route.query.unowned === '1',
  set: (val) => {
    const query = { ...route.query }
    if (val) query.unowned = '1'
    else delete query.unowned
    delete query.page
    router.replace({ query })
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

const data = ref<Page<UserItemResponse> | null>(null)
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

const catalogAllItems = ref<ItemResponse[]>([])
const catalogOwnedItems = ref<UserItemResponse[]>([])
const catalogLoading = ref(false)

function isLockedLink(linkId: string | null | undefined): boolean {
  return !!linkId && linkId.startsWith('locked:')
}

function syntheticLockedEntry(it: ItemResponse): UserItemResponse {
  return {
    linkId: `locked:${it.id}`,
    item: it,
    modifiers: [],
    unusualEffect: null,
    serialNumber: null,
    quantity: 0,
    source: 'manual',
    sourceId: null,
    awardedByStaffId: null,
    reason: null,
    awardedAt: '',
  }
}

function compareCatalog(a: UserItemResponse, b: UserItemResponse, key: string): number {
  switch (key) {
    case 'name':
      return a.item.name.localeCompare(b.item.name)
    case 'type':
      return a.item.typeKey.localeCompare(b.item.typeKey)
    case 'rarity':
      return RARITY_ORDER.indexOf(a.item.rarity) - RARITY_ORDER.indexOf(b.item.rarity)
    case 'quantity':
      return (a.quantity ?? 0) - (b.quantity ?? 0)
    case 'crate': {
      const an = a.crate?.name ?? ''
      const bn = b.crate?.name ?? ''
      if (!an && !bn) return 0
      if (!an) return 1
      if (!bn) return -1
      return an.localeCompare(bn)
    }
    case 'date':
    default: {
      if (!a.awardedAt && !b.awardedAt) return 0
      if (!a.awardedAt) return -1
      if (!b.awardedAt) return 1
      return a.awardedAt.localeCompare(b.awardedAt)
    }
  }
}

const catalogMerged = computed<UserItemResponse[]>(() => {
  if (!showUnowned.value) return []
  const ownedIds = new Set(catalogOwnedItems.value.map((u) => u.item.id))
  const locked: UserItemResponse[] = []
  for (const it of catalogAllItems.value) {
    if (!it.visible || !it.active) continue
    if (ownedIds.has(it.id)) continue
    locked.push(syntheticLockedEntry(it))
  }
  return [...catalogOwnedItems.value, ...locked]
})

const catalogFiltered = computed<UserItemResponse[]>(() => {
  if (!showUnowned.value) return []
  const q = search.value.trim().toLowerCase()
  return catalogMerged.value.filter((u) => {
    if (typeKeys.value.length > 0 && !typeKeys.value.includes(u.item.typeKey)) return false
    if (rarities.value.length > 0 && !rarities.value.includes(u.item.rarity)) return false
    if (modifierKeys.value.length > 0) {
      if (isLockedLink(u.linkId)) return false
      if (!u.modifiers.some((m) => modifierKeys.value.includes(m.key))) return false
    }
    if (collectionIds.value.length > 0) {
      if (!u.crate || !collectionIds.value.includes(u.crate.id)) return false
    }
    if (q && !u.item.name.toLowerCase().includes(q)) return false
    return true
  })
})

const catalogSorted = computed<UserItemResponse[]>(() => {
  if (!showUnowned.value) return []
  const arr = [...catalogFiltered.value]
  const dir = sortState.value.direction === 'asc' ? 1 : -1
  arr.sort((a, b) => dir * compareCatalog(a, b, sortState.value.key))
  return arr
})

const items = computed<UserItemResponse[]>(() => {
  if (showUnowned.value) {
    const start = (currentPage.value - 1) * CATALOG_PAGE_SIZE
    return catalogSorted.value.slice(start, start + CATALOG_PAGE_SIZE)
  }
  return data.value?.content ?? []
})

const totalPages = computed(() => {
  if (showUnowned.value) {
    return Math.max(1, Math.ceil(catalogSorted.value.length / CATALOG_PAGE_SIZE))
  }
  return data.value?.totalPages ?? 0
})

const selectedItem = computed<UserItemResponse | null>(() => {
  if (!selectedLinkId.value) return null
  if (showUnowned.value) {
    return catalogMerged.value.find((u) => u.linkId === selectedLinkId.value) ?? null
  }
  return items.value.find((u) => u.linkId === selectedLinkId.value) ?? null
})

const crateOpening = ref<{
  userItem: UserItemResponse
  result: CrateOpenResponse | null
  error: string | null
  busy: boolean
  equipBusy: boolean
  equippedLinkId: string | null
} | null>(null)

const crateRefreshed = ref(false)

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

const isSelectedLocked = computed(() => isLockedLink(selectedLinkId.value))

const isSelectedEquipped = computed(() => {
  const it = selectedItem.value
  return !!it && isEquipped(it)
})

const selectedEquippedVariantKey = computed<string | null>(() => {
  if (!isSelectedEquipped.value) return null
  const it = selectedItem.value?.item
  if (!it) return null
  return inventoryStore.equipped[it.typeKey]?.variantKey ?? null
})

const { borderShapeValue: equippedBorderShape, borderColorValue: equippedBorderColor }
  = useEquippedRenderProps(() => inventoryStore.equipped)

function isEquipped(userItem: UserItemResponse): boolean {
  if (!isOwnProfile.value) return false
  if (isLockedLink(userItem.linkId)) return false
  const slot = inventoryStore.equipped[userItem.item.typeKey]
  return !!slot && slot.linkId === userItem.linkId
}

function applyPendingHighlight() {
  const linkId = pendingHighlightId.value
  if (!linkId) return
  pendingHighlightId.value = null
  if (!data.value?.content.some((u) => u.linkId === linkId)) return
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

async function fetchInventory(silent = false) {
  if (!silent) loading.value = true
  try {
    const params = {
      ...paginationParams.value,
      typeKey: typeKeys.value.length > 0 ? (typeKeys.value as ItemTypeKey[]) : undefined,
      rarity: rarities.value.length > 0 ? rarities.value : undefined,
      modifierKey: modifierKeys.value.length > 0 ? modifierKeys.value : undefined,
      crateItemId: collectionIds.value.length > 0 ? collectionIds.value : undefined,
      search: search.value.trim() || undefined,
    }
    data.value = await getUserInventory(props.userId, params)
    if (selectedLinkId.value && !data.value.content.some((u) => u.linkId === selectedLinkId.value)) {
      selectedLinkId.value = data.value.content[0]?.linkId ?? null
    } else if (!selectedLinkId.value && data.value.content.length > 0) {
      selectedLinkId.value = data.value.content[0].linkId
    }
    applyPendingHighlight()
  } catch {
    data.value = null
  } finally {
    loading.value = false
  }
}

async function fetchCatalog() {
  catalogLoading.value = true
  try {
    const [all, owned] = await Promise.all([
      getItems(),
      getUserItems(props.userId),
    ])
    catalogAllItems.value = all
    catalogOwnedItems.value = owned
  } catch {
    catalogAllItems.value = []
    catalogOwnedItems.value = []
  } finally {
    catalogLoading.value = false
  }
}

function toggleShowUnowned() {
  showUnowned.value = !showUnowned.value
  selectedLinkId.value = null
  if (showUnowned.value && catalogAllItems.value.length === 0) {
    fetchCatalog()
  }
}

function selectItem(linkId: string) {
  selectedLinkId.value = linkId
  if (window.matchMedia('(max-width: 1023px)').matches) {
    mobileDetailOpen.value = true
  }
}

function isDisintegratable(userItem: UserItemResponse): boolean {
  if (!isOwnProfile.value) return false
  if (isLockedLink(userItem.linkId)) return false
  if (!userItem.item.tradeable) return false
  if ((userItem.item.worth ?? 0) <= 0) return false
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

function findLink(linkId: string): UserItemResponse | null {
  if (selectedItem.value?.linkId === linkId) return selectedItem.value
  return items.value.find((u) => u.linkId === linkId) ?? null
}

function reportActionError(err: unknown, fallback: string) {
  const parsed = parseApiError(err, fallback)
  showFeedback('error', parsed.fieldErrors[0]?.message ?? parsed.message)
}

async function handleEquip(linkId: string) {
  if (isLockedLink(linkId)) return
  const target = findLink(linkId)
  if (!target) return
  actionBusy.value = true
  try {
    await inventoryStore.equip(target.linkId, props.userId)
    if (target.item.typeKey === 'theme') {
      const theme = readThemeValue(target.item.value)
      if (theme) {
        themeStore.setThemeFromTokens(
          `item:${target.item.id}`,
          theme.tokens,
          buildEffectLayers(target.modifiers, target.unusualEffect),
        )
      }
    }
  } catch (err) {
    reportActionError(err, 'Could not equip item.')
  } finally {
    actionBusy.value = false
  }
}

async function handleSelectVariant(linkId: string, variantKey: string) {
  const target = findLink(linkId)
  if (!target) return
  actionBusy.value = true
  try {
    await inventoryStore.equip(target.linkId, props.userId, variantKey)
    if (target.item.typeKey === 'theme') {
      const theme = readThemeValue(resolveItemVariant(target.item.value as { variants?: ItemVariant[] }, variantKey))
      if (theme) {
        themeStore.setThemeFromTokens(
          `item:${target.item.id}`,
          theme.tokens,
          buildEffectLayers(target.modifiers, target.unusualEffect),
        )
      }
    }
  } catch (err) {
    reportActionError(err, 'Could not switch variant.')
  } finally {
    actionBusy.value = false
  }
}

async function handleUnequip(typeKeyArg: string) {
  actionBusy.value = true
  try {
    await inventoryStore.unequip(typeKeyArg as ItemTypeKey, props.userId)
  } catch (err) {
    reportActionError(err, 'Could not unequip item.')
  } finally {
    actionBusy.value = false
  }
}

async function handleApplyThemeMode(linkId: string, alt: boolean) {
  if (isLockedLink(linkId)) return
  const target = findLink(linkId)
  if (!target) return
  const theme = readThemeValue(target.item.value)
  const tokens = alt ? theme?.altTokens : theme?.tokens
  if (!tokens) return
  actionBusy.value = true
  try {
    if (!isEquipped(target)) {
      await inventoryStore.equip(target.linkId, props.userId)
    }
    themeStore.setThemeFromTokens(
      `item:${target.item.id}`,
      tokens,
      buildEffectLayers(target.modifiers, target.unusualEffect),
    )
  } catch (err) {
    reportActionError(err, 'Could not apply theme.')
  } finally {
    actionBusy.value = false
  }
}

const { downloadingLinkId, download } = useItemDownload()

async function handleDownload(linkId: string) {
  if (isLockedLink(linkId) || downloadingLinkId.value) return
  const target = findLink(linkId)
  if (!target) return
  try {
    const filename = await download(target)
    showFeedback('success', `Saved ${filename}`)
  } catch (err) {
    showFeedback('error', err instanceof Error ? err.message : 'Download failed - try again.')
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
  const removed = nextQuantity === null
  const apply = (list: UserItemResponse[]): UserItemResponse[] =>
    nextQuantity === null
      ? list.filter((u) => u.linkId !== linkId)
      : list.map((u) => (u.linkId === linkId ? { ...u, quantity: nextQuantity } : u))

  catalogOwnedItems.value = apply(catalogOwnedItems.value)
  selection.value = apply(selection.value)

  if (data.value) {
    const inPage = data.value.content.some((u) => u.linkId === linkId)
    data.value = {
      ...data.value,
      content: apply(data.value.content),
      totalElements:
        removed && inPage ? Math.max(0, data.value.totalElements - 1) : data.value.totalElements,
    }
  }

  if (removed && selectedLinkId.value === linkId) {
    selectedLinkId.value = items.value[0]?.linkId ?? null
  }
}

function openDisintegrateDialog(targets: UserItemResponse[]) {
  if (targets.length === 0) return
  disintegrateError.value = null
  pendingDisintegration.value = targets
}

function handleDisintegrateRequest(linkId: string) {
  if (isLockedLink(linkId)) return
  const target = findLink(linkId)
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
  const source = showUnowned.value ? catalogOwnedItems.value : (data.value?.content ?? [])
  return source.find((u) => u.item.id === itemId && !isLockedLink(u.linkId)) ?? null
}

const canOpenAnother = computed(() => {
  const current = crateOpening.value
  if (!current) return false
  return findOwnedCrateLink(current.userItem.item.id) !== null
})

async function requestCrateOpen(target: UserItemResponse) {
  try {
    const { openCrate } = await import('@/api/crates')
    const res = await openCrate(target.linkId)
    mutateLink(res.consumedLinkId, null)
    if (crateOpening.value) crateOpening.value = { ...crateOpening.value, result: res, busy: false }
  } catch (err) {
    const parsed = parseApiError(err, 'Could not open crate.')
    if (parsed.status === 404) mutateLink(target.linkId, null)
    if (crateOpening.value) {
      crateOpening.value = {
        ...crateOpening.value,
        error: parsed.fieldErrors[0]?.message ?? parsed.message,
        busy: false,
      }
    }
  }
}

function handleOpenCrate(linkId: string) {
  if (isLockedLink(linkId)) return
  const target = findLink(linkId)
  if (!target || target.item.typeKey !== 'crate') return
  mobileDetailOpen.value = false
  crateRefreshed.value = false
  crateOpening.value = {
    userItem: target,
    result: null,
    error: null,
    busy: true,
    equipBusy: false,
    equippedLinkId: null,
  }
  void nextTick(loadCrateEffects)
  requestCrateOpen(target)
}

function handleOpenAnother() {
  const current = crateOpening.value
  if (!current || current.busy) return
  const next = findOwnedCrateLink(current.userItem.item.id)
  if (!next) return
  crateRefreshed.value = false
  crateOpening.value = {
    userItem: next,
    result: null,
    error: null,
    busy: true,
    equipBusy: false,
    equippedLinkId: null,
  }
  requestCrateOpen(next)
}

async function handleCrateEquip(reward: UserItemResponse) {
  const current = crateOpening.value
  if (!current || current.equipBusy) return
  crateOpening.value = { ...current, equipBusy: true }
  try {
    await inventoryStore.equip(reward.linkId, props.userId)
    if (reward.item.typeKey === 'theme') {
      const theme = readThemeValue(reward.item.value)
      if (theme) {
        themeStore.setThemeFromTokens(
          `item:${reward.item.id}`,
          theme.tokens,
          buildEffectLayers(reward.modifiers, reward.unusualEffect),
        )
      }
    }
    if (crateOpening.value) {
      crateOpening.value = { ...crateOpening.value, equipBusy: false, equippedLinkId: reward.linkId }
    }
  } catch {
    if (crateOpening.value) crateOpening.value = { ...crateOpening.value, equipBusy: false }
  }
}

function refreshInventory(silent = false) {
  if (showUnowned.value) fetchCatalog()
  else fetchInventory(silent)
}

function handleCrateOpened() {
  crateRefreshed.value = true
  refreshInventory()
}

function handleCrateOverlayClose() {
  const rewardLinkId = crateOpening.value?.result?.reward.linkId ?? null
  const refreshed = crateRefreshed.value
  crateOpening.value = null
  crateRefreshed.value = false
  if (rewardLinkId) selectedLinkId.value = rewardLinkId
  if (!refreshed) refreshInventory()
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
    refreshInventory(true)
  } catch (err) {
    const parsed = parseApiError(err, 'Could not disintegrate.')
    disintegrateError.value = parsed.fieldErrors[0]?.message ?? parsed.message
    if (parsed.status === 409 && isOwnProfile.value && authStore.userId) {
      await inventoryStore.fetchEquipped(authStore.userId, true)
    }
    if (parsed.status === 404) refreshInventory(true)
  } finally {
    actionBusy.value = false
  }
}

watch([typeKeys, rarities, modifierKeys, collectionIds, search], () => {
  resetPage()
  selectedLinkId.value = null
})

watch(
  [() => props.userId, paginationParams, typeKeys, rarities, modifierKeys, collectionIds, search],
  () => {
    if (!showUnowned.value) fetchInventory()
  },
  { immediate: true },
)

watch(() => props.userId, () => {
  if (showUnowned.value) fetchCatalog()
})

watch(showUnowned, (on) => {
  selectMode.value = false
  selection.value = []
  if (on) {
    if (catalogAllItems.value.length === 0) fetchCatalog()
  } else {
    fetchInventory()
  }
})

watch(
  [showUnowned, catalogSorted, currentPage],
  () => {
    if (!showUnowned.value) return
    if (selectedLinkId.value && catalogSorted.value.some((u) => u.linkId === selectedLinkId.value)) return
    selectedLinkId.value = items.value[0]?.linkId ?? null
  },
)

watch(() => props.userId, (id) => {
  if (!id) return
  fetchCollections()
  if (isOwnProfile.value) {
    inventoryStore.fetchEquipped(id)
    essenceStore.fetchBalance(true)
  }
}, { immediate: true })

watch([totalPages, currentPage], () => {
  if (loading.value || catalogLoading.value) return
  if (totalPages.value >= 1 && currentPage.value > totalPages.value) {
    setPage(totalPages.value)
  }
})

onMounted(() => {
  if (showUnowned.value && catalogAllItems.value.length === 0) fetchCatalog()
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

      <div class="inv-tab__actions-bar">
        <button
          type="button"
          class="inv-tab__unowned-toggle"
          :class="{ 'inv-tab__unowned-toggle--active': showUnowned }"
          :aria-pressed="showUnowned"
          aria-label="Show unowned items"
          @click="toggleShowUnowned"
        >
          <span class="inv-tab__unowned-track">
            <span class="inv-tab__unowned-thumb" />
          </span>
          <span class="inv-tab__unowned-label">Unowned</span>
        </button>

        <BaseButton v-if="isOwnProfile && !showUnowned" size="sm" @click="toggleSelectMode">
          {{ selectMode ? 'Done' : 'Select' }}
        </BaseButton>

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

    <div class="inv-tab__layout">
      <div class="inv-tab__main">
        <div v-if="loading || (showUnowned && catalogLoading)" class="inv-tab__grid">
          <SkeletonLoader v-for="i in 12" :key="i" variant="card" />
        </div>

        <EmptyState v-else-if="items.length === 0" message="No items found." />

        <div v-else class="inv-tab__grid">
          <InventoryItemCell
            v-for="userItem in items"
            :key="userItem.linkId"
            :data-link-id="userItem.linkId"
            :user-item="userItem"
            :selected="userItem.linkId === selectedLinkId"
            :highlighted="userItem.linkId === flashLinkId"
            :equipped="isEquipped(userItem)"
            :locked="isLockedLink(userItem.linkId)"
            :select-mode="selectMode"
            :checked="selectedLinkIds.has(userItem.linkId)"
            :selectable="isDisintegratable(userItem)"
            @select="selectItem"
            @toggle="toggleSelection"
          />
        </div>

        <PaginationControls
          v-if="totalPages > 1"
          :page="currentPage"
          :total-pages="totalPages"
          @update:page="setPage"
        />
      </div>

      <aside class="inv-tab__detail">
        <InventoryDetailPanel
          :user-item="selectedItem"
          :is-own-profile="isOwnProfile"
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
          @select-variant="handleSelectVariant"
          @unequip="handleUnequip"
          @disintegrate="handleDisintegrateRequest"
          @open-crate="handleOpenCrate"
          @download="handleDownload"
        />
      </aside>
    </div>

    <BaseModal :open="mobileDetailOpen" :title="selectedItem?.item.name" @close="mobileDetailOpen = false">
      <InventoryDetailPanel
        :user-item="selectedItem"
        :is-own-profile="isOwnProfile"
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
        @select-variant="handleSelectVariant"
        @unequip="handleUnequip"
        @disintegrate="handleDisintegrateRequest"
        @open-crate="handleOpenCrate"
        @download="handleDownload"
      />
    </BaseModal>

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
  gap: var(--space-xs);
  align-items: center;
}

.inv-tab__filters :deep(.base-select) {
  flex: 0 0 auto;
}

.inv-tab__filters :deep(.base-select__trigger) {
  min-width: 150px;
  padding: var(--space-xs) var(--space-sm);
}

.inv-tab__search {
  flex: 1 1 190px;
  min-width: 140px;
  max-width: 320px;
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

.inv-tab__actions-right {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.inv-tab__unowned-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  font: inherit;
}

.inv-tab__unowned-track {
  position: relative;
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: var(--bg-overlay);
  border: 1px solid var(--text-tertiary);
  transition: background 120ms ease, border-color 120ms ease;
}

.inv-tab__unowned-toggle--active .inv-tab__unowned-track {
  background: color-mix(in srgb, var(--accent) 40%, transparent);
  border-color: var(--accent);
}

.inv-tab__unowned-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-tertiary);
  transition: transform 120ms ease, background 120ms ease;
}

.inv-tab__unowned-toggle--active .inv-tab__unowned-thumb {
  transform: translateX(12px);
  background: var(--accent);
}

.inv-tab__unowned-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  user-select: none;
}

.inv-tab__wallet {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
  gap: 6px;
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

.inv-tab__layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-lg);
  align-items: start;
}

.inv-tab__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}

.inv-tab__grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-md);
}

@media (max-width: 1023px) {
  .inv-tab__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 639px) {
  .inv-tab__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.inv-tab__detail {
  position: sticky;
  top: calc(var(--navbar-height, 64px) + var(--space-md));
}

@media (max-width: 1023px) {
  .inv-tab__layout {
    grid-template-columns: 1fr;
  }

  .inv-tab__detail {
    display: none;
  }
}
</style>
