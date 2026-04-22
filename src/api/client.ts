import { useAuthStore } from '@/stores/auth'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const NO_AUTO_AUTH_PATHS = [
  '/auth/refresh',
  '/auth/logout',
  '/staff/auth/login',
  '/staff/auth/refresh',
  '/staff/auth/logout',
]

function isStaffPath(path: string): boolean {
  return path.startsWith('/staff/') || path.startsWith('/admin/') || path.startsWith('/ranking/')
}

function shouldSkipAuth(path: string): boolean {
  return NO_AUTO_AUTH_PATHS.some((p) => path.startsWith(p))
}

async function refreshStaffIfNeeded(auth: ReturnType<typeof useAuthStore>) {
  if (auth.staffToken && auth.isTokenExpiringSoon) {
    try {
      await auth.refreshStaffToken()
    } catch {
      auth.clearStaffAuth()
    }
  }
}

async function refreshPlayerIfNeeded(auth: ReturnType<typeof useAuthStore>) {
  if (auth.accessToken && auth.isPlayerTokenExpiringSoon && auth.refreshTokenValue) {
    await auth.refreshPlayerSession()
  }
}

function isAdminPath(path: string): boolean {
  return path.startsWith('/admin/')
}

async function resolveAuthHeader(path: string): Promise<string | null> {
  if (shouldSkipAuth(path)) return null
  const auth = useAuthStore()

  if (isAdminPath(path)) {
    await refreshStaffIfNeeded(auth)
    if (auth.staffToken) return auth.staffToken
    await refreshPlayerIfNeeded(auth)
    return auth.accessToken ?? null
  }

  if (isStaffPath(path)) {
    await refreshPlayerIfNeeded(auth)
    if (auth.accessToken) return auth.accessToken
    await refreshStaffIfNeeded(auth)
    return auth.staffToken ?? null
  }

  await refreshPlayerIfNeeded(auth)
  if (auth.accessToken) return auth.accessToken

  await refreshStaffIfNeeded(auth)
  return auth.staffToken ?? null
}

async function executeFetch<T>(
  method: string,
  path: string,
  body: unknown,
  authHeader: string | null,
): Promise<{ res: Response; parsed: T | undefined }> {
  const baseUrl = import.meta.env.VITE_API_BASE
  const url = `${baseUrl}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader) headers['Authorization'] = `Bearer ${authHeader}`

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    return { res, parsed: undefined }
  }

  if (res.status === 204 || res.status === 202) {
    return { res, parsed: undefined }
  }

  const text = await res.text()
  const sanitizedJsonText = text.replace(/:\s*(\d{16,})/g, ': "$1"')
  return { res, parsed: JSON.parse(sanitizedJsonText) as T }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const authHeader = await resolveAuthHeader(path)

  let { res, parsed } = await executeFetch<T>(method, path, body, authHeader)

  if (res.status === 401 && !shouldSkipAuth(path)) {
    const auth = useAuthStore()
    const attachedPlayerToken = !!authHeader && authHeader === auth.accessToken
    if (attachedPlayerToken && auth.refreshTokenValue) {
      const refreshed = await auth.refreshPlayerSession()
      if (refreshed && auth.accessToken) {
        const retry = await executeFetch<T>(method, path, body, auth.accessToken)
        res = retry.res
        parsed = retry.parsed
      }
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }

  if (res.status === 204 || res.status === 202) return undefined as T
  return parsed as T
}

export function get<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body)
}

export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, body)
}

export function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}
