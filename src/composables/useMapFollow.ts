import { parseApiError } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { ref, type Ref } from 'vue'

export function useMapFollow(difficultyId: Ref<string | undefined>, onLoggedOut?: () => void) {
  const auth = useAuthStore()
  const following = ref(false)
  const busy = ref(false)
  const error = ref('')

  function set(subscribed: boolean | undefined) {
    following.value = !!subscribed
    error.value = ''
  }

  async function toggle() {
    const id = difficultyId.value
    if (!id) return
    if (!auth.userId) return onLoggedOut?.()
    const next = !following.value
    following.value = next
    busy.value = true
    error.value = ''
    try {
      const { setDifficultySubscription } = await import('@/api/maps')
      await setDifficultySubscription(id, next)
    } catch (err) {
      if (id !== difficultyId.value) return
      following.value = !next
      const parsed = parseApiError(err, 'Could not update the follow')
      if (parsed.status === 401 && onLoggedOut) onLoggedOut()
      else error.value = parsed.message
    } finally {
      busy.value = false
    }
  }

  return { following, busy, error, set, toggle }
}
