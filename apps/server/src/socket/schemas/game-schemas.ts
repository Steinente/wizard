import { z } from 'zod'

export const gameStartSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
})

export const makePredictionSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  value: z.number().int().min(0).max(20),
})

export const playCardSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  cardId: z.string().trim().min(1),
})

export const selectTrumpSuitSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  suit: z.union([z.enum(['red', 'yellow', 'green', 'blue']), z.null()]),
})

export const resolveShapeShifterSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  cardId: z.string().trim().min(1),
  mode: z.enum(['wizard', 'jester']),
})

export const resolveCloudSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  cardId: z.string().trim().min(1),
  suit: z.enum(['red', 'yellow', 'green', 'blue']),
})

export const resolveCloudAdjustmentSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  delta: z.union([z.literal(1), z.literal(-1)]),
})

export const resolveJugglerSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  cardId: z.string().trim().min(1),
  suit: z.enum(['red', 'yellow', 'green', 'blue']),
})

export const selectJugglerPassCardSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  cardId: z.string().trim().min(1),
})

export const resolveWerewolfTrumpSwapSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  suit: z.union([z.enum(['red', 'yellow', 'green', 'blue']), z.null()]),
})

export const sendChatMessageSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(300),
})
