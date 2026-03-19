import { z } from 'zod'

export const setReadLogEnabledSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  enabled: z.boolean(),
})

export const setInGameSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  inGame: z.boolean(),
})