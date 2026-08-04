import { createContext, useContext, useState, type ReactNode } from 'react'
import { api, TOKEN_STORAGE_KEY } from '@/lib/api'
import type { AuthResponse, Role } from '@/lib/types'

interface AuthUser {
  username: string
  role: Role
}

interface AuthContextValue {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<void>
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

  async function login(username: string, password: string) {
    const { data } = await api.post<AuthResponse>('/api/auth/login', { username, password })
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    const authUser: AuthUser = { username: data.username, role: data.role }
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
