import type { ClanWarRefResponse, PublicClanResponse } from './clans'
import type { PlayerRef } from './common'

export type ChatEvent =
  | 'member_joined'
  | 'member_left'
  | 'member_kicked'
  | 'alliance_formed'
  | 'alliance_ended'
  | 'rival_declared'
  | 'rivaled_by'
  | 'war_declared'
  | 'war_received'
  | 'war_started'
  | 'war_hit'
  | 'war_break'
  | 'war_ended'

export interface ChatMessageResponse {
  id: string
  author: PlayerRef
  content: string | null
  event: ChatEvent | null
  subject: PlayerRef | null
  clan: PublicClanResponse | null
  war: ClanWarRefResponse | null
  createdAt: string
}

export interface SendChatMessageRequest {
  content: string
}
