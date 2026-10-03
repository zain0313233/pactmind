"use client"

import { useEffect, useState } from "react"
import { Loader2, Palette, RotateCcw, Save, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "@/contexts/theme-provider"
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  isValidHex,
  type SiteThemeConfig,
} from "@/lib/theme"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-provider"
import { hasPermission } from "@/lib/rbac"

type ColorField = {
  key: keyof SiteThemeConfig
  label: string
  description: string
}

const colorFields: ColorField[] = [
  {
    key: "primaryColor",
    label: "Button / brand color",
    description: "Primary buttons, links, accents across the site",
  },
  {
    key: "primaryForegroundColor",
    label: "Button text color",
    description: "Text on primary buttons and active nav items",
  },
  {
    key: "textColor",
    label: "Text color (light pages)",
    description: "Marketing landing page & light mode body text",
  },
  {
    key: "textColorDark",
    label: "Text color (dark portal)",
    description: "Dashboard, chat & portal body text",
  },
  {
    key: "mutedTextColor",
    label: "Muted text (light)",
    description: "Subtitles and secondary text on marketing pages",
  },
  {
    key: "mutedTextColorDark",
    label: "Muted text (dark)",
    description: "Subtitles and secondary text in the portal",
  },
]

export function ThemeCustomizer() {
  const { user } = useAuth()
  const canEditTheme = hasPermission(user?.role ?? "user", "theme:write")
  const { theme, setThemeLocal, saveTheme, resetTheme, isSaving } = useTheme()
  const [draft, setDraft] = useState<SiteThemeConfig>(theme)

  useEffect(() => {
    setDraft(theme)
  }, [theme])

  function updateField(key: keyof SiteThemeConfig, value: string) {
    const next = { ...draft, [key]: value }
    setDraft(next)
    if (isValidHex(value)) setThemeLocal(next)
  }

  function applyPreset(preset: SiteThemeConfig) {
    setDraft(preset)
    setThemeLocal(preset)
  }

  async function handleSave() {
    for (const field of colorFields) {
      if (!isValidHex(draft[field.key])) {
        toast.error(`Invalid color for ${field.label}`)
        return
      }
    }
    try {
      await saveTheme(draft)
      toast.success("Theme saved! Changes apply site-wide.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save theme")
    }
  }

  async function handleReset() {
    try {
      await resetTheme()
      setDraft(DEFAULT_THEME)
      toast.success("Theme reset to default")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset theme")
    }
  }

  return (
    <Card className="border-border/60 bg-card/40">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Palette className="h-4 w-4 text-primary" />
          Theme customization
        </CardTitle>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {canEditTheme
            ? "Customize colors for the entire PactMind site — marketing pages, portal, buttons, and text. Saved to database for all visitors."
            : "Preview theme colors locally. Only administrators can save site-wide theme changes."}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Presets */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">
            Quick presets
          </Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.theme)}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/50"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-white/20"
                  style={{ background: preset.theme.primaryColor }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Live preview
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                background: draft.primaryColor,
                color: draft.primaryForegroundColor,
              }}
            >
              Primary button
            </button>
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: draft.primaryColor,
                color: draft.primaryColor,
              }}
            >
              Outline button
            </button>
            <span
              className="text-sm font-semibold"
              style={{ color: draft.textColorDark }}
            >
              Body text sample
            </span>
            <span
              className="text-xs"
              style={{ color: draft.mutedTextColorDark }}
            >
              Muted text sample
            </span>
          </div>
        </div>

        {/* Color pickers */}
        <div className="grid gap-4 sm:grid-cols-2">
          {colorFields.map((field) => (
            <ColorPickerField
              key={field.key}
              label={field.label}
              description={field.description}
              value={draft[field.key]}
              onChange={(v) => updateField(field.key, v)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          {canEditTheme ? (
            <>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save theme
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isSaving}
                onClick={handleReset}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset default
              </Button>
            </>
          ) : null}
          <p className="flex w-full items-center gap-1.5 text-[10px] text-muted-foreground sm:w-auto sm:ml-auto">
            <Sparkles className="h-3 w-3" />
            Affects marketing, dashboard, chat &amp; all buttons
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ColorPickerField({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
}) {
  const valid = isValidHex(value)

  return (
    <div className="space-y-2 rounded-xl border border-border/40 bg-background/30 p-3">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#14b8a6"
          className={cn(
            "h-9 font-mono text-xs uppercase",
            !valid && value.length > 0 && "border-destructive"
          )}
        />
      </div>
    </div>
  )
}
