import { readStoredString, writeStoredString } from '@/utils/storage'

export const STATS_COUNTRY_STORAGE_KEY = 'accsaber:stats:country'

export function loadStoredCountry(): string {
  return readStoredString(STATS_COUNTRY_STORAGE_KEY) ?? ''
}

export function storeCountry(country: string): void {
  writeStoredString(STATS_COUNTRY_STORAGE_KEY, country || null)
}
