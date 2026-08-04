import { createContext, useContext, useState, type ReactNode } from 'react'
import { api, TOKEN_STORAGE_KEY } from '@/lib/api'
import type { AccessLevel, AuthResponse } from '@/lib/types'

interface AuthUser {
  callsign: string
  name: string
  accessLevel: AccessLevel
}

interface AuthContextValue {
  user: AuthUser | null
  login: (callsign: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const USER_STORAGE_KEY = 'nj2pc-oem-user'

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)

  async function login(callsign: string, password: string) {
    const { data } = await api.post<AuthResponse>('/api/auth/login', { callsign, password })
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    const authUser: AuthUser = { callsign: data.callsign, name: data.name, accessLevel: data.accessLevel }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }

  function logout() {
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
