import type { Difficulty } from '../enums'
import type { ClanMembershipResponse, PublicClanResponse } from './clans'

export interface PlayerRef {
  id: string
  name: string
  avatarUrl?: string | null
  cdnAvatarUrl?: string | null
  country?: string | null
  clan?: PublicClanResponse | null
  membership?: ClanMembershipResponse
}

export interface MapDifficultyRef {
  id: string
  mapId: string
  songName: string
  songSubName?: string
  songAuthor?: string
  mapAuthor?: string
  coverUrl?: string
  cdnCoverUrl?: string
  difficulty: Difficulty
  categoryId?: string
  categoryName?: string
}
