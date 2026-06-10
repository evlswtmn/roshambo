import { Card, RANKS, SUITS } from "./Card";

export function createDoubleDeck(): Card[] {
  const cards: Card[] = [];
  for (const deckNumber of [1, 2] as const) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${deckNumber}-${suit}-${rank}`,
          deckNumber,
          suit,
          rank,
        });
      }
    }
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
