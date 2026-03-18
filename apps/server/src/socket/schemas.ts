import { z } from 'zod'

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
      languageDefault: z.enum(['en', 'de']).optional(),
      allowIncludedSpecialCards: z.boolean().optional(),
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
    languageDefault: z.enum(['en', 'de']).optional(),
    allowIncludedSpecialCards: z.boolean().optional(),
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

export const setAudioEnabledSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  enabled: z.boolean(),
})

export const setInGameSchema = z.object({
  code: z.string().trim().min(4).max(12),
  sessionToken: z.string().trim().min(1).max(200),
  inGame: z.boolean(),
})
