"use client"

import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRequireAuth } from "@/contexts/auth-provider"
import { PortalSidebar } from "./portal-sidebar"
import { PortalHeader } from "./portal-header"
import { SidebarProvider } from "./sidebar-context"
import { AccessRestrictedOverlay } from "@/components/access/access-restricted-overlay"
import { AdminAccessAlertBanner } from "@/components/admin/admin-access-alert-banner"

export function PortalLayout({
  children,
  fullBleed = false,
}: {
  children: React.ReactNode
  fullBleed?: boolean
}) {
  const { user, isLoading, refreshUser } = useRequireAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && !user.emailVerified) {
      router.replace("/verify-email")
    }
  }, [user, isLoading, router])

  if (isLoading || !user || !user.emailVerified) {
    return (
      <div className="dark flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="dark flex h-screen bg-background text-sm text-foreground antialiased">
        <PortalSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <PortalHeader />
          <AdminAccessAlertBanner isAdmin={user.role === "admin"} />
          <main
            className={
              fullBleed
                ? "flex flex-1 flex-col overflow-hidden"
                : "scrollbar-hide flex-1 overflow-auto p-4 md:p-6"
            }
          >
            {children}
          </main>
        </div>
        {user.role !== "admin" && (
          <AccessRestrictedOverlay
            open={!!user.accessRestricted}
            unblockRequestPending={!!user.unblockRequestPending}
            onRequestSent={() => void refreshUser()}
          />
        )}
      </div>
    </SidebarProvider>
  )
}
