export function buildQuery(params?: object): string {
  if (!params) return ''

  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, value]) => value !== undefined && value !== null,
  )

  if (entries.length === 0) return ''

  const searchParams = new URLSearchParams()
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      for (const v of value) searchParams.append(key, String(v))
    } else {
      searchParams.set(key, String(value))
    }
  }

  return `?${searchParams.toString()}`
}
