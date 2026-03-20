export function buildQuery(params?: object): string {
  if (!params) return ''

  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, value]) => value !== undefined && value !== null,
  )

  if (entries.length === 0) return ''

  const parts: string[] = []
  for (const [key, value] of entries) {
    const encodedKey = encodeURIComponent(key)
    if (Array.isArray(value)) {
      for (const v of value) parts.push(`${encodedKey}=${encodeURIComponent(String(v))}`)
    } else {
      parts.push(`${encodedKey}=${encodeURIComponent(String(value))}`)
    }
  }

  return `?${parts.join('&').split('%2C').join(',')}`
}
