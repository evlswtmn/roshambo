import { Card, Suit, SUITS } from "./Card";
import { GameState, getCurrentPlayer, getNextPlayerIndex } from "./GameState";
import { getPlayableCards, isCardPlayable } from "./RulesEngine";
import { NPCPersonality } from "./Player";

export interface NPCDecision {
  card: Card;
  chosenSuit?: Suit;
}

// Choose the best suit when playing an 8
function chooseSuit(hand: Card[], state: GameState): Suit {
  const counts: Record<Suit, number> = {
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  };
  for (const c of hand) {
    if (c.rank !== "8") counts[c.suit]++;
  }
  let best: Suit = "hearts";
  let bestCount = -1;
  for (const suit of SUITS) {
    if (counts[suit] > bestCount) {
      bestCount = counts[suit];
      best = suit;
    }
  }
  return best;
}

// Core decision-making for an NPC
export function npcDecide(
  state: GameState,
  personality: NPCPersonality
): NPCDecision | null {
  const player = getCurrentPlayer(state);
  const hand = player.hand;
  const playable = getPlayableCards(hand, state);

  if (playable.length === 0) return null;

  const isTwoPlayer = state.players.length === 2;
  const nextIdx = getNextPlayerIndex(state);
  const nextPlayer = state.players[nextIdx];

  // 1. Handle pending draw stack
  if (state.pendingDraw > 0) {
    const twos = playable.filter(
      (c) => c.rank === "2" && state.cardsAtTurnStart.has(c.id)
    );
    if (twos.length > 0) return { card: twos[0] };
    return null; // draw penalty
  }

  // 2. Win immediately
  const winCard = playable.find((c) => hand.length === 1);
  if (winCard) {
    const suit = winCard.rank === "8" ? chooseSuit(hand, state) : undefined;
    return { card: winCard, chosenSuit: suit };
  }

  // Personality modifiers
  if (personality === "greg") {
    return gregDecide(playable, hand, state, isTwoPlayer, nextPlayer);
  }
  if (personality === "mabel") {
    return mabelDecide(playable, hand, state);
  }
  return carlDecide(playable, hand, state, isTwoPlayer, nextPlayer);
}

function gregDecide(
  playable: Card[],
  hand: Card[],
  state: GameState,
  isTwoPlayer: boolean,
  nextPlayer: { hand: Card[] }
): NPCDecision {
  // Greg: aggressive, loves attack cards (2s, 4s)
  // Prioritize 2s against low-hand players
  const twos = playable.filter((c) => c.rank === "2");
  if (twos.length > 0 && nextPlayer.hand.length <= 4) {
    return { card: twos[0] };
  }

  // Fours for skip opportunity
  const fours = playable.filter((c) => c.rank === "4");
  if (fours.length > 0) {
    if (isTwoPlayer) return { card: fours[0] }; // get extra turn
    if (nextPlayer.hand.length <= 3) return { card: fours[0] }; // skip dangerous player
  }

  // Kings for extra turn (2-player) or direction reversal
  const kings = playable.filter((c) => c.rank === "K");
  if (kings.length > 0 && isTwoPlayer) return { card: kings[0] };

  // Use 2 generally
  if (twos.length > 0) return { card: twos[0] };

  // Normal card preferred over 8 (save wilds)
  const normals = playable.filter(
    (c) => c.rank !== "8" && c.rank !== "K"
  );
  if (normals.length > 0) return { card: normals[0] };

  // 8 as last resort
  const eights = playable.filter((c) => c.rank === "8");
  if (eights.length > 0) {
    return { card: eights[0], chosenSuit: chooseSuit(hand, state) };
  }

  return { card: playable[0] };
}

function mabelDecide(
  playable: Card[],
  hand: Card[],
  state: GameState
): NPCDecision {
  // Mabel: chaotic, loves wilds first
  const eights = playable.filter((c) => c.rank === "8");
  if (eights.length > 0) {
    return { card: eights[0], chosenSuit: chooseSuit(hand, state) };
  }

  // Then kings (reverse chaos)
  const kings = playable.filter((c) => c.rank === "K");
  if (kings.length > 0) return { card: kings[0] };

  // Random from playable
  const idx = Math.floor(Math.random() * playable.length);
  const card = playable[idx];
  return {
    card,
    chosenSuit: card.rank === "8" ? chooseSuit(hand, state) : undefined,
  };
}

function carlDecide(
  playable: Card[],
  hand: Card[],
  state: GameState,
  isTwoPlayer: boolean,
  nextPlayer: { hand: Card[] }
): NPCDecision {
  // Carl: strategic, saves specials unless useful
  const normals = playable.filter(
    (c) => !["2", "4", "8", "K"].includes(c.rank)
  );
  if (normals.length > 0) return { card: normals[0] };

  // Use specials only when advantageous
  const twos = playable.filter((c) => c.rank === "2");
  if (twos.length > 0 && nextPlayer.hand.length <= 3) return { card: twos[0] };

  const fours = playable.filter((c) => c.rank === "4");
  if (fours.length > 0 && isTwoPlayer) return { card: fours[0] };

  const kings = playable.filter((c) => c.rank === "K");
  if (kings.length > 0 && isTwoPlayer) return { card: kings[0] };

  const eights = playable.filter((c) => c.rank === "8");
  if (eights.length > 0 && hand.length <= 3) {
    return { card: eights[0], chosenSuit: chooseSuit(hand, state) };
  }

  return { card: playable[0] };
}
