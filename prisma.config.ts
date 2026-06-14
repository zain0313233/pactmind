import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'
import { getPrismaCliDatabaseUrl } from './lib/database-url'

dotenv.config()

export default defineConfig({
  datasource: {
    url: getPrismaCliDatabaseUrl(),
  },
})