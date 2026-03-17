import type { TranslationKey } from '../../../core/i18n/translations'

const logKeyMap: Record<string, TranslationKey> = {
  'game.started': 'log.game.started',
  'game.round.scored': 'log.game.round.scored',
  'game.finished': 'log.game.finished',
  'game.trump.selected': 'log.game.trump.selected',
  'game.trump.selected.bySpecial': 'log.game.trump.selected.bySpecial',
  'game.prediction.made': 'log.game.prediction.made',
  'game.card.played': 'log.game.card.played',
  'game.trick.won': 'log.game.trick.won',
  'game.trick.canceledByBomb': 'log.game.trick.canceledByBomb',
  'special.shapeShifter.resolved': 'log.special.shapeShifter.resolved',
  'special.cloud.applied': 'log.special.cloud.applied',
  'special.cloud.played': 'log.special.cloud.played',
  'special.cloud.predictionAdjusted': 'log.special.cloud.predictionAdjusted',
  'special.juggler.applied': 'log.special.juggler.applied',
  'special.juggler.played': 'log.special.juggler.played',
  'special.juggler.pass.completed': 'log.special.juggler.pass.completed',
  'special.bomb.played': 'log.special.bomb.played',
  'special.werewolf.pendingTrumpEffect':
    'log.special.werewolf.pendingTrumpEffect',
  'special.dragon.played': 'log.special.dragon.played',
  'special.fairy.played': 'log.special.fairy.played',
}

export const getLogTranslationKey = (
  messageKey: string,
): TranslationKey | null => logKeyMap[messageKey] ?? null
