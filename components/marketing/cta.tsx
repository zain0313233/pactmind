import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CTA() {
  return (
    <section id="pricing" className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-10 text-center text-primary-foreground shadow-xl sm:p-14">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Ready to understand your contracts?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
          Join PactMind today. Upload your first document and start asking
          questions in minutes — no credit card required.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "lg", variant: "secondary" }),
              "gap-2 bg-white text-primary hover:bg-white/90"
            )}
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "border-white/30 bg-transparent text-white hover:bg-white/10"
            )}
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}
