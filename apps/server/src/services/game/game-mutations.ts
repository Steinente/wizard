import type { Card, WizardGameState } from '@wizard/shared'
import { isBombCard } from '@wizard/shared'
import crypto from 'node:crypto'
import {
  getReadableCardLabel,
  getResolvedEffectForCard,
  getSeatOrderedPlayerIds,
  isFollowSuitDisabledInTrick,
  nowIso,
} from './game-service-support.js'
import {
  isFairyCard,
  logBombPlayed,
  logDragonPlayed,
  logFairyPlayed,
  logWitchPlayed,
} from './specials/index.js'

const SPECIAL_CARDS_WITH_OWN_PLAY_LOG: ReadonlySet<string> = new Set([
  'shapeShifter',
  'vampire',
  'juggler',
  'cloud',
] as const)

export function registerResolvedEffect(
  state: WizardGameState,
  effect: WizardGameState['resolvedCardEffects'][number],
) {
  state.resolvedCardEffects = state.resolvedCardEffects.filter(
    (entry) => entry.cardId !== effect.cardId,
  )
  state.resolvedCardEffects.push(effect)
}

export function removeCardFromHand(
  state: WizardGameState,
  playerId: string,
  cardId: string,
): Card {
  const roundPlayer = state.currentRound?.players.find(
    (entry) => entry.playerId === playerId,
  )

  if (!roundPlayer) {
    throw new Error('Player is not part of the round')
  }

  const card = roundPlayer.hand.find((entry) => entry.id === cardId)

  if (!card) {
    throw new Error('Card not found in hand')
  }

  roundPlayer.hand = roundPlayer.hand.filter((entry) => entry.id !== cardId)

  return card
}

export function appendCardToCurrentTrick(
  state: WizardGameState,
  playerId: string,
  card: Card,
) {
  if (!state.currentRound) {
    throw new Error('Round not initialized')
  }

  const trick = state.currentRound.currentTrick ?? {
    leadPlayerId: playerId,
    leadSuit: null,
    plays: [],
    winnerPlayerId: null,
    winningCard: null,
    cancelledByBomb: false,
  }

  trick.plays.push({
    playerId,
    card,
    playedAt: nowIso(),
  })

  if (!trick.leadSuit && !isFollowSuitDisabledInTrick(trick, state)) {
    if (card.type === 'number') {
      trick.leadSuit = card.suit
    } else if (card.type === 'special') {
      const effect = getResolvedEffectForCard(state, card.id)
      if (effect?.chosenSuit) {
        trick.leadSuit = effect.chosenSuit
      }
    }
  }

  state.currentRound.currentTrick = trick

  // Don't log shape shifter, juggler or cloud plays here - the detailed logs are created when resolving special effects
  if (
    card.type !== 'special' ||
    !SPECIAL_CARDS_WITH_OWN_PLAY_LOG.has(card.special)
  ) {
    if (isBombCard(card)) {
      logBombPlayed(state, playerId)
      return
    }

    if (card.type === 'special' && card.special === 'dragon') {
      logDragonPlayed(state, playerId)
      return
    }

    if (isFairyCard(card)) {
      logFairyPlayed(state, playerId)
      return
    }

    if (card.type === 'special' && card.special === 'witch') {
      logWitchPlayed(state, playerId)
      return
    }

    state.logs.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      type: 'cardPlayed',
      messageKey: 'game.card.played',
      messageParams: {
        playerId,
        cardLabel: getReadableCardLabel(card),
      },
    })
  }
}

export function beginJugglerPassDecision(state: WizardGameState) {
  if (!state.currentRound) {
    return
  }

  const orderedPlayerIds = getSeatOrderedPlayerIds(state)
  const eligible = orderedPlayerIds.filter((playerId) => {
    const roundPlayer = state.currentRound?.players.find(
      (entry) => entry.playerId === playerId,
    )
    return !!roundPlayer && roundPlayer.hand.length > 0
  })

  if (!eligible.length) {
    return
  }

  state.logs.push({
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.juggler.pass.started',
  })

  state.pendingDecision = {
    id: crypto.randomUUID(),
    type: 'jugglerPassCard',
    playerId: eligible[0],
    createdAt: nowIso(),
    special: 'juggler',
    orderedPlayerIds: eligible,
    selections: {},
    remainingPlayerIds: eligible,
  }
}
