import type { PublicClanResponse } from './clans'

export interface PlayerRef {
  id: string
  name: string
  avatarUrl: string | null
  cdnAvatarUrl: string | null
  country: string | null
  clan: PublicClanResponse | null
}
