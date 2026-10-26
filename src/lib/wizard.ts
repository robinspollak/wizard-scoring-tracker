// Rules of our game: a plain 52-card deck (aces are wizards, twos are
// jesters), first round deals 3 cards each, and every round deals one more
// until the deck runs out.
export const DECK_SIZE = 52;
export const FIRST_ROUND_CARDS = 3;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = Math.floor(DECK_SIZE / FIRST_ROUND_CARDS);

export function maxRounds(numPlayers: number): number {
  if (numPlayers < 1) return 0;
  return Math.max(0, Math.floor(DECK_SIZE / numPlayers) - FIRST_ROUND_CARDS + 1);
}

export function cardsInRound(round: number): number {
  return round + FIRST_ROUND_CARDS - 1;
}

/** Seat that deals (and therefore bids last) in a 1-indexed round. */
export function dealerSeat(round: number, numPlayers: number): number {
  return (round - 1) % numPlayers;
}

/** Seats in bidding order: left of the dealer first, dealer last. */
export function biddingOrder(round: number, numPlayers: number): number[] {
  const dealer = dealerSeat(round, numPlayers);
  return Array.from({ length: numPlayers }, (_, i) => (dealer + 1 + i) % numPlayers);
}

/** The table can't bid exactly the number of tricks available. */
export function betsAreIllegal(bets: number[], cards: number): boolean {
  return bets.reduce((a, b) => a + b, 0) === cards;
}

/** Scores are entered by hand, so a positive round score is our proxy for "made the bet". */
export function madeBet(score: number): boolean {
  return score > 0;
}
