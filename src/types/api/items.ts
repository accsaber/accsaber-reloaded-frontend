import type { PaginationParams } from '../pagination'
import type { PlayerRef } from './common'
import type {
  ProfileBackgroundValue,
  ProfileThumbnailBackgroundValue,
} from '@/types/cosmetics/background'
import type { BorderColorValue, BorderShapeValue } from '@/types/cosmetics/border'
import type { ModifierEffectSpec } from '@/types/cosmetics/effects'
import type {
  BadgeValue,
  DownloadableFileValue,
  PerkValue,
  StatisticValue,
} from '@/types/cosmetics/misc'
import type { ThemeValue } from '@/types/cosmetics/theme'
import type { TitleValue } from '@/types/cosmetics/title'

export type ItemSource =
  | 'milestone'
  | 'milestone_set'
  | 'campaign_milestone'
  | 'campaign_difficulty'
  | 'campaign_completion'
  | 'level'
  | 'trade'
  | 'manual'
  | 'crate_drop'
  | 'supporter_tier'

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
  | 'saber'
  | 'item_pedestal'
  | 'clan_title_effect'
  | 'clan_tag_card'

export type ItemTypeKey = KnownItemTypeKey | (string & {})

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export interface ItemModifierRef {
  id: string
  key: string
  name: string
  colorHex: string
  effectSpec: ModifierEffectSpec | null
}

export interface UnusualEffectRef {
  id: string
  key: string
  name: string
  effectSpec: ModifierEffectSpec | null
}

export interface ItemModifierResponse {
  id: string
  key: string
  name: string
  description: string | null
  colorHex: string
  effectSpec: ModifierEffectSpec | null
  globalDropChance: number | null
  seasonStart: string | null
  seasonEnd: string | null
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
  | DownloadableFileValue

export interface ItemResponse {
  id: string
  typeId: string
  typeKey: ItemTypeKey
  name: string
  description: string | null
  iconUrl: string | null
  value: ItemValue | null
  rarity: ItemRarity
  downloadable: boolean
  serialized: boolean
  tradeable: boolean
  visible: boolean
  active: boolean
  deprecated: boolean
  stackable: boolean
  welcomeGrant: boolean
  missionPoolable: boolean
  unlockLevel: number | null
  worth: number | null
  requirement: string | null
  obtainableUntil: string | null
  createdAt: string
  variantKey?: string
}

export interface CrateContentResponse {
  rewardItem: ItemResponse
  dropWeight: number
  dropChance: number
}

export interface CrateModifierResponse {
  modifier: ItemModifierRef
  dropChance: number
}

export interface CrateOpenResponse {
  id: string
  crate: ItemResponse
  consumedLinkId: string
  reward: UserItemResponse
  rolledAt: string
}

export interface UnusualEffectResponse extends UnusualEffectRef {
  description: string | null
  active: boolean
  createdAt: string
}

export interface UnusualEffectCrateGroup {
  crateId: string
  crateName: string
  crateIconUrl: string | null
  effects: UnusualEffectResponse[]
}

export interface UnusualEffectGroupsResponse {
  groups: UnusualEffectCrateGroup[]
  ungrouped: UnusualEffectResponse[]
}

export interface CreateUnusualEffectRequest {
  key: string
  name: string
  description?: string | null
  effectSpec: ModifierEffectSpec
}

export interface UpdateUnusualEffectRequest {
  name?: string | null
  description?: string | null
  effectSpec?: ModifierEffectSpec | null
}

export interface UserItemResponse {
  linkId: string
  item: ItemResponse
  modifiers: ItemModifierRef[]
  unusualEffect: UnusualEffectRef | null
  serialNumber: number | null
  quantity: number
  counters?: Record<string, number> | null
  source: ItemSource
  sourceId: string | null
  crate?: ItemResponse | null
  awardedByStaffId: string | null
  reason: string | null
  awardedAt: string
  variantKey?: string | null
  pendingTrade?: boolean
}

export type InventoryEntry = Omit<UserItemResponse, 'linkId'> & { linkId?: string }

export type EquippedItemsResponse = Partial<Record<ItemTypeKey, UserItemResponse | null>>

export interface DisintegrateEntryRequest {
  linkId: string
  quantity?: number
}

export interface DisintegrationEntry {
  linkId: string
  itemId: string
  quantityDisintegrated: number
  remainingQuantity?: number | null
  essenceGained: number
}

export interface DisintegrationResponse {
  entries: DisintegrationEntry[]
  essenceGained: number
  balance: number
}

export interface EssenceBalance {
  balance: number
  reserved: number
}

export interface ItemListParams {
  typeId?: string
  tradeable?: boolean
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
  typeKey?: ItemTypeKey | ItemTypeKey[]
  rarity?: ItemRarity | ItemRarity[]
  modifierKey?: string | string[]
  crateItemId?: string | string[]
  tradeable?: boolean
  search?: string
}

export type ItemHolderSort = 'RECENT' | 'RANK' | 'FOLLOWING'

export interface ItemHolderListParams extends PaginationParams {
  sort?: ItemHolderSort
  modifier?: string | string[]
}

export interface ItemHolderResponse {
  player: PlayerRef
  quantity: number
  lowestSerial: number | null
  acquiredAt: string
  modifiers: string[]
  ranking: number | null
  following: boolean
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
  value?: Record<string, unknown>
  tradeable?: boolean
  visible?: boolean
  rarity?: ItemRarity
  stackable?: boolean
  welcomeGrant?: boolean
  missionPoolable?: boolean
  active?: boolean
  worth?: number | null
  requirement?: string | null
  unlockLevel?: number | null
}

export interface UpdateItemRequest {
  name?: string
  description?: string
  iconUrl?: string
  value?: Record<string, unknown>
  tradeable?: boolean
  visible?: boolean
  rarity?: ItemRarity
  stackable?: boolean
  welcomeGrant?: boolean
  missionPoolable?: boolean
  worth?: number | null
  requirement?: string | null
  unlockLevel?: number | null
}

export interface AwardItemRequest {
  userId: string
  itemId: string
  reason?: string
  modifierKeys?: string[]
  unusualEffectId?: string
  quantity?: number
}

export interface EquipItemRequest {
  linkId: string
  variantKey?: string
}

export interface PatchItemModifierRequest {
  globalDropChance: number | null
  seasonStart: string | null
  seasonEnd: string | null
}
