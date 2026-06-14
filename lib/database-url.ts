/** Neon URLs often include channel_binding=require, which breaks some pg clients. */
export function normalizeDatabaseUrl(raw: string): string {
  let url = raw.replace(/&?channel_binding=require/g, "")
  if (!url.includes("connect_timeout=")) {
    url += url.includes("?") ? "&connect_timeout=30" : "?connect_timeout=30"
  }
  return url
}

export function getRuntimeDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error("DATABASE_URL is not set")
  }
  return normalizeDatabaseUrl(raw)
}

export function getPrismaCliDatabaseUrl(): string {
  const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!raw) {
    throw new Error("DATABASE_URL is not set")
  }
  return normalizeDatabaseUrl(raw)
}
