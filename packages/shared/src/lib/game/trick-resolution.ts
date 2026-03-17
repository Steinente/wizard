import type { Card } from '../cards.js'
import {
  classifyCard,
  compareCards,
  getLeadSuitFromCard,
} from '../rules/card-ranking.js'
import type { ResolvedCardRuntimeEffect } from './special-state.js'
import type { TrickState } from './trick.js'

const getEffectForCard = (
  effects: ReadonlyArray<ResolvedCardRuntimeEffect>,
  cardId: string,
) => effects.find((entry) => entry.cardId === cardId) ?? null

export const resolveTrickWinner = (
  trick: Omit<TrickState, 'winnerPlayerId' | 'winningCard'>,
  trumpSuit: TrickState['leadSuit'],
  effects: ReadonlyArray<ResolvedCardRuntimeEffect> = [],
): TrickState => {
  const bombPlay = trick.plays.find(
    (play) => play.card.type === 'special' && play.card.special === 'bomb',
  )

  const derivedLeadSuit =
    trick.leadSuit ??
    trick.plays
      .map((play) =>
        getLeadSuitFromCard(play.card, getEffectForCard(effects, play.card.id)),
      )
      .find(Boolean) ??
    null

  if (bombPlay) {
    return {
      ...trick,
      leadSuit: derivedLeadSuit,
      winnerPlayerId: null,
      winningCard: null,
      cancelledByBomb: true,
    }
  }

  let winnerPlayerId: string | null = null
  let winningCard: Card | null = null
  let currentBest: ReturnType<typeof classifyCard> | null = null

  for (const play of trick.plays) {
    const classified = classifyCard(
      play.card,
      derivedLeadSuit,
      trumpSuit,
      getEffectForCard(effects, play.card.id),
    )

    if (!currentBest || compareCards(classified, currentBest) > 0) {
      currentBest = classified
      winnerPlayerId = play.playerId
      winningCard = play.card
    }
  }

  return {
    ...trick,
    leadSuit: derivedLeadSuit,
    winnerPlayerId,
    winningCard,
    cancelledByBomb: false,
  }
}
