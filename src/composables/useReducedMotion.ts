import { type Ref } from 'vue'
import { mediaMatches } from '@/composables/useMediaQuery'

const QUERY = '(prefers-reduced-motion: reduce)'

export function prefersReducedMotion(): boolean {
  return mediaMatches(QUERY).value
}

export function useReducedMotion(): Readonly<Ref<boolean>> {
  return mediaMatches(QUERY)
}
