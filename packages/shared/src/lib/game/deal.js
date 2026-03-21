export const dealCards = (deck, playerIds, cardsPerPlayer) => {
  const workingDeck = [...deck]
  const hands = Object.fromEntries(playerIds.map((playerId) => [playerId, []]))
  for (let round = 0; round < cardsPerPlayer; round += 1) {
    for (const playerId of playerIds) {
      const nextCard = workingDeck.shift()
      if (!nextCard) {
        throw new Error('Not enough cards in deck while dealing')
      }
      hands[playerId].push(nextCard)
    }
  }
  return {
    hands,
    trumpCard: workingDeck.shift() ?? null,
    remainingDeck: workingDeck,
  }
}
//# sourceMappingURL=deal.js.map
