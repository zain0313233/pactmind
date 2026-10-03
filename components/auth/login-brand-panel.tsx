import Link from "next/link"
import { FileText, MessageSquare, ShieldCheck, Scale } from "lucide-react"

const features = [
  {
    icon: FileText,
    label: "Upload PDF/DOCX contracts",
  },
  {
    icon: MessageSquare,
    label: "Chat with documents in plain English",
  },
  {
    icon: ShieldCheck,
    label: "Spot risks with AI agents",
  },
]

export function LoginBrandPanel({
  title = "Review contracts in minutes, not hours",
  subtitle = "AI-powered contract analysis, risk detection, and clause extraction",
}: {
  title?: string
  subtitle?: string
} = {}) {
  return (
    <div className="relative flex min-h-[320px] shrink-0 flex-col justify-between overflow-hidden bg-[#0F172A] p-6 text-white sm:p-8 lg:min-h-full lg:w-[44%] lg:max-w-xl lg:p-12 xl:max-w-2xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #fff 1px, transparent 1px),
            linear-gradient(to bottom, #fff 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-1/4 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

      <Link href="/" className="relative z-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Scale className="h-5 w-5" />
        </div>
        <span className="text-xl font-semibold tracking-tight">PactMind</span>
      </Link>

      <div className="relative z-10 my-6 max-w-md space-y-4 lg:my-12 lg:space-y-6">
        <div className="space-y-3 lg:space-y-4">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl xl:text-4xl">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">
            {subtitle}
          </p>
        </div>

        <ul className="hidden space-y-3 sm:block">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <li
                key={feature.label}
                className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 backdrop-blur-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {feature.label}
              </li>
            )
          })}
        </ul>
      </div>

      <p className="relative z-10 hidden text-xs text-slate-500 sm:block">
        Trusted by legal teams for faster, clearer contract review
      </p>
    </div>
  )
}
