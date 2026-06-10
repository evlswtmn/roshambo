# Roshambo

A colorful, fast-paced shedding card game built with **Phaser 3 + TypeScript + Vite**. Play as the human at the bottom of the screen against cartoon NPC opponents around the table. Empty your hand first to win!

---

## Install

```bash
npm install
```

## Run dev server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser (portrait orientation recommended).

## Build for production

```bash
npm run build
```

Output goes to `dist/`.

## Run tests

```bash
npm run test
```

18 unit tests covering the core rules engine.

---

## Rules Summary

- **Objective:** Empty your hand before your opponents.
- **Two decks** (104 cards, no jokers) are shuffled together.
- **Starting hand:** 7 cards each.
- **Legal play:** Match the **active suit** or the **top discard rank**, or play an 8 (wild).

### Special Cards

| Card | Effect |
|------|--------|
| **2** | Draw-two challenge. Stacks with other 2s. Next player must respond with a 2 or draw the full stack. |
| **4** | Skip the next player. In 2-player mode, gives you another turn. |
| **K** (King) | Reverse direction. In 2-player mode, acts like a skip (another turn for you). |
| **8** | Wild — choose any active suit. Ends your turn. |

### Forced Draw

If you have no legal card, you draw from the deck until you find one, then **must** play it immediately.

### Combos

Playing multiple special cards in one continuous turn triggers combo banners:
- 2 specials → **COMBO!**
- 3 specials → **BIG COMBO!**
- 4+ specials → **ROSHAMBO RUSH!**

### One-Card Warning

When you're down to **1 card**, tap the **ROSHAMBO!** button before your turn ends.
Fail to call it? Draw 5 penalty cards.

### NPCs

- **Greg Bot** — aggressive, loves attack cards (2s, 4s)
- **Mabel Mayhem** — chaotic, prefers wilds
- **Card Shark Carl** — strategic, saves specials for key moments

---

## Known Limitations (Prototype)

- No sound effects or music yet.
- NPC arm/hand art is placeholder geometry.
- Card art is programmatically generated (no illustrated art).
- The "catch opponent for missing Roshambo" mechanic is not yet implemented.
- No pass-and-play or online multiplayer.
- No persistent scoring between rounds.
- High-card draw cards at game start are discarded from the deck (not returned).

---

## Future Improvements

- Sound effects and music tracks
- Original illustrated character art and card backs
- Online multiplayer (WebSockets / Colyseum)
- Pass-and-play local mode
- Difficulty levels (Easy / Hard / Expert NPCs)
- Cosmetic card back unlocks
- Mobile app packaging with Capacitor
- Optional ads / paid ad-free version
- More NPC personalities and dialogue
- Tutorial mode
- Catch-opponent Roshambo mechanic
- Round-based play with scoring
- Elimination mode (knocked-out players leave the table)
- Animated table and character idle animations
