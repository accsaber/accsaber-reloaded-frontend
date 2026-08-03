import { type Ref } from 'vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

const QUERY = '(prefers-reduced-motion: reduce)'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(QUERY).matches
}

export function useReducedMotion(): Readonly<Ref<boolean>> {
  return useMediaQuery(QUERY)
}
