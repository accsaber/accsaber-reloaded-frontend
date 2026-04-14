import { useAuthStore } from '@/stores/auth'
import type { StaffRole } from '@/types/enums'
import { createRouter, createWebHistory } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresStaff?: boolean
    requiresAdmin?: boolean
    requiredRole?: StaffRole
  }
}

const isAdminSubdomain = window.location.hostname.startsWith('admin.')
const isRankingSubdomain = window.location.hostname.startsWith('ranking.')

function getHomeComponent() {
  if (isAdminSubdomain) return () => import('@/views/staff/AdminPage.vue')
  if (isRankingSubdomain) return () => import('@/views/staff/ranking/RankingDashboardPage.vue')
  return () => import('@/views/HomePage.vue')
}

function getHomeMeta(): Record<string, unknown> {
  if (isAdminSubdomain) return { requiresStaff: true, requiredRole: 'ADMIN' as StaffRole }
  if (isRankingSubdomain) return { requiresStaff: true, requiredRole: 'RANKING' as StaffRole }
  return {}
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: getHomeComponent(),
      meta: getHomeMeta(),
    },
    {
      path: '/getting-started',
      name: 'getting-started',
      component: () => import('@/views/GettingStartedPage.vue'),
    },
    {
      path: '/leaderboards',
      name: 'leaderboards',
      component: () => import('@/views/LeaderboardsPage.vue'),
    },
    {
      path: '/leaderboards/:categoryCode',
      name: 'leaderboards-category',
      component: () => import('@/views/LeaderboardsPage.vue'),
    },
    {
      path: '/maps',
      name: 'maps',
      component: () => import('@/views/MapsPage.vue'),
    },
    {
      path: '/maps/:mapId',
      name: 'map-detail',
      component: () => import('@/views/MapDetailPage.vue'),
    },
    {
      path: '/players/:userId',
      name: 'player-profile',
      component: () => import('@/views/PlayerProfilePage.vue'),
    },
    {
      path: '/ranked-queue',
      name: 'ranked-queue',
      component: () => import('@/views/RankedQueuePage.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsPage.vue'),
    },
    {
      path: '/score-feed',
      name: 'score-feed',
      component: () => import('@/views/ScoreFeedPage.vue'),
    },
    {
      path: '/milestones',
      name: 'milestones',
      component: () => import('@/views/MilestonesPage.vue'),
    },
    {
      path: '/campaigns',
      name: 'campaigns',
      component: () => import('@/views/CampaignsPage.vue'),
    },
    {
      path: '/campaigns/:campaignId',
      name: 'campaign-detail',
      component: () => import('@/views/CampaignDetailPage.vue'),
    },
    {
      path: '/whats-new',
      name: 'whats-new',
      component: () => import('@/views/WhatsNewPage.vue'),
    },
    {
      path: '/staff/login',
      name: 'staff-login',
      component: () => import('@/views/staff/AdminLoginPage.vue'),
    },
    {
      path: isRankingSubdomain ? '/login' : '/staff/ranking/login',
      name: 'ranking-login',
      component: () => import('@/views/staff/ranking/RankingLoginPage.vue'),
    },
    ...(!isRankingSubdomain ? [
      {
        path: '/staff/ranking',
        name: 'staff-ranking',
        component: () => import('@/views/staff/ranking/RankingDashboardPage.vue'),
        meta: { requiresStaff: true, requiredRole: 'RANKING' as StaffRole },
      },
    ] : []),
    {
      path: isRankingSubdomain ? '/map/:difficultyId' : '/staff/ranking/map/:difficultyId',
      name: 'ranking-map-detail',
      component: () => import('@/views/staff/ranking/RankingMapDetailPage.vue'),
      meta: { requiresStaff: true, requiredRole: 'RANKING' as StaffRole },
    },
    {
      path: isRankingSubdomain ? '/import' : '/staff/ranking/import',
      name: 'ranking-import',
      component: () => import('@/views/staff/ranking/MapImportPage.vue'),
      meta: { requiresStaff: true, requiredRole: 'RANKING' as StaffRole },
    },
    {
      path: isRankingSubdomain ? '/activity' : '/staff/ranking/activity',
      name: 'ranking-activity',
      component: () => import('@/views/staff/ranking/VoteActivityPage.vue'),
      meta: { requiresStaff: true, requiredRole: 'RANKING' as StaffRole },
    },
    {
      path: isRankingSubdomain ? '/batches' : '/staff/ranking/batches',
      name: 'staff-ranking-head',
      component: () => import('@/views/staff/ranking/RankingHeadPage.vue'),
      meta: { requiresStaff: true, requiredRole: 'RANKING' as StaffRole },
    },
    {
      path: isRankingSubdomain ? '/reweight' : '/staff/ranking/reweight',
      name: 'staff-ranking-reweight',
      component: () => import('@/views/staff/ranking/ReweightPage.vue'),
      meta: { requiresStaff: true, requiredRole: 'RANKING_HEAD' as StaffRole },
    },
    {
      path: isRankingSubdomain ? '/batches/build/:batchId?' : '/staff/ranking/batches/build/:batchId?',
      name: 'ranking-batch-builder',
      component: () => import('@/views/staff/ranking/BatchBuilderPage.vue'),
      meta: { requiresStaff: true, requiredRole: 'RANKING_HEAD' as StaffRole },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/staff/AdminPage.vue'),
      meta: { requiresStaff: true, requiredRole: 'ADMIN' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundPage.vue'),
    },
  ],
})

export { isRankingSubdomain, isAdminSubdomain }

export const rankingDashboardRoute = isRankingSubdomain ? 'home' : 'staff-ranking'

function getLoginRoute(requiredRole?: StaffRole): string {
  if (isRankingSubdomain || requiredRole === 'RANKING' || requiredRole === 'RANKING_HEAD') {
    return 'ranking-login'
  }
  return 'staff-login'
}

router.beforeEach(async (to) => {
  if (to.meta.requiresStaff) {
    const auth = useAuthStore()
    const loginRoute = getLoginRoute(to.meta.requiredRole)

    if (!auth.isStaffAuthenticated) {
      return { name: loginRoute, query: { redirect: to.fullPath } }
    }

    if (auth.isTokenExpiringSoon) {
      try {
        await auth.refreshStaffToken()
      } catch {
        auth.clearStaffAuth()
        return { name: loginRoute, query: { redirect: to.fullPath } }
      }
    }

    if (to.meta.requiredRole && !auth.hasRole(to.meta.requiredRole)) {
      return { name: rankingDashboardRoute }
    }
  }
})

export default router
