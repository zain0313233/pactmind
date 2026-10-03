import { themeToDarkVars, type SiteThemeConfig } from "@/lib/theme"

export function ThemeDarkStyles({ theme }: { theme: SiteThemeConfig }) {
  const dark = themeToDarkVars(theme)
  const css = `.dark {\n  ${Object.entries(dark)
    .map(([k, v]) => `${k}: ${v};`)
    .join("\n  ")}\n}`

  return (
    <style
      id="pactmind-dark-theme-vars"
      dangerouslySetInnerHTML={{ __html: css }}
    />
  )
}
