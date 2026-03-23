import { z } from 'zod'

const specialCardKeySchema = z.enum([
  'shapeShifter',
  'bomb',
  'werewolf',
  'cloud',
  'juggler',
  'dragon',
  'fairy',
])

export const createLobbySchema = z.object({
  playerName: z.string().trim().min(1).max(24),
  sessionToken: z.string().trim().min(1).max(200),
  password: z.string().trim().max(64).optional(),
  config: z
    .object({
      predictionVisibility: z.enum(['open', 'hidden', 'secret']).optional(),
      openPredictionRestriction: z
        .enum(['none', 'mustEqualTricks', 'mustNotEqualTricks'])
        .optional(),
      cloudRuleTiming: z.enum(['endOfRound', 'immediateAfterTrick']).optional(),
      languageDefault: z.enum(['en', 'de']).optional(),
      includedSpecialCards: z.array(specialCardKeySchema).optional(),
    })
    .optional(),
})

export const joinLobbySchema = z.object({
  code: z.string().trim().min(4).max(12),
  playerName: z.string().trim().min(1).max(24),
  sessionToken: z.string().trim().min(1).max(200),
  password: z.string().trim().max(64).optional(),
})

export const spectateLobbySchema = z.object({
  code: z.string().trim().min(4).max(12),
  playerName: z.string().trim().min(1).max(24),
  sessionToken: z.string().trim().min(1).max(200),
  password: z.string().trim().max(64).optional(),
})

export const listLobbiesSchema = z.object({}).optional()

export const reconnectLobbySchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
})

export const updateConfigSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  config: z.object({
    predictionVisibility: z.enum(['open', 'hidden', 'secret']).optional(),
    openPredictionRestriction: z
      .enum(['none', 'mustEqualTricks', 'mustNotEqualTricks'])
      .optional(),
    cloudRuleTiming: z.enum(['endOfRound', 'immediateAfterTrick']).optional(),
    languageDefault: z.enum(['en', 'de']).optional(),
    includedSpecialCards: z.array(specialCardKeySchema).optional(),
  }),
})

export const kickPlayerSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  targetPlayerId: z.string().trim().min(1),
})

export const endLobbySchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
})
