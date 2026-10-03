import { LoginForm } from "@/components/auth/login-form"
import { LoginBrandPanel } from "@/components/auth/login-brand-panel"
import Link from "next/link"
import { Scale } from "lucide-react"

export const metadata = {
  title: "Sign In — PactMind",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col-reverse lg:flex-row">
      <LoginBrandPanel />

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
          <LoginForm />
        </div>

        <p className="px-6 pb-6 text-center text-xs text-muted-foreground lg:pb-8">
          AI-powered legal document analysis · Secure &amp; private
        </p>
      </div>
    </div>
  )
}
