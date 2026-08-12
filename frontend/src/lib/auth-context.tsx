import { createContext, useContext, useState, type ReactNode } from 'react'
import { api, TOKEN_STORAGE_KEY } from '@/lib/api'
import type { AuthResponse, Permission } from '@/lib/types'

interface AuthUser {
  callsign: string
  name: string
  admin: boolean
  permissions: Permission[]
}

interface AuthContextValue {
  user: AuthUser | null
  login: (callsign: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const USER_STORAGE_KEY = 'nj2pc-oem-user'

function isValidStoredUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<AuthUser>
  return (
    typeof candidate.callsign === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.admin === 'boolean' &&
    Array.isArray(candidate.permissions)
  )
}

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (isValidStoredUser(parsed)) return parsed
  } catch {
    // fall through to clear the corrupt entry below
  }
  localStorage.removeItem(USER_STORAGE_KEY)
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)

  async function login(callsign: string, password: string) {
    const { data } = await api.post<AuthResponse>('/api/auth/login', { callsign, password })
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    const authUser: AuthUser = {
      callsign: data.callsign,
      name: data.name,
      admin: data.admin,
      permissions: data.permissions,
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // best-effort — still clear local session even if the request fails
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false
  return user.admin || user.permissions.includes(permission)
}
