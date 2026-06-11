const RASTER_PATTERN = /\.(png|gif)(\?|#|$)/i
const OUR_CDN_HOST_PATTERN = /^(?:https?:)?\/\/(?:cdn\.accsaberreloaded\.com|localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?)\//i

function isOurCdnUrl(url: string): boolean {
  return OUR_CDN_HOST_PATTERN.test(url) || url.startsWith('/')
}

export function toAvif(url: string): string {
  if (!isOurCdnUrl(url)) return url
  return url.replace(RASTER_PATTERN, '.avif$2')
}

function isImageUrlKey(key: string): boolean {
  if (!key) return false
  const lower = key.toLowerCase()
  return lower.endsWith('url') || lower.endsWith('avatar') || lower.endsWith('cover')
}

export function imageUrlReviver(key: string, value: unknown): unknown {
  if (
    typeof value === 'string' &&
    isImageUrlKey(key) &&
    isOurCdnUrl(value) &&
    RASTER_PATTERN.test(value)
  ) {
    return toAvif(value)
  }
  return value
}
