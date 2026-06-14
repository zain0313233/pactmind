import { prisma } from "@/lib/prisma"
import { DEFAULT_THEME, type SiteThemeConfig } from "@/lib/theme"

const THEME_ID = "default"

export const themeRepository = {
  get: async (): Promise<SiteThemeConfig> => {
    const row = await prisma.siteTheme.findUnique({ where: { id: THEME_ID } })
    if (!row) return DEFAULT_THEME

    return {
      primaryColor: row.primaryColor,
      primaryForegroundColor: row.primaryForegroundColor,
      textColor: row.textColor,
      textColorDark: row.textColorDark,
      mutedTextColor: row.mutedTextColor,
      mutedTextColorDark: row.mutedTextColorDark,
    }
  },

  upsert: async (theme: SiteThemeConfig, updatedById?: string) => {
    return prisma.siteTheme.upsert({
      where: { id: THEME_ID },
      create: {
        id: THEME_ID,
        ...theme,
        updatedById,
      },
      update: {
        ...theme,
        updatedById,
      },
    })
  },

  ensureDefault: async () => {
    await prisma.siteTheme.upsert({
      where: { id: THEME_ID },
      create: { id: THEME_ID, ...DEFAULT_THEME },
      update: {},
    })
  },

  /** Loads persisted theme for SSR; falls back when the database is unreachable. */
  getForRender: async (): Promise<SiteThemeConfig> => {
    try {
      await themeRepository.ensureDefault()
      return await themeRepository.get()
    } catch {
      return DEFAULT_THEME
    }
  },
}
