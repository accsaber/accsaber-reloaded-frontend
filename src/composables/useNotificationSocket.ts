import { useSocket } from '@/composables/useSocket'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import type { NotificationResponse } from '@/types/api/notifications'
import { isStaffSubdomain } from '@/utils/subdomain'
import { onScopeDispose, watch } from 'vue'

export function useNotificationSocket(): void {
  if (isStaffSubdomain) return

  const auth = useAuthStore()
  const store = useNotificationsStore()

  const { status, halted } = useSocket<NotificationResponse>({
    path: '/ws/notifications',
    auth: true,
    params: () => (auth.isLoggedIn ? {} : null),
    onOpen: () => void store.refresh(),
    onMessage: (notification) => store.ingest(notification),
  })

  watch(
    () => status.value === 'reconnecting' || halted.value,
    (degraded) => store.setDegraded(degraded),
  )

  watch(
    () => auth.isLoggedIn,
    (loggedIn) => {
      if (!loggedIn) store.reset()
    },
  )

  function reconcileOnFocus() {
    if (!document.hidden && auth.isLoggedIn) void store.fetchUnreadCount()
  }

  window.addEventListener('focus', reconcileOnFocus)
  document.addEventListener('visibilitychange', reconcileOnFocus)

  onScopeDispose(() => {
    window.removeEventListener('focus', reconcileOnFocus)
    document.removeEventListener('visibilitychange', reconcileOnFocus)
  })
}
