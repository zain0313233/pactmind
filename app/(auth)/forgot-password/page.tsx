import Link from "next/link"
import { Scale } from "lucide-react"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata = {
  title: "Forgot Password — PactMind",
}

export default function ForgotPasswordPage() {
  return (
    <div className="dark relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />

      <Link
        href="/"
        className="relative z-10 mb-8 flex items-center gap-2 text-lg font-bold"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Scale className="h-5 w-5" />
        </div>
        PactMind
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
