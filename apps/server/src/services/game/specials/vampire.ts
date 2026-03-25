import {
  SPECIAL_CARD_KEY,
  type Card,
  type Suit,
  type WizardGameState,
} from '@wizard/shared'
import type {
  BeforePlaySpecialContext,
  BeforePlaySpecialResult,
} from './special-types.js'
import { createDecisionId, nowIso } from './special-utils.js'

interface HandleVampireBeforePlayContext extends BeforePlaySpecialContext {
  registerResolvedEffect: (
    effect: WizardGameState['resolvedCardEffects'][number],
  ) => void
  getReadableCardLabel: (card: Card) => string
}

const getTrumpSuitFromCard = (card: Card | null): Suit | null => {
  if (!card) {
    return null
  }

  return card.type === 'number' ? card.suit : null
}

const asCopiedSpecialCard = (
  cardId: string,
  special:
    | typeof SPECIAL_CARD_KEY.shapeShifter
    | typeof SPECIAL_CARD_KEY.cloud
    | typeof SPECIAL_CARD_KEY.juggler,
): Card => ({
  id: `${cardId}-copied-${special}`,
  type: 'special',
  special,
  labelKey: `card.special.${special}`,
})

export const handleVampireBeforePlay = (
  context: HandleVampireBeforePlayContext,
): BeforePlaySpecialResult => {
  const round = context.state.currentRound

  if (!round) {
    throw new Error('Round not initialized')
  }

  let copiedCard = round.trumpCard
  const trumpWasWerewolf =
    copiedCard?.type === 'special' &&
    copiedCard.special === SPECIAL_CARD_KEY.werewolf

  if (trumpWasWerewolf && round.drawPile.length > 0) {
    const replacementCard = round.drawPile.shift() ?? null

    if (replacementCard) {
      round.trumpCard = replacementCard
      round.trumpSuit = getTrumpSuitFromCard(replacementCard)
      round.deckRemainderCount = round.drawPile.length
      copiedCard = replacementCard
    }
  }

  const copiedCardLabel = copiedCard
    ? context.getReadableCardLabel(copiedCard)
    : 'none'

  context.state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: trumpWasWerewolf
      ? 'special.vampire.played.werewolfTrumpRevealed'
      : 'special.vampire.played',
    messageParams: {
      playerId: context.playerId,
      copiedCardLabel,
    },
  })

  if (!copiedCard) {
    context.registerResolvedEffect({
      cardId: context.card.id,
      ownerPlayerId: context.playerId,
      special: SPECIAL_CARD_KEY.vampire,
      note: 'no trump card available to copy',
    })

    return {
      requiresDecision: false,
    }
  }

  if (
    copiedCard.type === 'special' &&
    copiedCard.special === SPECIAL_CARD_KEY.shapeShifter
  ) {
    context.state.pendingDecision = {
      id: createDecisionId(),
      type: 'shapeShifterChoice',
      playerId: context.playerId,
      createdAt: nowIso(),
      cardId: context.card.id,
      special: SPECIAL_CARD_KEY.vampire,
      modeOptions: ['wizard', 'jester'],
    }

    return {
      requiresDecision: true,
      messageKey: 'special.shapeShifter.choose',
    }
  }

  if (
    copiedCard.type === 'special' &&
    copiedCard.special === SPECIAL_CARD_KEY.cloud
  ) {
    context.state.pendingDecision = {
      id: createDecisionId(),
      type: 'cloudSuitChoice',
      playerId: context.playerId,
      createdAt: nowIso(),
      cardId: context.card.id,
      special: SPECIAL_CARD_KEY.vampire,
      allowedSuits: ['red', 'yellow', 'green', 'blue'],
    }

    return {
      requiresDecision: true,
      messageKey: 'special.cloud.chooseSuit',
    }
  }

  if (
    copiedCard.type === 'special' &&
    copiedCard.special === SPECIAL_CARD_KEY.juggler
  ) {
    context.state.pendingDecision = {
      id: createDecisionId(),
      type: 'jugglerSuitChoice',
      playerId: context.playerId,
      createdAt: nowIso(),
      cardId: context.card.id,
      special: SPECIAL_CARD_KEY.vampire,
      allowedSuits: ['red', 'yellow', 'green', 'blue'],
    }

    return {
      requiresDecision: true,
      messageKey: 'special.juggler.chooseSuit',
    }
  }

  context.registerResolvedEffect({
    cardId: context.card.id,
    ownerPlayerId: context.playerId,
    special: SPECIAL_CARD_KEY.vampire,
    copiedCard,
    note: 'vampire copied active trump card',
  })

  return {
    requiresDecision: false,
  }
}

export const createVampireCopiedCard = (
  cardId: string,
  copiedSpecial:
    | typeof SPECIAL_CARD_KEY.shapeShifter
    | typeof SPECIAL_CARD_KEY.cloud
    | typeof SPECIAL_CARD_KEY.juggler,
): Card => asCopiedSpecialCard(cardId, copiedSpecial)
