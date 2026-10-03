/**
 * One-time / repeatable admin bootstrap.
 *
 * Usage (from pactmind/):
 *   npx tsx scripts/seed-admin.ts
 *
 * Or with explicit values:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret ADMIN_NAME="Admin" npx tsx scripts/seed-admin.ts
 *
 * Never commit real passwords — set ADMIN_PASSWORD in .env locally or in CI secrets.
 */
import * as dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

dotenv.config()

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'zain.ali.cs.dev@gmail.com')
    .trim()
    .toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME ?? 'PactMind Admin'

  if (!password) {
    console.error(
      'ADMIN_PASSWORD is required. Set it in .env or pass it for this run only.'
    )
    process.exit(1)
  }

  if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    console.error('DATABASE_URL or DIRECT_URL must be set.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      password: passwordHash,
      role: 'admin',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      name,
      password: passwordHash,
      role: 'admin',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  })

  console.log('Admin user ready:')
  console.log(`  id:    ${user.id}`)
  console.log(`  email: ${user.email}`)
  console.log(`  role:  ${user.role}`)
  console.log(`  emailVerified: ${user.emailVerified}`)
  console.log('')
  console.log('Login at /login. Use /forgot-password to reset the password later.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
