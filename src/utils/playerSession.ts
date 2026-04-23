import { isAdminSubdomain } from './subdomain'

const COOKIE_ACCESS = 'playerAccessToken'
const COOKIE_REFRESH = 'playerRefreshToken'
const COOKIE_EXPIRES = 'playerTokenExpiresAt'
const COOKIE_USER_ID = 'playerUserId'

const COOKIE_KEYS = [COOKIE_ACCESS, COOKIE_REFRESH, COOKIE_EXPIRES, COOKIE_USER_ID] as const

const ONE_YEAR = 60 * 60 * 24 * 365

function cookieDomain(): string | null {
  const host = window.location.hostname
  if (host === 'localhost' || /^(\d+\.){3}\d+$/.test(host)) return null
  const parts = host.split('.')
  if (parts.length < 2) return null
  return `.${parts.slice(-2).join('.')}`
}

function isSecure(): boolean {
  return window.location.protocol === 'https:'
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  if (!match) return null
  return decodeURIComponent(match.slice(name.length + 1))
}

function writeCookie(name: string, value: string) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `Max-Age=${ONE_YEAR}`, 'SameSite=Lax']
  const domain = cookieDomain()
  if (domain) parts.push(`Domain=${domain}`)
  if (isSecure()) parts.push('Secure')
  document.cookie = parts.join('; ')
}

function deleteCookie(name: string) {
  const parts = [`${name}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax']
  const domain = cookieDomain()
  if (domain) parts.push(`Domain=${domain}`)
  if (isSecure()) parts.push('Secure')
  document.cookie = parts.join('; ')
}

export interface PlayerSession {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number
  userId: string | null
}

const EMPTY_SESSION: PlayerSession = {
  accessToken: null,
  refreshToken: null,
  expiresAt: 0,
  userId: null,
}

export function readPlayerSession(): PlayerSession {
  if (isAdminSubdomain) return { ...EMPTY_SESSION }
  return {
    accessToken: readCookie(COOKIE_ACCESS),
    refreshToken: readCookie(COOKIE_REFRESH),
    expiresAt: Number(readCookie(COOKIE_EXPIRES)) || 0,
    userId: readCookie(COOKIE_USER_ID),
  }
}

export function writePlayerSession(session: {
  accessToken: string
  refreshToken: string
  expiresAt: number
  userId: string
}) {
  if (isAdminSubdomain) return
  writeCookie(COOKIE_ACCESS, session.accessToken)
  writeCookie(COOKIE_REFRESH, session.refreshToken)
  writeCookie(COOKIE_EXPIRES, String(session.expiresAt))
  writeCookie(COOKIE_USER_ID, session.userId)
}

export function clearPlayerSession() {
  if (isAdminSubdomain) return
  for (const key of COOKIE_KEYS) deleteCookie(key)
}

export function migrateLegacyPlayerSession() {
  if (isAdminSubdomain) return
  if (readCookie(COOKIE_ACCESS)) return
  const access = localStorage.getItem(COOKIE_ACCESS)
  const refresh = localStorage.getItem(COOKIE_REFRESH)
  const expires = localStorage.getItem(COOKIE_EXPIRES)
  const userId = localStorage.getItem(COOKIE_USER_ID)
  if (!access || !refresh || !userId) return
  writePlayerSession({
    accessToken: access,
    refreshToken: refresh,
    expiresAt: Number(expires) || 0,
    userId,
  })
  for (const key of COOKIE_KEYS) localStorage.removeItem(key)
}
