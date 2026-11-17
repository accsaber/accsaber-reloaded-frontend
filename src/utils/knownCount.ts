const counts = new Map<string, number>()

export function knownCount(key: string, fallback: number): number {
  return counts.get(key) ?? fallback
}

export function rememberCount(key: string, count: number) {
  counts.set(key, count)
}
