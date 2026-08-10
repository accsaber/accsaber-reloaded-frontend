export type SupporterTier = 'bronze' | 'silver' | 'gold'

export interface SupporterStateResponse {
  userId: string
  currentTier: SupporterTier | null
  currentTierDisplayName: string | null
  monthlyCostCents: number | null
  tierStartedAt: string | null
  lastDebitAt: string | null
  balanceCents: number
  lifetimeSupportedCents: number
  hasEverSupported: boolean
}

export interface SupporterCreditEntry {
  userId: string
  name: string
  avatarUrl: string
  cdnAvatarUrl?: string | null
  country: string
  currentTier: SupporterTier | null
  currentTierDisplayName: string | null
  lifetimeSupportedCents: number
  tierStartedAt: string | null
  firstSupportedAt: string
}

export type SupporterCreditStatus = 'all' | 'active' | 'past'

export interface SupporterCreditsParams {
  status?: SupporterCreditStatus
  page?: number
  size?: number
  sort?: string
}

export const SUPPORTER_TIER_RANK: Record<SupporterTier, number> = {
  bronze: 1,
  silver: 2,
  gold: 3,
}

export const SUPPORTER_TIER_PALETTE: Record<SupporterTier, { base: string; highlight: string; shadow: string }> = {
  bronze: { shadow: '#5a1d0a', base: '#d96a2c', highlight: '#ffd6a8' },
  silver: { shadow: '#252948', base: '#8a96b0', highlight: '#f5efe2' },
  gold: { shadow: '#6a2f0a', base: '#e8b020', highlight: '#fff0b0' },
}

export const SUPPORTER_TIER_DISPLAY: Record<SupporterTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
}

export interface SupporterTierResponse {
  tierKey: string
  displayName: string
  monthlyCostCents: number
  sortOrder: number
}

export type KofiEventType = 'donation' | 'subscription' | 'shop_order' | 'commission' | 'unknown'

export const KOFI_EVENT_TYPES: KofiEventType[] = [
  'donation',
  'subscription',
  'shop_order',
  'commission',
  'unknown',
]

export const KOFI_EVENT_TYPE_DISPLAY: Record<KofiEventType, string> = {
  donation: 'Donation',
  subscription: 'Subscription',
  shop_order: 'Shop order',
  commission: 'Commission',
  unknown: 'Unknown',
}

export type KofiClaimSource = 'webhook_email_match' | 'bot_role_event' | 'admin_assign'

export const KOFI_CLAIM_SOURCE_DISPLAY: Record<KofiClaimSource, string> = {
  webhook_email_match: 'Email match',
  bot_role_event: 'Discord role',
  admin_assign: 'Admin',
}

export interface KofiEventResponse {
  kofiTransactionId: string
  type: KofiEventType
  email: string | null
  fromName: string | null
  amountCents: number
  currency: string
  tierName: string | null
  subscription: boolean
  firstSubscription: boolean
  receivedAt: string
  claimedUserId: string | null
  claimedUserName: string | null
  claimedUserAvatarUrl: string | null
  claimedUserCdnAvatarUrl: string | null
  claimedAt: string | null
  claimSource: KofiClaimSource | null
}

export type KofiEventStatus = 'all' | 'unclaimed' | 'claimed'

export interface KofiEventsParams {
  status?: KofiEventStatus
  userId?: string
  search?: string
  page?: number
  size?: number
  sort?: string
}

export interface ClaimSupporterEventRequest {
  kofiTransactionId: string
  userId: string
}

export interface ManualSupporterGrantRequest {
  userId: string
  amountCents: number
  tierName: string
  type: KofiEventType
  fromName?: string
  email?: string
  note?: string
}

export interface SupporterGrantResponse {
  kofiTransactionId: string
  userId: string
  tier: string | null
  amountCents: number
  type: string
}
