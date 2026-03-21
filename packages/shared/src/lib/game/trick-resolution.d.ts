import type { TrickState } from './trick.js'
export declare const resolveTrickWinner: (
  trick: Omit<TrickState, 'winnerPlayerId' | 'winningCard'>,
  trumpSuit: TrickState['leadSuit'],
) => TrickState
