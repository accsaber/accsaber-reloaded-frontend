import { useAuthStore } from '@/stores/auth'
import { isStaffSubdomain, playerProfileHref } from '@/utils/subdomain'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

export function useOwnProfileLink() {
  const authStore = useAuthStore()
  const router = useRouter()

  const ownProfileHref = computed(() =>
    authStore.userId ? playerProfileHref(authStore.userId) : null,
  )

  function goToOwnProfile(): void {
    const userId = authStore.userId
    if (!userId) return
    if (isStaffSubdomain) {
      window.location.assign(playerProfileHref(userId))
    } else {
      void router.push({ name: 'player-profile', params: { userId } })
    }
  }

  function openOwnProfileInNewTab(): void {
    const href = ownProfileHref.value
    if (!href) return
    window.open(href, '_blank', 'noopener')
  }

  return { goToOwnProfile, openOwnProfileInNewTab, ownProfileHref }
}
