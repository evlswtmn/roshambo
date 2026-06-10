import { Card, Suit, isSpecialCard, HIGH_CARD_VALUES } from "./Card";
import {
  GameState,
  getTopDiscard,
  getCurrentPlayer,
  getNextPlayerIndex,
} from "./GameState";
import {
  isCardPlayable,
  drawOneCard,
  drawPenalty,
  checkWin,
  reshuffleDiscardIntoDraw,
} from "./RulesEngine";
import { createDoubleDeck, shuffle } from "./Deck";
import {
  createHumanPlayer,
  createNPCPlayer,
  Player,
} from "./Player";
import { createInitialGameState } from "./GameState";

export type TurnEvent =
  | { type: "card_played"; playerId: string; card: Card; chosenSuit?: Suit }
  | { type: "cards_drawn"; playerId: string; cards: Card[]; reason: string }
  | { type: "turn_skipped"; playerId: string }
  | { type: "direction_reversed"; newDirection: 1 | -1 }
  | { type: "suit_changed"; suit: Suit }
  | { type: "pending_draw_updated"; amount: number }
  | { type: "combo"; playerId: string; count: number }
  | { type: "roshambo_called"; playerId: string }
  | { type: "roshambo_missed"; playerId: string }
  | { type: "win"; playerId: string }
  | { type: "turn_start"; playerId: string }
  | { type: "discard_reshuffled" };

export type TurnEventHandler = (event: TurnEvent) => void;

export class TurnManager {
  state: GameState;
  private listeners: TurnEventHandler[] = [];
  // Tracks whether human has called Roshambo during their current turn
  humanCalledRoshambo = false;

  constructor(playerCount: 2 | 3) {
    this.state = this.initGame(playerCount);
  }

  private initGame(playerCount: 2 | 3): GameState {
    const players: Player[] = [createHumanPlayer()];
    if (playerCount >= 2) {
      players.push(createNPCPlayer("Greg Bot", "greg", 1));
    }
    if (playerCount >= 3) {
      players.push(createNPCPlayer("Mabel Mayhem", "mabel", 2));
    }

    const state = createInitialGameState(players);

    // Create and shuffle two decks
    const deck = shuffle(createDoubleDeck());
    state.drawDeck = deck;

    // Deal 7 cards to each player
    for (let i = 0; i < 7; i++) {
      for (const player of state.players) {
        const card = state.drawDeck.pop();
        if (card) player.hand.push(card);
      }
    }

    // High-card draw to determine first player
    // Assumption: high-card draw cards are removed from the game for this prototype
    // TODO: future version could return them to deck
    state.currentPlayerIndex = this.highCardDraw(state);

    // Flip starting card
    let startCard = state.drawDeck.pop();
    // Keep flipping if we somehow got undefined (shouldn't happen)
    while (!startCard && state.drawDeck.length > 0) {
      startCard = state.drawDeck.pop();
    }
    if (!startCard) throw new Error("Deck empty before starting card");

    state.discardPile = [startCard];
    state.activeSuit = startCard.suit;

    // Apply starting card effects
    this.applyStartingCardEffect(state, startCard);

    return state;
  }

  private highCardDraw(state: GameState): number {
    // Each player draws one card from the top of the deck
    // Highest card wins; ties redraw until resolved
    // These cards are removed from game (prototype simplification)
    const drawnCards: (Card | undefined)[] = state.players.map(() =>
      state.drawDeck.pop()
    );

    const values = drawnCards.map((c) =>
      c ? HIGH_CARD_VALUES[c.rank] : 0
    );
    const max = Math.max(...values);
    const maxIndices = values
      .map((v, i) => (v === max ? i : -1))
      .filter((i) => i >= 0);

    if (maxIndices.length === 1) {
      return maxIndices[0];
    }

    // Tie: redraw among tied players recursively (simple iterative version)
    let tiedIndices = maxIndices;
    while (tiedIndices.length > 1) {
      const redraws = tiedIndices.map(() => state.drawDeck.pop());
      const reValues = redraws.map((c) =>
        c ? HIGH_CARD_VALUES[c.rank] : 0
      );
      const reMax = Math.max(...reValues);
      const reMaxIndices = reValues
        .map((v, i) => (v === reMax ? tiedIndices[i] : -1))
        .filter((i) => i >= 0);
      tiedIndices = reMaxIndices;
    }
    return tiedIndices[0];
  }

  private applyStartingCardEffect(state: GameState, card: Card): void {
    switch (card.rank) {
      case "2":
        state.pendingDraw = 2;
        break;
      case "4":
        // First player is skipped; advance turn
        state.currentPlayerIndex = getNextPlayerIndex(state);
        break;
      case "K":
        // Reverse direction before first turn
        state.direction = -1;
        // In 2-player mode this effectively skips to the same player
        // In 3-player it changes the first-turn order
        break;
      case "8":
        // Choose random active suit for starting 8
        state.activeSuit = (["hearts", "diamonds", "clubs", "spades"] as Suit[])[
          Math.floor(Math.random() * 4)
        ];
        break;
    }
  }

  on(handler: TurnEventHandler): void {
    this.listeners.push(handler);
  }

  private emit(event: TurnEvent): void {
    for (const h of this.listeners) h(event);
  }

  beginTurn(): void {
    const player = getCurrentPlayer(this.state);
    // Snapshot hand at turn start
    this.state.cardsAtTurnStart = new Set(player.hand.map((c) => c.id));
    this.humanCalledRoshambo = false;
    this.emit({ type: "turn_start", playerId: player.id });
  }

  // Called by the scene when human taps a card or when NPC plays
  playCard(card: Card, chosenSuit?: Suit): boolean {
    const state = this.state;
    const player = getCurrentPlayer(state);

    if (!isCardPlayable(card, state)) return false;

    // Remove from hand
    const idx = player.hand.findIndex((c) => c.id === card.id);
    if (idx < 0) return false;
    player.hand.splice(idx, 1);

    // Add to discard
    state.discardPile.push(card);

    // Update active suit
    if (card.rank === "8") {
      state.activeSuit = chosenSuit ?? state.activeSuit;
    } else {
      state.activeSuit = card.suit;
    }

    this.emit({ type: "card_played", playerId: player.id, card, chosenSuit });

    // Track combo
    if (isSpecialCard(card.rank)) {
      if (state.continuousTurnPlayerId !== player.id) {
        state.continuousTurnPlayerId = player.id;
        state.specialCardsPlayedThisContinuousTurn = 0;
      }
      state.specialCardsPlayedThisContinuousTurn++;
      if (state.specialCardsPlayedThisContinuousTurn >= 2) {
        this.emit({
          type: "combo",
          playerId: player.id,
          count: state.specialCardsPlayedThisContinuousTurn,
        });
      }
    }

    // Check win
    if (checkWin(state.currentPlayerIndex, state)) {
      state.gameOver = true;
      state.winnerId = player.id;
      this.emit({ type: "win", playerId: player.id });
      return true;
    }

    // Resolve card effect
    this.resolveCardEffect(card, chosenSuit);
    return true;
  }

  private resolveCardEffect(card: Card, chosenSuit?: Suit): void {
    const state = this.state;
    const playerCount = state.players.length;
    const isTwoPlayer = playerCount === 2;

    switch (card.rank) {
      case "2":
        state.pendingDraw += 2;
        this.emit({ type: "pending_draw_updated", amount: state.pendingDraw });
        // Pass challenge to next player — turn ends
        this.advanceTurn();
        break;

      case "4":
        if (isTwoPlayer) {
          // Same player continues — another play opportunity
          // Don't advance turn; scene will call beginTurn again for next play
          this.emit({ type: "turn_skipped", playerId: state.players[getNextPlayerIndex(state)].id });
        } else {
          // Skip next player, give turn to the one after
          const skippedIdx = getNextPlayerIndex(state);
          this.emit({ type: "turn_skipped", playerId: state.players[skippedIdx].id });
          state.currentPlayerIndex = skippedIdx;
          this.advanceTurn();
        }
        break;

      case "K":
        state.direction = state.direction === 1 ? -1 : 1;
        this.emit({ type: "direction_reversed", newDirection: state.direction });
        if (isTwoPlayer) {
          // In 2-player, reverse = skip = same player continues
          // Don't advance
        } else {
          this.advanceTurn();
        }
        break;

      case "8":
        this.emit({ type: "suit_changed", suit: chosenSuit ?? state.activeSuit });
        // 8 ends turn
        this.advanceTurn();
        break;

      default:
        // Normal card ends turn
        this.advanceTurn();
        break;
    }
  }

  private advanceTurn(): void {
    const state = this.state;
    const n = state.players.length;
    state.currentPlayerIndex =
      ((state.currentPlayerIndex + state.direction) % n + n) % n;
    // Reset combo tracking when turn truly passes to a new player
    if (state.continuousTurnPlayerId !== getCurrentPlayer(state).id) {
      state.continuousTurnPlayerId = null;
      state.specialCardsPlayedThisContinuousTurn = 0;
    }
  }

  // Called when the current player has no response to pending draw or no legal card.
  // Returns cards drawn.
  handleForcedDraw(): Card[] {
    const state = this.state;
    const playerIdx = state.currentPlayerIndex;

    if (state.pendingDraw > 0) {
      // Draw penalty
      const drawn = drawPenalty(playerIdx, state.pendingDraw, state);
      this.emit({
        type: "cards_drawn",
        playerId: getCurrentPlayer(state).id,
        cards: drawn,
        reason: `pending draw ${state.pendingDraw}`,
      });
      state.pendingDraw = 0;
      this.emit({ type: "pending_draw_updated", amount: 0 });
      this.advanceTurn();
      return drawn;
    }

    // Draw until playable
    const drawnCards: Card[] = [];
    const player = state.players[playerIdx];
    let playableCard: Card | null = null;

    for (let attempts = 0; attempts < 200; attempts++) {
      if (state.drawDeck.length === 0) {
        reshuffleDiscardIntoDraw(state);
        this.emit({ type: "discard_reshuffled" });
        if (state.drawDeck.length === 0) break;
      }
      const card = state.drawDeck.pop()!;
      player.hand.push(card);
      drawnCards.push(card);
      if (isCardPlayable(card, state)) {
        playableCard = card;
        break;
      }
    }

    if (drawnCards.length > 0) {
      this.emit({
        type: "cards_drawn",
        playerId: player.id,
        cards: drawnCards,
        reason: "draw until playable",
      });
    }

    // Auto-play the drawn playable card
    if (playableCard) {
      this.playCard(playableCard);
    }

    return drawnCards;
  }

  // Handles Roshambo button call by human
  callRoshambo(): void {
    const player = getCurrentPlayer(this.state);
    this.humanCalledRoshambo = true;
    player.calledRoshambo = true;
    this.emit({ type: "roshambo_called", playerId: player.id });
  }

  // Check and penalise if human forgot to call Roshambo
  checkRoshamboPenalty(): void {
    const state = this.state;
    const player = getCurrentPlayer(state);
    if (
      player.type === "human" &&
      player.hand.length === 1 &&
      !this.humanCalledRoshambo &&
      !player.calledRoshambo
    ) {
      drawPenalty(state.currentPlayerIndex, 5, state);
      this.emit({ type: "roshambo_missed", playerId: player.id });
    }
    // Reset for next turn
    player.calledRoshambo = false;
  }

  // NPCs auto-call roshambo
  npcAutoCallRoshambo(): void {
    const player = getCurrentPlayer(this.state);
    if (player.type === "npc" && player.hand.length === 1) {
      player.calledRoshambo = true;
      this.emit({ type: "roshambo_called", playerId: player.id });
    }
  }
}
