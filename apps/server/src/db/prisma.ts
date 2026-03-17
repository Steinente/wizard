import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { env } from '../config/env.js'
import { PrismaClient } from '../generated/prisma/client.js'

declare global {
  var __wizardPrisma__: PrismaClient | undefined
  var __wizardPgPool__: Pool | undefined
}

const pool =
  globalThis.__wizardPgPool__ ??
  new Pool({
    connectionString: env.DATABASE_URL,
  })

const adapter = new PrismaPg(pool)

export const prisma =
  globalThis.__wizardPrisma__ ??
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__wizardPgPool__ = pool
  globalThis.__wizardPrisma__ = prisma
}
