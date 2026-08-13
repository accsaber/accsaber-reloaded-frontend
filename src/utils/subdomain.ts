const STAFF_REALMS = ['admin', 'ranking', 'creatives', 'curation'] as const
type StaffRealm = (typeof STAFF_REALMS)[number]

const STAGING_PREFIX = 'staging-'

const hostLabel = window.location.hostname.split('.')[0] ?? ''
const bareLabel = hostLabel.startsWith(STAGING_PREFIX)
  ? hostLabel.slice(STAGING_PREFIX.length)
  : hostLabel

const realm: StaffRealm | null = (STAFF_REALMS as readonly string[]).includes(bareLabel)
  ? (bareLabel as StaffRealm)
  : null

export const isStagingHost = hostLabel === 'staging' || hostLabel.startsWith(STAGING_PREFIX)

export const isAdminSubdomain = realm === 'admin'
export const isRankingSubdomain = realm === 'ranking'
export const isCreativesSubdomain = realm === 'creatives'
export const isCurationSubdomain = realm === 'curation'
export const isStaffSubdomain = realm !== null

export const isCurationSurface = isAdminSubdomain || isCurationSubdomain

export const currentRealm: 'ranking' | 'creatives' | 'curation' | null =
  realm === 'admin' ? null : realm

function mainSiteBase(): string {
  const configured = import.meta.env.VITE_MAIN_SITE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  const [, ...rest] = window.location.host.split('.')
  if (!rest.length) return window.location.origin
  const host = isStagingHost ? ['staging', ...rest].join('.') : rest.join('.')
  return `${window.location.protocol}//${host}`
}

export function mainSiteUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  if (!isStaffSubdomain) return suffix
  return `${mainSiteBase()}${suffix}`
}

export function playerProfileHref(userId: string | number): string {
  return mainSiteUrl(`/players/${userId}`)
}
