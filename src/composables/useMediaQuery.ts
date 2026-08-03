import { onUnmounted, readonly, ref, type Ref } from 'vue'

export const MOBILE_MEDIA_QUERY = '(max-width: 959px)'

export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const matches = ref(false)
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return readonly(matches)
  }
  const media = window.matchMedia(query)
  matches.value = media.matches
  const handler = () => {
    matches.value = media.matches
  }
  media.addEventListener('change', handler)
  onUnmounted(() => media.removeEventListener('change', handler))
  return readonly(matches)
}
