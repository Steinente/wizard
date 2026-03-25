import type { Card, SpecialCard, Suit } from '../cards.js'
import type { RoundState } from '../game/round.js'
import type { TrickState } from '../game/trick.js'

export interface SpecialCardEffectContext {
  playerId: string
  card: SpecialCard
  round: RoundState
  currentTrick: TrickState | null
  trumpSuit: Suit | null
}

export interface SpecialCardEffectResult {
  leadSuitOverride?: Suit | null
  cardActsAsSuit?: Suit | null
  cardActsAsValue?: number | null
  immediateWinTrick?: boolean
  immediateLoseTrick?: boolean
  forcePredictionDelta?: number | null
  extraLogKeys?: string[]
}

export interface SpecialCardDefinition {
  key: SpecialCard['special']
  labelKey: string
  descriptionKey: string
  isPlayableAnytime: boolean
  resolveBeforeTrickWinner: boolean
}

export const SPECIAL_CARD_DEFINITIONS: Record<
  SpecialCard['special'],
  SpecialCardDefinition
> = {
  shapeShifter: {
    key: 'shapeShifter',
    labelKey: 'card.special.shapeShifter',
    descriptionKey: 'card.special.shapeShifter.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: true,
  },
  bomb: {
    key: 'bomb',
    labelKey: 'card.special.bomb',
    descriptionKey: 'card.special.bomb.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: true,
  },
  werewolf: {
    key: 'werewolf',
    labelKey: 'card.special.werewolf',
    descriptionKey: 'card.special.werewolf.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: true,
  },
  vampire: {
    key: 'vampire',
    labelKey: 'card.special.vampire',
    descriptionKey: 'card.special.vampire.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: true,
  },
  darkEye: {
    key: 'darkEye',
    labelKey: 'card.special.darkEye',
    descriptionKey: 'card.special.darkEye.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: true,
  },
  cloud: {
    key: 'cloud',
    labelKey: 'card.special.cloud',
    descriptionKey: 'card.special.cloud.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: true,
  },
  juggler: {
    key: 'juggler',
    labelKey: 'card.special.juggler',
    descriptionKey: 'card.special.juggler.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: true,
  },
  dragon: {
    key: 'dragon',
    labelKey: 'card.special.dragon',
    descriptionKey: 'card.special.dragon.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: true,
  },
  fairy: {
    key: 'fairy',
    labelKey: 'card.special.fairy',
    descriptionKey: 'card.special.fairy.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: true,
  },
  witch: {
    key: 'witch',
    labelKey: 'card.special.witch',
    descriptionKey: 'card.special.witch.description',
    isPlayableAnytime: true,
    resolveBeforeTrickWinner: false,
  },
}

export const getSpecialCardDefinition = (card: Card) =>
  card.type === 'special' ? SPECIAL_CARD_DEFINITIONS[card.special] : null
