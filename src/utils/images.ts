const RASTER_PATTERN = /\.(png|gif)(\?|#|$)/i

export function toAvif(url: string): string {
  return url.replace(RASTER_PATTERN, '.avif$2')
}

function isImageUrlKey(key: string): boolean {
  if (!key) return false
  const lower = key.toLowerCase()
  return lower.endsWith('url') || lower.endsWith('avatar') || lower.endsWith('cover')
}

export function imageUrlReviver(key: string, value: unknown): unknown {
  if (typeof value === 'string' && isImageUrlKey(key) && RASTER_PATTERN.test(value)) {
    return toAvif(value)
  }
  return value
}
