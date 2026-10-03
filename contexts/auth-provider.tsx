"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { AuthUser } from "@/lib/auth-client"

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: (user: AuthUser) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    localStorage.removeItem("pactmind_token")
    localStorage.removeItem("pactmind_user")

    fetch("/api/me", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null
        const data = (await res.json()) as { user: AuthUser | null }
        return data.user
      })
      .then((sessionUser) => setUser(sessionUser))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback((newUser: AuthUser) => {
    setUser(newUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // Clear client state even if revocation request fails
    }
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { credentials: "include" })
      if (!res.ok) return
      const data = (await res.json()) as { user: AuthUser | null }
      if (data.user) setUser(data.user)
    } catch {
      // ignore
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

export function useRequireAuth(redirectTo = "/login") {
  const { user, isLoading, refreshUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo)
    }
  }, [user, isLoading, router, redirectTo])

  return { user, isLoading, refreshUser }
}

export function useRequireAdmin(redirectTo = "/dashboard") {
  const { user, isLoading } = useRequireAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      router.replace(redirectTo)
    }
  }, [user, isLoading, router, redirectTo])

  return { user, isLoading }
}
