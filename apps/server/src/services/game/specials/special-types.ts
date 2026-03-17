import type { Card, SpecialCard, WizardGameState } from '@wizard/shared'

export interface BeforePlaySpecialContext {
  state: WizardGameState
  playerId: string
  card: SpecialCard
}

export interface BeforePlaySpecialResult {
  requiresDecision: boolean
  autoResolved?: boolean
  messageKey?: string
  messageParams?: Record<string, string | number | boolean | null>
}

export interface AfterPlaySpecialContext {
  state: WizardGameState
  playerId: string
  card: Card
}

export interface AfterPlaySpecialResult {
  messageKey?: string
  messageParams?: Record<string, string | number | boolean | null>
}
