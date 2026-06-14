"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Upload,
  MessageSquare,
  Settings,
  LogOut,
  Shield,
  X,
  Users,
  Activity,
  SlidersHorizontal,
  BarChart3,
  CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-provider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSidebar } from "./sidebar-context"
import { useAdminAccessAlerts } from "@/hooks/use-admin-access-alerts"
import { Badge } from "@/components/ui/badge"

const workspaceNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: false },
  { label: "Documents", href: "/dashboard/documents", icon: FileText, exact: false },
  { label: "Upload", href: "/dashboard/upload", icon: Upload, exact: false },
  { label: "Standards", href: "/dashboard/standards", icon: Shield, exact: false },
  { label: "Chat", href: "/chat", icon: MessageSquare, exact: false },
  { label: "Usage", href: "/dashboard/usage", icon: BarChart3, exact: false },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard, exact: false },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, exact: false },
]

const platformNavItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Users", href: "/admin/users", icon: Users, exact: false },
  { label: "All Documents", href: "/admin/documents", icon: FileText, exact: false },
  { label: "System", href: "/admin/system", icon: Activity, exact: false },
  { label: "Admin Settings", href: "/admin/settings", icon: SlidersHorizontal, exact: false },
]

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function PortalSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { collapsed, mobileOpen, isMobile, closeMobileSidebar } = useSidebar()

  const showCollapsed = collapsed && !isMobile
  const isAdmin = user?.role === "admin"
  const onAdminRoute = pathname.startsWith("/admin")
  const { data: accessAlerts } = useAdminAccessAlerts(!!isAdmin)
  const pendingUnblockCount = accessAlerts?.alerts.pendingUnblockCount ?? 0

  useEffect(() => {
    closeMobileSidebar()
  }, [pathname, closeMobileSidebar])

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U"

  async function handleLogout() {
    closeMobileSidebar()
    await logout()
    router.push("/login")
  }

  function handleNavClick() {
    if (isMobile) closeMobileSidebar()
  }

  return (
    <>
      {isMobile && mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground",
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:transition-[width]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          showCollapsed ? "md:w-[72px]" : "md:w-64"
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-border py-4",
            showCollapsed ? "justify-center px-2" : "gap-3 px-5"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div
            className={cn(
              "min-w-0 flex-1 overflow-hidden transition-all duration-300",
              showCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}
          >
            <p className="whitespace-nowrap text-sm font-semibold leading-tight tracking-tight">
              ClauseIQ
            </p>
            <p className="mt-0.5 whitespace-nowrap text-[11px] leading-tight text-muted-foreground">
              Legal AI Portal
            </p>
          </div>
          {isMobile && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={closeMobileSidebar}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <nav className={cn("flex-1 space-y-1 overflow-y-auto p-3", showCollapsed && "px-2")}>
          {!showCollapsed && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              My workspace
            </p>
          )}
          {workspaceNavItems.map((item) => {
            const active = !onAdminRoute && isNavActive(pathname, item.href, item.exact)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                title={showCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg py-2 text-sm transition-colors",
                  showCollapsed ? "justify-center px-0" : "gap-3 px-3",
                  active
                    ? "bg-primary font-medium text-primary-foreground"
                    : "font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap transition-all duration-300",
                    showCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}

          {isAdmin && (
            <>
              {!showCollapsed && (
                <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Platform admin
                </p>
              )}
              {showCollapsed && <Separator className="my-2" />}
              {platformNavItems.map((item) => {
                const active = isNavActive(pathname, item.href, item.exact)
                const Icon = item.icon
                const showBadge =
                  item.href === "/admin/users" && pendingUnblockCount > 0
                return (
                  <Link
                    key={item.href}
                    href={
                      showBadge ? "/admin/users?needsAction=1" : item.href
                    }
                    onClick={handleNavClick}
                    title={showCollapsed ? item.label : undefined}
                    className={cn(
                      "relative flex items-center rounded-lg py-2 text-sm transition-colors",
                      showCollapsed ? "justify-center px-0" : "gap-3 px-3",
                      active
                        ? "bg-primary/90 font-medium text-primary-foreground"
                        : "font-normal text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span
                      className={cn(
                        "overflow-hidden whitespace-nowrap transition-all duration-300",
                        showCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                      )}
                    >
                      {item.label}
                    </span>
                    {showBadge && (
                      <Badge
                        className={cn(
                          "h-5 min-w-5 justify-center bg-amber-500 px-1.5 text-[10px] font-semibold text-amber-950",
                          showCollapsed
                            ? "absolute -right-0.5 -top-0.5"
                            : "ml-auto"
                        )}
                      >
                        {pendingUnblockCount > 9 ? "9+" : pendingUnblockCount}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        <div className={cn("p-3", showCollapsed && "px-2")}>
          {!showCollapsed && user && (
            <div className="mb-3 rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-primary/30">
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">
                    {user.name}
                  </p>
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator className="mb-3" />
          <Button
            variant="ghost"
            size="sm"
            title={showCollapsed ? "Logout" : undefined}
            className={cn(
              "w-full text-sm font-normal text-muted-foreground hover:text-destructive",
              showCollapsed ? "justify-center px-0" : "justify-start gap-3"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-300",
                showCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              Logout
            </span>
          </Button>
        </div>
      </aside>
    </>
  )
}
