import { SPECIAL_CARD_KEY, type Card } from '../cards.js'
import {
  classifyCard,
  compareCards,
  getLeadSuitFromCard,
} from '../rules/card-ranking.js'
import type { ResolvedCardRuntimeEffect } from './special-state.js'
import type { TrickPlay, TrickState } from './trick.js'

export const isBombCard = (card: Card): boolean =>
  card.type === 'special' && card.special === SPECIAL_CARD_KEY.bomb

const isEffectiveBombCard = (
  card: Card,
  effect: ResolvedCardRuntimeEffect | null,
): boolean => {
  if (isBombCard(card)) {
    return true
  }

  return !!(
    card.type === 'special' &&
    card.special === SPECIAL_CARD_KEY.vampire &&
    effect?.copiedCard &&
    isBombCard(effect.copiedCard)
  )
}

export const filterOutBombPlays = (
  plays: ReadonlyArray<TrickPlay>,
  effects: ReadonlyArray<ResolvedCardRuntimeEffect> = [],
): TrickPlay[] =>
  plays.filter(
    (play) =>
      !isEffectiveBombCard(play.card, getEffectForCard(effects, play.card.id)),
  )

const getEffectForCard = (
  effects: ReadonlyArray<ResolvedCardRuntimeEffect>,
  cardId: string,
) => effects.find((entry) => entry.cardId === cardId) ?? null

const getEffectiveSpecial = (
  card: Card,
  effect: ResolvedCardRuntimeEffect | null,
): string | null => {
  if (card.type !== 'special') {
    return null
  }

  if (card.special !== SPECIAL_CARD_KEY.vampire) {
    return card.special
  }

  if (effect?.copiedCard?.type === 'special') {
    return effect.copiedCard.special
  }

  return null
}

export const resolveTrickWinner = (
  trick: Omit<TrickState, 'winnerPlayerId' | 'winningCard'>,
  trumpSuit: TrickState['leadSuit'],
  effects: ReadonlyArray<ResolvedCardRuntimeEffect> = [],
): TrickState => {
  const bombPlay = trick.plays.find((play) =>
    isEffectiveBombCard(play.card, getEffectForCard(effects, play.card.id)),
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

  const fairyPlay = trick.plays.find(
    (play) =>
      getEffectiveSpecial(
        play.card,
        getEffectForCard(effects, play.card.id),
      ) === SPECIAL_CARD_KEY.fairy,
  )
  const dragonPlay = trick.plays.find(
    (play) =>
      getEffectiveSpecial(
        play.card,
        getEffectForCard(effects, play.card.id),
      ) === SPECIAL_CARD_KEY.dragon,
  )

  if (fairyPlay && dragonPlay) {
    return {
      ...trick,
      leadSuit: derivedLeadSuit,
      winnerPlayerId: fairyPlay.playerId,
      winningCard: fairyPlay.card,
      cancelledByBomb: false,
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
