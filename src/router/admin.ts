import { useAuthStore } from '@/stores/auth'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/login',
      name: 'admin-login',
      component: () => import('@/views/staff/AdminLoginPage.vue'),
    },
    {
      path: '/',
      name: 'admin-dashboard',
      component: () => import('@/views/staff/AdminPage.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAdmin) {
    const auth = useAuthStore()

    if (!auth.isStaffAuthenticated) {
      return { name: 'admin-login', query: { redirect: to.fullPath } }
    }

    if (auth.isTokenExpiringSoon) {
      try {
        await auth.refreshStaffToken()
      } catch {
        auth.clearStaffAuth()
        return { name: 'admin-login', query: { redirect: to.fullPath } }
      }
    }

    if (!auth.isAdmin) {
      return { name: 'admin-login' }
    }
  }
})

export default router
