export type SupporterTier = 'bronze' | 'silver' | 'gold'

export interface SupporterStateResponse {
  userId: number
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
  userId: number
  name: string
  avatarUrl: string
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
