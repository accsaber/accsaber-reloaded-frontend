import type { ClanRole } from './clans'
import type { PlayerRef } from './common'
export type OAuthProvider = 'discord' | 'beatleader' | 'steam'

export interface AuthConnection {
  provider: OAuthProvider
  providerUserId: string
  providerUsername: string | null
  providerAvatarUrl: string | null
}

export interface AuthMeStaff {
  staffId: string
  role: string
  status: string
}

export interface AuthMeResponse {
  player: PlayerRef
  clanRole?: ClanRole | null
  supporterTier?: string | null
  banned: boolean
  connections: AuthConnection[]
  staff: AuthMeStaff | null
}

export interface PlayerAuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  userId: string
}

export interface PlayerRefreshRequest {
  refreshToken: string
}

export interface PlayerLogoutRequest {
  refreshToken: string
}
