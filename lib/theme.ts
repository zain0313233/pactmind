export type SiteThemeConfig = {
  primaryColor: string
  primaryForegroundColor: string
  textColor: string
  textColorDark: string
  mutedTextColor: string
  mutedTextColorDark: string
}

export const DEFAULT_THEME: SiteThemeConfig = {
  primaryColor: "#14b8a6",
  primaryForegroundColor: "#042f2e",
  textColor: "#0f172a",
  textColorDark: "#f1f5f9",
  mutedTextColor: "#64748b",
  mutedTextColorDark: "#94a3b8",
}

export const THEME_PRESETS: { name: string; theme: SiteThemeConfig }[] = [
  { name: "Teal", theme: DEFAULT_THEME },
  {
    name: "Blue",
    theme: {
      primaryColor: "#3b82f6",
      primaryForegroundColor: "#ffffff",
      textColor: "#0f172a",
      textColorDark: "#f1f5f9",
      mutedTextColor: "#64748b",
      mutedTextColorDark: "#94a3b8",
    },
  },
  {
    name: "Purple",
    theme: {
      primaryColor: "#a855f7",
      primaryForegroundColor: "#ffffff",
      textColor: "#0f172a",
      textColorDark: "#f1f5f9",
      mutedTextColor: "#64748b",
      mutedTextColorDark: "#94a3b8",
    },
  },
  {
    name: "Orange",
    theme: {
      primaryColor: "#f97316",
      primaryForegroundColor: "#ffffff",
      textColor: "#0f172a",
      textColorDark: "#f1f5f9",
      mutedTextColor: "#64748b",
      mutedTextColorDark: "#94a3b8",
    },
  },
  {
    name: "Rose",
    theme: {
      primaryColor: "#f43f5e",
      primaryForegroundColor: "#ffffff",
      textColor: "#0f172a",
      textColorDark: "#f1f5f9",
      mutedTextColor: "#64748b",
      mutedTextColorDark: "#94a3b8",
    },
  },
]

const HEX_REGEX = /^#([0-9A-Fa-f]{6})$/

export function isValidHex(color: string): boolean {
  return HEX_REGEX.test(color)
}

export function normalizeTheme(input: Partial<SiteThemeConfig>): SiteThemeConfig {
  const merged = { ...DEFAULT_THEME, ...input }
  for (const [key, value] of Object.entries(merged)) {
    if (!isValidHex(value as string)) {
      return DEFAULT_THEME
    }
  }
  return merged as SiteThemeConfig
}

/** CSS variables applied on :root (light / marketing) */
export function themeToLightVars(theme: SiteThemeConfig): Record<string, string> {
  return {
    "--primary": theme.primaryColor,
    "--primary-foreground": theme.primaryForegroundColor,
    "--foreground": theme.textColor,
    "--card-foreground": theme.textColor,
    "--popover-foreground": theme.textColor,
    "--muted-foreground": theme.mutedTextColor,
    "--ring": theme.primaryColor,
    "--sidebar-primary": theme.primaryColor,
    "--sidebar-primary-foreground": theme.primaryForegroundColor,
    "--sidebar-ring": theme.primaryColor,
    "--chart-1": theme.primaryColor,
  }
}

/** CSS variables applied on .dark (portal) */
export function themeToDarkVars(theme: SiteThemeConfig): Record<string, string> {
  return {
    "--primary": theme.primaryColor,
    "--primary-foreground": theme.primaryForegroundColor,
    "--foreground": theme.textColorDark,
    "--card-foreground": theme.textColorDark,
    "--popover-foreground": theme.textColorDark,
    "--muted-foreground": theme.mutedTextColorDark,
    "--ring": theme.primaryColor,
    "--sidebar-primary": theme.primaryColor,
    "--sidebar-primary-foreground": theme.primaryForegroundColor,
    "--sidebar-ring": theme.primaryColor,
    "--chart-1": theme.primaryColor,
  }
}

export function applyThemeToDocument(theme: SiteThemeConfig) {
  if (typeof document === "undefined") return

  const root = document.documentElement
  const light = themeToLightVars(theme)
  const dark = themeToDarkVars(theme)

  Object.entries(light).forEach(([k, v]) => root.style.setProperty(k, v))

  let darkEl = document.getElementById("pactmind-dark-theme-vars")
  if (!darkEl) {
    darkEl = document.createElement("style")
    darkEl.id = "pactmind-dark-theme-vars"
    document.head.appendChild(darkEl)
  }

  const darkRules = Object.entries(dark)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n  ")
  darkEl.textContent = `.dark {\n  ${darkRules}\n}`
}

export function varsToInlineStyle(theme: SiteThemeConfig): React.CSSProperties {
  return themeToLightVars(theme) as React.CSSProperties
}
