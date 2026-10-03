import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AppProviders } from "@/components/providers/app-providers"
import { ThemeDarkStyles } from "@/components/theme/theme-dark-styles"
import { Toaster } from "@/components/ui/sonner"
import { themeRepository } from "@/repositories/theme.repository"
import { varsToInlineStyle } from "@/lib/theme"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "PactMind — AI Legal Document Analysis",
  description:
    "Upload contracts, ask questions, and understand legal clauses instantly with AI.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const theme = await themeRepository.getForRender()

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      style={varsToInlineStyle(theme)}
    >
      <head>
        <ThemeDarkStyles theme={theme} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AppProviders initialTheme={theme}>
          {children}
          <Toaster richColors position="top-right" />
        </AppProviders>
      </body>
    </html>
  )
}
