import type { ItemResponse } from './items'

export type ClanRole = 'member' | 'officer' | 'commander' | 'founder'

export type ClanArena = 'mixed' | 'random' | 'category_turf' | 'complexity_turf'

export type ClanRuleset = 'duel' | 'berserker'

export type ClanWarStatus = 'picking' | 'preparing' | 'active' | 'ended'

export type ClanWarOutcome =
  | 'attacker_won'
  | 'defender_won'
  | 'drawn'
  | 'retreated'
  | 'forfeited'
  | 'season_ended'

export interface PublicClanResponse {
  id: string
  slug: string
  name: string
  tag: string
  equipped: ItemResponse[]
}

export interface ClanWarRefResponse {
  id: string
  arena: ClanArena
  ruleset: ClanRuleset
  status: ClanWarStatus
  outcome: ClanWarOutcome | null
}

export interface ClanStatsResponse {
  clan: PublicClanResponse | null
  role: ClanRole | null
  joinedAt: string | null
  warsFought: number
  warsWon: number
  hits: number
  breaksDealt: number
  breaksSuffered: number
  standingMoved: number
  contribution: number
  warXp: number
}
