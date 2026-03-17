import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_UI_URL: z.string().url(),
  CLIENT_A11Y_URL: z.string().url(),
  HOST_DISCONNECT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(600000),
})

export const env = envSchema.parse(process.env)
