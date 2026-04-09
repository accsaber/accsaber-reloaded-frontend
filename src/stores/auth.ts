import { login as apiLogin, refreshToken as apiRefresh, logout as apiLogout } from '@/api/staff-auth'
import { getUser } from '@/api/users'
import type { StaffRole } from '@/types/enums'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

interface UserProfile {
  name: string
  avatarUrl: string
  country: string
}

const ROLE_HIERARCHY: Record<StaffRole, number> = {
  RANKING: 2,
  RANKING_HEAD: 3,
  ADMIN: 5,
  DEVELOPER: 4,
  MODERATOR: 1
}

export const useAuthStore = defineStore('auth', () => {
  const userId = ref<string | null>(localStorage.getItem('userId'))
  const staffToken = ref<string | null>(localStorage.getItem('staffToken'))
  const staffRefreshToken = ref<string | null>(localStorage.getItem('staffRefreshToken'))
  const staffRole = ref<StaffRole | null>(
    (localStorage.getItem('staffRole') as StaffRole) || null,
  )
  const staffTokenExpiresAt = ref<number>(
    Number(localStorage.getItem('staffTokenExpiresAt')) || 0,
  )
  const userProfile = ref<UserProfile | null>(null)

  const isLoggedIn = computed(() => userId.value !== null)
  const isStaffAuthenticated = computed(() => staffToken.value !== null)
  const isAdmin = computed(() => staffRole.value === 'ADMIN')
  const isTokenExpiringSoon = computed(
    () => staffTokenExpiresAt.value > 0 && Date.now() > staffTokenExpiresAt.value - 60_000,
  )

  function hasRole(requiredRole: StaffRole): boolean {
    if (!staffRole.value) return false
    return ROLE_HIERARCHY[staffRole.value] >= ROLE_HIERARCHY[requiredRole]
  }

  function setUserId(id: string) {
    userId.value = id
    localStorage.setItem('userId', id)
  }

  function clearUserId() {
    userId.value = null
    userProfile.value = null
    localStorage.removeItem('userId')
  }

  function setProfile(user: { name: string; avatarUrl: string; country: string }) {
    userProfile.value = {
      name: user.name,
      avatarUrl: user.avatarUrl,
      country: user.country,
    }
  }

  function setStaffAuth(token: string, role: StaffRole) {
    staffToken.value = token
    staffRole.value = role
    localStorage.setItem('staffToken', token)
    localStorage.setItem('staffRole', role)
  }

  function clearStaffAuth() {
    staffToken.value = null
    staffRefreshToken.value = null
    staffRole.value = null
    staffTokenExpiresAt.value = 0
    localStorage.removeItem('staffToken')
    localStorage.removeItem('staffRefreshToken')
    localStorage.removeItem('staffRole')
    localStorage.removeItem('staffTokenExpiresAt')
  }

  let refreshPromise: Promise<void> | null = null

  async function login(identifier: string, password: string, role?: StaffRole): Promise<void> {
    const res = await apiLogin({ identifier, password, role })
    staffToken.value = res.accessToken
    staffRefreshToken.value = res.refreshToken
    staffRole.value = res.role
    staffTokenExpiresAt.value = Date.now() + res.expiresIn * 1000
    localStorage.setItem('staffToken', res.accessToken)
    localStorage.setItem('staffRefreshToken', res.refreshToken)
    localStorage.setItem('staffRole', res.role)
    localStorage.setItem('staffTokenExpiresAt', String(staffTokenExpiresAt.value))
  }

  async function refreshStaffToken(): Promise<void> {
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        if (!staffRefreshToken.value) {
          clearStaffAuth()
          return
        }
        const res = await apiRefresh({ refreshToken: staffRefreshToken.value })
        staffToken.value = res.accessToken
        staffRefreshToken.value = res.refreshToken
        staffRole.value = res.role
        staffTokenExpiresAt.value = Date.now() + res.expiresIn * 1000
        localStorage.setItem('staffToken', res.accessToken)
        localStorage.setItem('staffRefreshToken', res.refreshToken)
        localStorage.setItem('staffRole', res.role)
        localStorage.setItem('staffTokenExpiresAt', String(staffTokenExpiresAt.value))
      } catch {
        clearStaffAuth()
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  async function logout(): Promise<void> {
    try {
      await apiLogout()
    } catch {
    }
    clearStaffAuth()
  }

  async function fetchProfile(): Promise<void> {
    if (!userId.value) return
    try {
      const user = await getUser(userId.value)
      userProfile.value = {
        name: user.name,
        avatarUrl: user.avatarUrl,
        country: user.country,
      }
    } catch {
      userProfile.value = null
    }
  }

  return {
    userId,
    staffToken,
    staffRefreshToken,
    staffRole,
    staffTokenExpiresAt,
    userProfile,
    isLoggedIn,
    isStaffAuthenticated,
    isAdmin,
    isTokenExpiringSoon,
    hasRole,
    setUserId,
    clearUserId,
    setProfile,
    setStaffAuth,
    clearStaffAuth,
    login,
    refreshStaffToken,
    logout,
    fetchProfile,
  }
})
