export const SPECIAL_CARD_DEFINITIONS = {
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
};
export const getSpecialCardDefinition = (card) => card.type === 'special' ? SPECIAL_CARD_DEFINITIONS[card.special] : null;
//# sourceMappingURL=special-rules.js.map