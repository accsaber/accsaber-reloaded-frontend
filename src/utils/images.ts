const IMAGE_URL_KEYS = new Set([
  'avatarUrl',
  'coverUrl',
  'backgroundUrl',
  'iconUrl',
  'imageUrl',
])

const PNG_PATTERN = /\.png(\?|#|$)/i

export function pngToAvif(url: string): string {
  return url.replace(PNG_PATTERN, '.avif$1')
}

export function imageUrlReviver(key: string, value: unknown): unknown {
  if (typeof value === 'string' && IMAGE_URL_KEYS.has(key)) {
    return pngToAvif(value)
  }
  return value
}
