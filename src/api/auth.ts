import type {
  AuthMeResponse,
  OAuthProvider,
  PlayerAuthResponse,
  PlayerLogoutRequest,
  PlayerRefreshRequest,
} from '@/types/api/player-auth'
import { oauthCallbackUrl } from '@/utils/subdomain'
import { del, get, post } from './client'

export function getAuthMe(): Promise<AuthMeResponse> {
  return get<AuthMeResponse>('/auth/me')
}

export function refreshPlayerToken(
  req: PlayerRefreshRequest,
): Promise<PlayerAuthResponse> {
  return post<PlayerAuthResponse>('/auth/refresh', req)
}

export function logoutPlayer(req: PlayerLogoutRequest): Promise<void> {
  return post<void>('/auth/logout', req)
}

export function deletePlayerConnection(provider: OAuthProvider): Promise<void> {
  return del<void>(`/auth/connections/${provider}`)
}

export function buildOAuthStartUrl(
  provider: OAuthProvider,
  returnTo: string,
  pendingLinkToken?: string,
): string {
  const base = import.meta.env.VITE_API_BASE ?? ''
  const absolute = /^https?:\/\//i.test(base)
    ? base
    : `${window.location.origin}${base.startsWith('/') ? base : `/${base}`}`
  const params = new URLSearchParams({ returnTo })
  if (pendingLinkToken) params.set('pendingLinkToken', pendingLinkToken)
  return `${absolute}/auth/${provider}/start?${params.toString()}`
}

export function getDefaultCallbackUrl(): string {
  return oauthCallbackUrl()
}
