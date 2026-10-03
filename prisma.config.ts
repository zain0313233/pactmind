import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'
import { getPrismaCliDatabaseUrl } from './lib/database-url'

dotenv.config()

/** prisma generate never connects; placeholder allows Netlify/CI install before env is injected. */
function prismaConfigDatabaseUrl(): string {
  try {
    return getPrismaCliDatabaseUrl()
  } catch {
    return 'postgresql://build:build@localhost:5432/build?sslmode=require'
  }
}

export default defineConfig({
  datasource: {
    url: prismaConfigDatabaseUrl(),
  },
})