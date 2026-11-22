import type {
  EquippedItemsResponse,
  ItemModifierRef,
  ItemResponse,
  UnusualEffectRef,
  UserItemResponse,
} from '@/types/api/items'
import { asUserItem } from '@/utils/items'
import { isCreativesSubdomain } from '@/utils/subdomain'
import { defineStore } from 'pinia'
import { computed, reactive, watch } from 'vue'

const STORAGE_KEY = 'creatives:preview'

export const PREVIEW_SLOTS = [
  { key: 'borderShape', label: 'Border Shape', typeKey: 'profile_border_shape' },
  { key: 'borderColor', label: 'Border Color', typeKey: 'profile_border_color' },
  { key: 'title', label: 'Title', typeKey: 'title' },
  { key: 'thumbnail', label: 'Thumbnail', typeKey: 'profile_thumbnail_background' },
  { key: 'theme', label: 'Theme', typeKey: 'theme' },
] as const

export type PreviewSlotKey = (typeof PREVIEW_SLOTS)[number]['key']

interface PreviewSlot {
  item: ItemResponse | null
  variant: string | null
  effect: UnusualEffectRef | null
  modifiers: ItemModifierRef[]
}

type PreviewSlots = Record<PreviewSlotKey, PreviewSlot>

function loadSlots(): PreviewSlots {
  let saved: Partial<PreviewSlots> = {}
  if (isCreativesSubdomain) {
    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<PreviewSlots>
    } catch {
      saved = {}
    }
  }
  return Object.fromEntries(
    PREVIEW_SLOTS.map(({ key }) => {
      const slot = saved[key]
      return [
        key,
        Array.isArray(slot?.modifiers) ? slot : { item: null, variant: null, effect: null, modifiers: [] },
      ]
    }),
  ) as PreviewSlots
}

function placeholderItem(typeKey: string): ItemResponse {
  return {
    id: `preview-placeholder:${typeKey}`,
    typeId: '',
    typeKey,
    name: '',
    description: null,
    iconUrl: null,
    value: null,
    rarity: 'common',
    downloadable: false,
    serialized: false,
    tradeable: false,
    visible: false,
    active: false,
    deprecated: false,
    stackable: false,
    welcomeGrant: false,
    missionPoolable: false,
    unlockLevel: null,
    worth: null,
    requirement: null,
    obtainableUntil: null,
    createdAt: '',
  }
}

function syntheticEntry(
  item: ItemResponse,
  opts?: {
    unusualEffect?: UnusualEffectRef | null
    variantKey?: string | null
    modifiers?: ItemModifierRef[]
  },
): UserItemResponse {
  return asUserItem(item, {
    linkId: `preview:${item.id}`,
    modifiers: opts?.modifiers ?? [],
    unusualEffect: opts?.unusualEffect ?? null,
    quantity: 0,
    variantKey: opts?.variantKey ?? null,
  })
}

export const usePreviewStore = defineStore('creativesPreview', () => {
  const slots = reactive(loadSlots())

  const overrides = computed<EquippedItemsResponse>(() => {
    const result: EquippedItemsResponse = {}
    for (const { key, typeKey } of PREVIEW_SLOTS) {
      const slot = slots[key]
      if (key === 'theme' || !(slot.item || slot.effect || slot.modifiers.length)) continue
      result[typeKey] = syntheticEntry(slot.item ?? placeholderItem(typeKey), {
        variantKey: slot.variant,
        unusualEffect: slot.effect,
        modifiers: slot.modifiers,
      })
    }
    return result
  })

  if (isCreativesSubdomain) {
    let canPersist = true
    watch(
      slots,
      () => {
        if (!canPersist) return
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slots))
        } catch {
          canPersist = false
        }
      },
      { deep: true },
    )
  }

  return { slots, overrides }
})
