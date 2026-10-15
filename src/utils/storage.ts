export function readStoredString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStoredString(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
  }
}

export function readStored<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): T {
  const raw = readStoredString(key)
  if (raw === null) return fallback
  try {
    return parse(JSON.parse(raw)) ?? fallback
  } catch {
    return fallback
  }
}

export function writeStored(key: string, value: unknown): void {
  writeStoredString(key, JSON.stringify(value))
}
