import type { PaginationParams } from '../pagination'

export type ItemSource =
  | 'milestone'
  | 'milestone_set'
  | 'campaign_milestone'
  | 'level'
  | 'trade'
  | 'manual'

export type KnownItemTypeKey =
  | 'badge'
  | 'title'
  | 'profile_border'
  | 'profile_border_shape'
  | 'profile_border_color'
  | 'theme'
  | 'profile_visual'
  | 'profile_background'
  | 'profile_thumbnail_background'
  | 'statistic'
  | 'perk'

export type ItemTypeKey = KnownItemTypeKey | (string & {})

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | (string & {})

export type Loop = 'loop' | 'pingpong' | 'once'

export interface GradientStop {
  atPct: number
  hex: string
}

export type Gradient =
  | { type: 'linear'; angleDeg: number; stops: GradientStop[] }
  | { type: 'radial'; centerXPct?: number; centerYPct?: number; radiusPct?: number; stops: GradientStop[] }
  | { type: 'conic'; centerXPct?: number; centerYPct?: number; angleDeg?: number; stops: GradientStop[] }

export interface VisualEffect {
  type: string
  [param: string]: unknown
}

export interface AssetSet {
  svg?: string
  raster?: { '1x'?: string; '2x'?: string; '3x'?: string; '4x'?: string; [k: string]: string | undefined }
  video?: string
  altText: string
}

export interface ModifierEffectSpec {
  contractVersion: 1
  compositions: Composition[]
}

export interface Composition {
  type: string
  [param: string]: unknown
}

export interface ItemModifierRef {
  id: string
  key: string
  name: string
  colorHex: string
  effectSpec: ModifierEffectSpec
}

export interface ItemModifierResponse {
  id: string
  key: string
  name: string
  description: string | null
  colorHex: string
  effectSpec: ModifierEffectSpec
  active: boolean
  createdAt: string
}

export interface ItemTypeResponse {
  id: string
  parentTypeId: string | null
  key: ItemTypeKey
  name: string
  description: string | null
  valueSchema: Record<string, unknown> | null
  active: boolean
  createdAt: string
}

export interface TitleStateValue {
  atMs: number
  color?: string
  gradient?: Gradient
  fontWeight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  fontStyle?: 'normal' | 'italic'
  letterSpacingPx?: number
  effects?: VisualEffect[]
}

export interface TitleValue {
  text: string
  states: TitleStateValue[]
  durationMs?: number
  loop?: Loop
  easing?: Easing
}

export interface BorderShapePathValue {
  d: string
  stroke?: string
  strokeWidth?: number
  fill?: string
  strokeLinecap?: 'butt' | 'round' | 'square'
  strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'arcs'
  strokeDasharray?: string
  strokeOpacity?: number
  fillOpacity?: number
  transform?: string
}

export interface BorderShapeStateValue {
  atMs: number
  paths: BorderShapePathValue[]
  filters?: VisualEffect[]
}

export interface BorderShapeValue {
  viewBox?: string
  avatarMask?: string
  states: BorderShapeStateValue[]
  durationMs?: number
  loop?: Loop
  easing?: Easing
}

export interface BorderColorStateValue {
  atMs: number
  fill: { type: 'solid'; hex: string } | Gradient
  filters?: VisualEffect[]
}

export interface BorderColorValue {
  states: BorderColorStateValue[]
  durationMs?: number
  loop?: Loop
  easing?: Easing
}

export interface BadgeValue {
  asset: AssetSet
  tint?: string
  effects?: VisualEffect[]
}

export type BackgroundFit = 'cover' | 'contain' | 'tile' | 'center'

export type BackgroundBlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light'
  | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity'

export interface ProfileBackgroundValue {
  asset: AssetSet
  fit?: BackgroundFit
  opacity?: number
  blendMode?: BackgroundBlendMode
  filters?: VisualEffect[]
  parallax?: { depth?: number; [k: string]: unknown }
}

export interface ProfileThumbnailBackgroundValue {
  asset: AssetSet
  fit?: BackgroundFit
  opacity?: number
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
}

export interface ThemeValue {
  tokens: Record<string, string>
}

export interface StatisticValue {
  statKey: string
  label: string
  icon?: string
  format?: {
    type: 'integer' | 'decimal' | 'duration' | 'percent' | 'custom'
    decimals?: number
    suffix?: string
    prefix?: string
  }
}

export interface PerkValue {
  effect: string
  amount?: number
}

export type ItemValue =
  | TitleValue
  | BorderShapeValue
  | BorderColorValue
  | BadgeValue
  | ProfileBackgroundValue
  | ProfileThumbnailBackgroundValue
  | ThemeValue
  | StatisticValue
  | PerkValue

export interface ItemResponse {
  id: string
  typeId: string
  typeKey: ItemTypeKey
  name: string
  description: string | null
  iconUrl: string | null
  value: ItemValue | null
  rarity: ItemRarity
  tradeable: boolean
  visible: boolean
  active: boolean
  deprecated: boolean
  unlockLevel: number | null
  stackable: boolean
  worth: number | null
  requirement: string | null
  createdAt: string
}

export interface UserItemResponse {
  linkId: string
  item: ItemResponse
  modifiers: ItemModifierRef[]
  serialNumber: number | null
  quantity: number
  source: ItemSource
  sourceId: string | null
  awardedByStaffId: string | null
  reason: string | null
  awardedAt: string
}

export type EquippedItemsResponse = Partial<Record<ItemTypeKey, UserItemResponse | null>>

export interface ItemListParams {
  typeId?: string
}

export interface AdminItemListParams extends ItemListParams {
  includeInactive?: boolean
}

export interface AdminItemTypeListParams {
  includeInactive?: boolean
}

export interface UserItemListParams {
  typeKey?: ItemTypeKey
}

export interface InventoryListParams extends PaginationParams {
  typeKey?: ItemTypeKey
  rarity?: ItemRarity
  modifierKey?: string | string[]
  tradeable?: boolean
  search?: string
}

export interface CreateItemTypeRequest {
  parentTypeId?: string
  key: string
  name: string
  description?: string
  valueSchema?: Record<string, unknown>
}

export interface UpdateItemTypeRequest {
  name?: string
  description?: string
  valueSchema?: Record<string, unknown>
}

export interface CreateItemRequest {
  typeId: string
  name: string
  description?: string
  iconUrl?: string
  value?: ItemValue
  tradeable?: boolean
  visible?: boolean
  rarity?: ItemRarity
  stackable?: boolean
  worth?: number | null
  requirement?: string | null
}

export interface UpdateItemRequest {
  name?: string
  description?: string
  iconUrl?: string
  value?: ItemValue
  tradeable?: boolean
  visible?: boolean
  rarity?: ItemRarity
  stackable?: boolean
  worth?: number | null
  requirement?: string | null
}

export interface AwardItemRequest {
  userId: string
  itemId: string
  reason?: string
  modifierKeys?: string[]
  quantity?: number
}

export interface EquipItemRequest {
  linkId: string
}
