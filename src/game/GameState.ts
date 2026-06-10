import { Card, Suit } from "./Card";
import { Player } from "./Player";

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // 1=clockwise, -1=counter-clockwise
  drawDeck: Card[];
  discardPile: Card[];
  activeSuit: Suit;
  pendingDraw: number;
  // ID of the player currently in a continuous turn (for combos)
  continuousTurnPlayerId: string | null;
  // Count of special cards played by current player in this continuous turn
  specialCardsPlayedThisContinuousTurn: number;
  // Snapshot of hand at start of turn (IDs only) — used for draw-2 defense rule
  cardsAtTurnStart: Set<string>;
  gameOver: boolean;
  winnerId: string | null;
  // TODO: future round-based scoring would add scores/rounds here
}

export function createInitialGameState(players: Player[]): GameState {
  return {
    players,
    currentPlayerIndex: 0,
    direction: 1,
    drawDeck: [],
    discardPile: [],
    activeSuit: "hearts",
    pendingDraw: 0,
    continuousTurnPlayerId: null,
    specialCardsPlayedThisContinuousTurn: 0,
    cardsAtTurnStart: new Set(),
    gameOver: false,
    winnerId: null,
  };
}

export function getTopDiscard(state: GameState): Card | null {
  return state.discardPile.length > 0
    ? state.discardPile[state.discardPile.length - 1]
    : null;
}

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

export function getNextPlayerIndex(state: GameState): number {
  const n = state.players.length;
  return ((state.currentPlayerIndex + state.direction) % n + n) % n;
}

export function getPlayerAfterNext(state: GameState): number {
  const n = state.players.length;
  return ((state.currentPlayerIndex + state.direction * 2) % n + n) % n;
}
