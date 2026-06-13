import { Card, Suit } from "./Card";
import { GameState, getTopDiscard } from "./GameState";

// Returns true if a card can legally be played given current game state.
// Enforces:
//   - pending draw stack: only 2s held at turn start are legal
//   - 8s are always wild (unless pending draw stack is active)
//   - normal matching: suit or rank
export function isCardPlayable(card: Card, state: GameState): boolean {
  const top = getTopDiscard(state);
  if (!top) return true; // empty discard: anything goes

  if (state.pendingDraw > 0) {
    // Only a 2 already in hand at turn start can respond
    return card.rank === "2" && state.cardsAtTurnStart.has(card.id);
  }

  // 8 is always wild when no pending draw
  if (card.rank === "8") return true;

  // Match active suit or rank of top discard
  return card.suit === state.activeSuit || card.rank === top.rank;
}

// Returns all playable cards from a hand.
export function getPlayableCards(hand: Card[], state: GameState): Card[] {
  return hand.filter((c) => isCardPlayable(c, state));
}

// Determine the next active suit after a card is played.
// For 8s, the caller must supply the chosen suit.
export function resolveActiveSuit(card: Card, chosenSuit?: Suit): Suit {
  if (card.rank === "8") {
    return chosenSuit ?? card.suit;
  }
  return card.suit;
}

// Reshuffle the discard pile (minus top card) into draw deck.
// Mutates the state in-place.
export function reshuffleDiscardIntoDraw(state: GameState): void {
  if (state.discardPile.length <= 1) return;
  const top = state.discardPile[state.discardPile.length - 1];
  const rest = state.discardPile.slice(0, state.discardPile.length - 1);
  // Fisher-Yates
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  state.drawDeck = [...state.drawDeck, ...rest];
  state.discardPile = [top];
}

// Draw one card from the draw deck.  Reshuffles if needed.
// Returns null only if truly no cards remain anywhere.
export function drawOneCard(state: GameState): Card | null {
  if (state.drawDeck.length === 0) {
    reshuffleDiscardIntoDraw(state);
  }
  if (state.drawDeck.length === 0) return null;
  return state.drawDeck.pop()!;
}

// Draw cards into a player's hand until a playable card is found.
// Returns the card that was drawn and is now playable (must be played immediately).
// Returns null if deck exhausted without finding a playable card.
export function drawUntilPlayable(
  playerIndex: number,
  state: GameState
): Card | null {
  const player = state.players[playerIndex];
  for (let attempts = 0; attempts < 200; attempts++) {
    const card = drawOneCard(state);
    if (!card) return null;
    player.hand.push(card);
    if (isCardPlayable(card, state)) {
      return card;
    }
  }
  return null;
}

// Draw N cards into a player's hand (penalty draw).
export function drawPenalty(
  playerIndex: number,
  count: number,
  state: GameState
): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    const card = drawOneCard(state);
    if (!card) break;
    state.players[playerIndex].hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

// Check if a player has won (empty hand).
export function checkWin(playerIndex: number, state: GameState): boolean {
  return state.players[playerIndex].hand.length === 0;
}
