import { onUnmounted, readonly, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

export const MOBILE_MEDIA_QUERY = '(max-width: 959px)'

export function useMediaQuery(query: MaybeRefOrGetter<string>): Readonly<Ref<boolean>> {
  const matches = ref(false)
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return readonly(matches)
  }
  let media: MediaQueryList | null = null
  const handler = () => {
    matches.value = !!media?.matches
  }
  watch(
    () => toValue(query),
    (value) => {
      media?.removeEventListener('change', handler)
      media = window.matchMedia(value)
      handler()
      media.addEventListener('change', handler)
    },
    { immediate: true },
  )
  onUnmounted(() => media?.removeEventListener('change', handler))
  return readonly(matches)
}
