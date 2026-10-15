import type {
  CrateContentResponse,
  ItemModifierRef,
  ItemModifierResponse,
  ItemRarity,
  ItemResponse,
  ItemTypeKey,
  UserItemResponse,
} from '@/types/api/items'
import type { ItemVariant } from '@/types/cosmetics/common'
import type { TitleValue } from '@/types/cosmetics/title'
import {
  isObj,
  isString,
  readClanTitleEffectValue,
  readThemeValue,
} from '@/utils/cosmetics/readers'
import { formatFullDate } from '@/utils/formatters'

const EQUIPPABLE_TYPE_KEYS = new Set<ItemTypeKey>([
  'badge',
  'title',
  'profile_border',
  'profile_border_shape',
  'profile_border_color',
  'theme',
  'profile_visual',
  'profile_background',
  'profile_thumbnail_background',
  'clan_tag_card',
  'clan_title_effect',
  'clan_border',
])

export function isEquippableTypeKey(typeKey: ItemTypeKey): boolean {
  return EQUIPPABLE_TYPE_KEYS.has(typeKey)
}

export function isItemObtainable(
  item: Pick<ItemResponse, 'obtainableUntil'>,
  now: number = Date.now(),
): boolean {
  if (!item.obtainableUntil) return true
  return new Date(item.obtainableUntil).getTime() > now
}

export function obtainableUntilSentence(
  item: Pick<ItemResponse, 'obtainableUntil'>,
): string | null {
  if (!item.obtainableUntil) return null
  const verb = isItemObtainable(item) ? 'Is' : 'Was'
  return `${verb} available to add to campaign rewards until ${formatFullDate(item.obtainableUntil)}.`
}

export const RARITY_ORDER: ItemRarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
  'mythic',
]

export function rarityClass(rarity: ItemRarity): string {
  return `rarity--${rarity}`
}

export interface CrateRarityGroup {
  rarity: ItemRarity
  items: CrateContentResponse[]
  chance: number
}

export function groupCrateContentsByRarity(contents: CrateContentResponse[]): CrateRarityGroup[] {
  const totalWeight = contents.reduce((sum, c) => sum + c.dropWeight, 0)
  const byRarity = new Map<ItemRarity, CrateContentResponse[]>()
  for (const c of contents) {
    const list = byRarity.get(c.rewardItem.rarity)
    if (list) list.push(c)
    else byRarity.set(c.rewardItem.rarity, [c])
  }
  return [...RARITY_ORDER]
    .reverse()
    .filter((r) => byRarity.has(r))
    .map((rarity) => {
      const items = byRarity.get(rarity) as CrateContentResponse[]
      const weight = items.reduce((sum, c) => sum + c.dropWeight, 0)
      return { rarity, items, chance: totalWeight > 0 ? weight / totalWeight : 0 }
    })
}

export const UNUSUAL_MODIFIER_KEY = 'unusual'

const SUBTLE_MODIFIER_KEYS = new Set<string>(['normal', 'unique', 'standard'])

function isSubtleModifierKey(key: string | null | undefined): boolean {
  if (!key) return true
  return SUBTLE_MODIFIER_KEYS.has(key)
}

export function modifierAccentHex(
  modifier: { key: string; colorHex?: string | null } | null | undefined,
  fallbackHex?: string | null,
): string | null {
  if (!modifier) return null
  return modifier.colorHex ?? fallbackHex ?? null
}

export function sortModifiersByKey<T extends { key: string }>(modifiers: T[]): T[] {
  return [...modifiers].sort((a, b) => a.key.localeCompare(b.key))
}

export function resolveModifierRefs(
  keys: unknown,
  byKey: Map<string, ItemModifierResponse>,
): ItemModifierRef[] {
  if (!Array.isArray(keys)) return []
  return keys.map((key) => {
    const found = byKey.get(key as string)
    if (found) {
      return { id: found.id, key: found.key, name: found.name, colorHex: found.colorHex, effectSpec: found.effectSpec }
    }
    return { id: key as string, key: key as string, name: key as string, colorHex: '', effectSpec: null }
  })
}

export function visibleModifiers<T extends { key: string }>(modifiers: T[]): T[] {
  return modifiers.filter((m) => !isSubtleModifierKey(m.key))
}

export function primaryModifier<T extends { key: string }>(modifiers: T[]): T | null {
  const visible = visibleModifiers(modifiers)
  if (visible.length > 0) return sortModifiersByKey(visible)[0]
  return modifiers[0] ?? null
}

export function isBorderTypeKey(typeKey: string | null | undefined): boolean {
  return typeKey === 'profile_border_shape' || typeKey === 'profile_border_color'
}

export function displayItemName(
  modifiers: ReadonlyArray<{ key: string; name: string }> | null | undefined,
  itemName: string,
): string {
  if (!modifiers || modifiers.length === 0) return itemName
  const named = sortModifiersByKey(modifiers.filter((m) => m.key !== 'normal'))
  if (named.length === 0) return itemName
  return `${named.map((m) => m.name).join(' ')} ${itemName}`
}

export function readClanEquipped<T extends { variants?: ItemVariant[] }>(
  equipped: ItemResponse[] | null | undefined,
  typeKey: string,
  read: (value: unknown) => T | null,
): T | null {
  const item = equipped?.find((i) => i.typeKey === typeKey)
  const value = item ? read(item.value) : null
  return value ? resolveItemVariant(value, item?.variantKey) : null
}

export function readClanTitle(clan: { name: string; equipped: ItemResponse[] | null }): TitleValue | null {
  const effect = readClanEquipped(clan.equipped, 'clan_title_effect', readClanTitleEffectValue)
  return effect ? { ...effect, text: clan.name } : null
}

export function readItemVariants(value: unknown): ItemVariant[] | null {
  if (!isObj(value) || !Array.isArray(value.variants)) return null
  const variants = value.variants.filter(
    (v): v is ItemVariant => isObj(v) && isString(v.key) && isString(v.label),
  )
  return variants.length > 0 ? variants : null
}

export function resolveItemVariant<T extends { variants?: ItemVariant[] }>(
  value: T,
  variantKey: string | null | undefined,
): T {
  if (!variantKey || !value.variants) return value
  const variant = value.variants.find((v) => v.key === variantKey)
  if (!variant) return value
  const overrides = Object.fromEntries(
    Object.entries(variant).filter(([k]) => k !== 'key' && k !== 'label' && k !== 'recolor'),
  )
  const merged = { ...value, ...overrides }
  return variant.recolor ? recolorValue(merged, variant.recolor) : merged
}

function recolorValue<T>(value: T, map: Record<string, string>): T {
  const lookup = new Map(Object.entries(map).map(([from, to]) => [from.toLowerCase(), to]))
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') return lookup.get(node.toLowerCase()) ?? node
    if (Array.isArray(node)) return node.map(walk)
    if (isObj(node)) {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, k === 'variants' ? v : walk(v)]))
    }
    return node
  }
  return walk(value) as T
}

export function resolveEquippedVariant<T extends { variants?: ItemVariant[] }>(
  slot: UserItemResponse | null | undefined,
  read: (value: unknown) => T | null,
): T | null {
  if (!slot) return null
  const value = read(slot.item.value)
  return value ? resolveItemVariant(value, slot.variantKey) : null
}

export interface ItemVariantPreview {
  key: string
  label: string
  item: ItemResponse
}

function themeModeLabel(tokens: Record<string, string>): string {
  return tokens.base === 'light' ? 'Light' : 'Dark'
}

export function itemVariantPreviews(item: ItemResponse): ItemVariantPreview[] | null {
  const variants = readItemVariants(item.value)
  if (variants && variants.length > 1) {
    return variants.map((v) => ({
      key: v.key,
      label: v.label,
      item: {
        ...item,
        value: resolveItemVariant(
          item.value as { variants?: ItemVariant[] },
          v.key,
        ) as ItemResponse['value'],
      },
    }))
  }
  if (item.typeKey === 'theme') {
    const theme = readThemeValue(item.value)
    if (theme?.altTokens) {
      return [
        { key: 'default', label: themeModeLabel(theme.tokens), item },
        {
          key: 'alt',
          label: themeModeLabel(theme.altTokens),
          item: {
            ...item,
            value: { ...theme, tokens: theme.altTokens } as unknown as ItemResponse['value'],
          },
        },
      ]
    }
  }
  return null
}

export interface TokenContext {
  serial?: number | null
  wearLevel?: number | null
  stats?: Record<string, number | string | null | undefined>
}

const TOKEN_RE = /\$\{([a-zA-Z_][\w.:]*)\}/g

export function substituteTokens(text: string, ctx: TokenContext): string | null {
  let missing = false
  const out = text.replace(TOKEN_RE, (_match, token: string) => {
    let resolved: unknown
    if (token === 'serial') resolved = ctx.serial
    else if (token === 'wearLevel') resolved = ctx.wearLevel
    else if (token.startsWith('stat:') && ctx.stats) resolved = ctx.stats[token.slice(5)]
    if (resolved === undefined || resolved === null) {
      missing = true
      return ''
    }
    return String(resolved)
  })
  return missing ? null : out
}

export function asUserItem(item: ItemResponse, overrides: Partial<UserItemResponse> = {}): UserItemResponse {
  return {
    linkId: item.id,
    item,
    modifiers: [],
    unusualEffect: null,
    serialNumber: null,
    quantity: 1,
    source: 'manual',
    sourceId: null,
    awardedByStaffId: null,
    reason: null,
    awardedAt: '',
    ...overrides,
  }
}

export function userItemTokenContext(
  userItem: Pick<UserItemResponse, 'serialNumber' | 'counters'>,
): TokenContext {
  return { serial: userItem.serialNumber, stats: userItem.counters ?? undefined }
}
