import { computed, readonly, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue'

export const MOBILE_MEDIA_QUERY = '(max-width: 959px)'
export const PHONE_MEDIA_QUERY = '(max-width: 767px)'

const shared = new Map<string, Ref<boolean>>()

export function mediaMatches(query: string): Readonly<Ref<boolean>> {
  let matches = shared.get(query)
  if (!matches) {
    const state = ref(false)
    matches = state
    shared.set(query, state)
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const media = window.matchMedia(query)
      state.value = media.matches
      media.addEventListener('change', () => {
        state.value = media.matches
      })
    }
  }
  return readonly(matches)
}

export function useMediaQuery(query: MaybeRefOrGetter<string>): Readonly<Ref<boolean>> {
  return computed(() => mediaMatches(toValue(query)).value)
}
