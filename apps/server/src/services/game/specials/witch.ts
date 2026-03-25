import {
  SPECIAL_CARD_KEY,
  type Card,
  type WizardGameState,
} from '@wizard/shared'
import { createDecisionId, nowIso } from './special-utils.js'

interface EnqueuePendingWitchExchangeDecisionContext {
  state: WizardGameState
  getReadableCardLabel: (card: Card) => string
}

interface ResolveWitchExchangeDecisionContext {
  state: WizardGameState
  playerId: string
  handCardId: string
  trickCardId: string
  removeCardFromHand: (playerId: string, cardId: string) => Card
}

export const isWitchCard = (card: Card): boolean =>
  card.type === 'special' && card.special === SPECIAL_CARD_KEY.witch

export const disablesFollowSuitForWitchLead = (card: Card): boolean =>
  isWitchCard(card)

export const markPendingWitchExchange = (context: {
  state: WizardGameState
  playerId: string
  witchCardId: string
  trickIndex: number
}) => {
  const roundPlayer = context.state.currentRound?.players.find(
    (entry) => entry.playerId === context.playerId,
  )

  if (!roundPlayer) {
    return
  }

  roundPlayer.pendingWitchExchange = true
  roundPlayer.pendingWitchCardId = context.witchCardId
  roundPlayer.pendingWitchTrickIndex = context.trickIndex
}

export const enqueuePendingWitchExchangeDecision = (
  context: EnqueuePendingWitchExchangeDecisionContext,
): boolean => {
  if (!context.state.currentRound || context.state.pendingDecision) {
    return false
  }

  const roundPlayer = context.state.currentRound.players.find(
    (entry) => entry.pendingWitchExchange,
  )

  if (!roundPlayer) {
    return false
  }

  const trickIndex = roundPlayer.pendingWitchTrickIndex
  const witchCardId = roundPlayer.pendingWitchCardId

  if (
    typeof trickIndex !== 'number' ||
    trickIndex < 0 ||
    !witchCardId ||
    !context.state.currentRound.completedTricks[trickIndex]
  ) {
    roundPlayer.pendingWitchExchange = false
    roundPlayer.pendingWitchCardId = undefined
    roundPlayer.pendingWitchTrickIndex = undefined
    return false
  }

  const completedTrick = context.state.currentRound.completedTricks[trickIndex]
  const trickHasMatchingWitch = completedTrick.plays.some(
    (play) => play.card.id === witchCardId,
  )

  if (!trickHasMatchingWitch) {
    roundPlayer.pendingWitchExchange = false
    roundPlayer.pendingWitchCardId = undefined
    roundPlayer.pendingWitchTrickIndex = undefined
    return false
  }

  const handCardOptions = roundPlayer.hand.map((card) => ({
    cardId: card.id,
    cardLabel: context.getReadableCardLabel(card),
  }))

  const trickCardOptions = completedTrick.plays
    .filter((play) => play.card.id !== witchCardId)
    .map((play) => ({
      cardId: play.card.id,
      cardLabel: context.getReadableCardLabel(play.card),
    }))

  if (!trickCardOptions.length) {
    roundPlayer.pendingWitchExchange = false
    roundPlayer.pendingWitchCardId = undefined
    roundPlayer.pendingWitchTrickIndex = undefined
    return false
  }

  if (!handCardOptions.length) {
    context.state.logs.push({
      id: createDecisionId(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.witch.noHandCard',
      messageParams: {
        playerId: roundPlayer.playerId,
      },
    })

    roundPlayer.pendingWitchExchange = false
    roundPlayer.pendingWitchCardId = undefined
    roundPlayer.pendingWitchTrickIndex = undefined
    return false
  }

  context.state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.witch.exchange.started',
    messageParams: {
      playerId: roundPlayer.playerId,
    },
  })

  context.state.pendingDecision = {
    id: createDecisionId(),
    type: 'witchExchange',
    playerId: roundPlayer.playerId,
    createdAt: nowIso(),
    cardId: witchCardId,
    special: SPECIAL_CARD_KEY.witch,
    trickIndex,
    handCardOptions,
    trickCardOptions,
  }

  return true
}

export const resolveWitchExchangeDecision = (
  context: ResolveWitchExchangeDecisionContext,
) => {
  if (
    !context.state.currentRound ||
    !context.state.pendingDecision ||
    context.state.pendingDecision.type !== 'witchExchange' ||
    context.state.pendingDecision.playerId !== context.playerId
  ) {
    throw new Error('No witch exchange decision pending')
  }

  const roundPlayer = context.state.currentRound.players.find(
    (entry) => entry.playerId === context.playerId,
  )

  if (!roundPlayer) {
    throw new Error('Player is not part of the round')
  }

  const decision = context.state.pendingDecision

  const selectedHandCard = decision.handCardOptions.find(
    (entry) => entry.cardId === context.handCardId,
  )
  const selectedTrickCard = decision.trickCardOptions.find(
    (entry) => entry.cardId === context.trickCardId,
  )

  if (!selectedHandCard || !selectedTrickCard) {
    throw new Error('Invalid witch exchange selection')
  }

  const takenCard =
    context.state.currentRound.completedTricks[decision.trickIndex]?.plays.find(
      (play) => play.card.id === context.trickCardId,
    )?.card ?? null

  if (!takenCard) {
    throw new Error('Chosen trick card not found')
  }

  context.removeCardFromHand(context.playerId, context.handCardId)
  roundPlayer.hand.push(takenCard)

  let cloudPlayerNoLongerFloatingId: string | null = null

  if (
    context.state.config.cloudRuleTiming === 'endOfRound' &&
    takenCard.type === 'special' &&
    takenCard.special === SPECIAL_CARD_KEY.cloud
  ) {
    const trickWinnerPlayerId =
      context.state.currentRound.completedTricks[decision.trickIndex]
        ?.winnerPlayerId ?? null

    if (trickWinnerPlayerId) {
      const trickWinner = context.state.currentRound.players.find(
        (entry) => entry.playerId === trickWinnerPlayerId,
      )

      if (trickWinner?.pendingCloudAdjustment) {
        trickWinner.pendingCloudAdjustment = false
        cloudPlayerNoLongerFloatingId = trickWinnerPlayerId
      }
    }
  }

  context.state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.witch.exchanged',
    messageParams: {
      playerId: context.playerId,
      givenCardLabel: selectedHandCard.cardLabel,
      takenCardLabel: selectedTrickCard.cardLabel,
    },
  })

  if (cloudPlayerNoLongerFloatingId) {
    context.state.logs.push({
      id: createDecisionId(),
      createdAt: nowIso(),
      type: 'specialEffect',
      messageKey: 'special.cloud.noLongerFloatingNineThreeQuarters',
      messageParams: {
        playerId: cloudPlayerNoLongerFloatingId,
      },
    })
  }

  roundPlayer.pendingWitchExchange = false
  roundPlayer.pendingWitchCardId = undefined
  roundPlayer.pendingWitchTrickIndex = undefined
  context.state.pendingDecision = null
}

export const logWitchPlayed = (state: WizardGameState, playerId: string) => {
  state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.witch.played',
    messageParams: {
      playerId,
    },
  })
}
