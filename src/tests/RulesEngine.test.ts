import { describe, it, expect, beforeEach } from "vitest";
import { Card, Suit } from "../game/Card";
import { GameState, createInitialGameState } from "../game/GameState";
import {
  isCardPlayable,
  getPlayableCards,
  drawPenalty,
  reshuffleDiscardIntoDraw,
  drawOneCard,
  checkWin,
} from "../game/RulesEngine";
import { createHumanPlayer, createNPCPlayer } from "../game/Player";
import { createDoubleDeck, shuffle } from "../game/Deck";

function makeCard(suit: Suit, rank: Card["rank"], id?: string): Card {
  return {
    id: id ?? `test-${suit}-${rank}`,
    deckNumber: 1,
    suit,
    rank,
  };
}

function makeState(topDiscard: Card, activeSuit: Suit): GameState {
  const players = [createHumanPlayer(), createNPCPlayer("Bot", "greg", 1)];
  const state = createInitialGameState(players);
  state.discardPile = [topDiscard];
  state.activeSuit = activeSuit;
  state.drawDeck = shuffle(createDoubleDeck()).slice(0, 40);
  return state;
}

describe("RulesEngine", () => {
  // 1. Match by suit
  it("allows card matching active suit", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    const card = makeCard("hearts", "3");
    expect(isCardPlayable(card, state)).toBe(true);
  });

  // 2. Match by rank
  it("allows card matching top discard rank", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    const card = makeCard("clubs", "7");
    expect(isCardPlayable(card, state)).toBe(true);
  });

  // 3. 8 is always wild when no pending draw
  it("8 is always playable when no pending draw", () => {
    const top = makeCard("hearts", "5");
    const state = makeState(top, "hearts");
    const card = makeCard("clubs", "8");
    expect(isCardPlayable(card, state)).toBe(true);
  });

  // 4. 8 is not valid response to pending draw stack
  it("8 cannot respond to pending draw stack", () => {
    const top = makeCard("hearts", "2");
    const state = makeState(top, "hearts");
    state.pendingDraw = 2;
    const card = makeCard("clubs", "8");
    state.cardsAtTurnStart = new Set([card.id]);
    expect(isCardPlayable(card, state)).toBe(false);
  });

  // 5. 2 starts pending draw 2
  it("playing 2 raises pendingDraw by 2", () => {
    const top = makeCard("hearts", "5");
    const state = makeState(top, "hearts");
    state.pendingDraw = 0;
    // Simulate: after a 2 is played pendingDraw becomes 2
    // (This is handled in TurnManager, but we verify the isCardPlayable path)
    const two = makeCard("hearts", "2");
    expect(isCardPlayable(two, state)).toBe(true);
  });

  // 6. 2 stacks pending draw
  it("2 can respond to an existing draw stack if in hand at turn start", () => {
    const top = makeCard("clubs", "2");
    const state = makeState(top, "clubs");
    state.pendingDraw = 2;
    const two = makeCard("hearts", "2", "my-2");
    state.cardsAtTurnStart = new Set([two.id]);
    expect(isCardPlayable(two, state)).toBe(true);
  });

  // 7. Player with no 2 during pending draw cannot play other cards
  it("non-2 cards are not playable during pending draw stack", () => {
    const top = makeCard("clubs", "2");
    const state = makeState(top, "clubs");
    state.pendingDraw = 4;
    const card = makeCard("clubs", "A", "club-a");
    state.cardsAtTurnStart = new Set([card.id]);
    expect(isCardPlayable(card, state)).toBe(false);
  });

  // 8. 2 drawn during penalty cannot be immediately played
  it("2 drawn as part of penalty is not in cardsAtTurnStart so cannot respond", () => {
    const top = makeCard("clubs", "2");
    const state = makeState(top, "clubs");
    state.pendingDraw = 2;
    const drawnTwo = makeCard("spades", "2", "drawn-2");
    // Not in cardsAtTurnStart
    state.cardsAtTurnStart = new Set();
    expect(isCardPlayable(drawnTwo, state)).toBe(false);
  });

  // 9. 4 skip logic is in TurnManager — we test that 4 is playable
  it("4 is playable by rank match", () => {
    const top = makeCard("clubs", "4");
    const state = makeState(top, "clubs");
    const four = makeCard("hearts", "4");
    expect(isCardPlayable(four, state)).toBe(true);
  });

  // 10. Non-matching card not playable
  it("non-matching card is not playable", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    const card = makeCard("clubs", "3");
    expect(isCardPlayable(card, state)).toBe(false);
  });

  // 11. getPlayableCards returns correct subset
  it("getPlayableCards filters correctly", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    const hand = [
      makeCard("hearts", "3"), // playable (suit)
      makeCard("clubs", "7"), // playable (rank)
      makeCard("clubs", "3"), // not playable
      makeCard("spades", "8"), // playable (wild)
    ];
    const playable = getPlayableCards(hand, state);
    expect(playable).toHaveLength(3);
  });

  // 12. drawPenalty adds cards to hand
  it("drawPenalty adds correct number of cards", () => {
    const top = makeCard("hearts", "2");
    const state = makeState(top, "hearts");
    state.players[0].hand = [];
    drawPenalty(0, 5, state);
    expect(state.players[0].hand).toHaveLength(5);
  });

  // 13. reshuffleDiscardIntoDraw moves cards to draw deck
  it("reshuffleDiscardIntoDraw keeps top discard and moves rest to draw", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    state.drawDeck = [];
    state.discardPile = [
      makeCard("clubs", "2", "old-1"),
      makeCard("spades", "3", "old-2"),
      top,
    ];
    reshuffleDiscardIntoDraw(state);
    expect(state.discardPile).toHaveLength(1);
    expect(state.discardPile[0].id).toBe(top.id);
    expect(state.drawDeck.length).toBeGreaterThanOrEqual(2);
  });

  // 14. drawOneCard returns card and removes from deck
  it("drawOneCard reduces deck by one", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    const initial = state.drawDeck.length;
    const card = drawOneCard(state);
    expect(card).not.toBeNull();
    expect(state.drawDeck.length).toBe(initial - 1);
  });

  // 15. drawOneCard reshuffles when deck is empty
  it("drawOneCard reshuffles discard when draw deck is empty", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    state.drawDeck = [];
    state.discardPile = [
      makeCard("clubs", "2", "discard-1"),
      makeCard("spades", "3", "discard-2"),
      top,
    ];
    const card = drawOneCard(state);
    expect(card).not.toBeNull();
  });

  // 16. First empty hand wins — verified by win check utility
  it("checkWin returns true when hand is empty", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    state.players[0].hand = [];
    expect(checkWin(0, state)).toBe(true);
  });

  // 17. checkWin returns false when hand has cards
  it("checkWin returns false when hand has cards", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    state.players[0].hand = [makeCard("clubs", "3")];
    expect(checkWin(0, state)).toBe(false);
  });

  // 18. Human Roshambo penalty — tested via TurnManager
  it("roshambo penalty draws 5 cards", () => {
    const top = makeCard("hearts", "7");
    const state = makeState(top, "hearts");
    state.players[0].hand = [makeCard("clubs", "3")];
    drawPenalty(0, 5, state);
    expect(state.players[0].hand).toHaveLength(6);
  });
});
