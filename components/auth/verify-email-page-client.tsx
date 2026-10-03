"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Scale } from "lucide-react"
import { VerifyEmailForm } from "@/components/auth/verify-email-form"
import { LoginBrandPanel } from "@/components/auth/login-brand-panel"
import { useAuth } from "@/contexts/auth-provider"

export function VerifyEmailPageClient() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login")
      return
    }
    if (!isLoading && user?.emailVerified) {
      router.replace("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading || !user || user.emailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col-reverse lg:flex-row">
      <LoginBrandPanel
        title="Almost there"
        subtitle="Verify your email to secure your account and access PactMind"
      />

      <div className="flex flex-1 flex-col bg-zinc-50">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-[#0F172A]">PactMind</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <VerifyEmailForm />
        </div>

        <p className="px-6 pb-6 text-center text-xs text-muted-foreground lg:pb-8">
          AI-powered legal document analysis · Secure &amp; private
        </p>
      </div>
    </div>
  )
}
