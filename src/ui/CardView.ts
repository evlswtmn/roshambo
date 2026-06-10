import Phaser from "phaser";
import { Card, Suit, SUIT_SYMBOLS, SUIT_COLORS } from "../game/Card";

const CARD_W = 72;
const CARD_H = 100;
const RADIUS = 8;

export { CARD_W, CARD_H };

// Draws a single playing card as a Phaser Graphics + Text group.
// Returns a container.
export function createCardFaceGraphic(
  scene: Phaser.Scene,
  card: Card,
  playable = true
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);

  const gfx = scene.add.graphics();

  // Card background
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, RADIUS);

  // Border — glows for playable cards
  if (playable) {
    gfx.lineStyle(3, 0xffe000, 1);
  } else {
    gfx.lineStyle(2, 0xaaaaaa, 0.6);
  }
  gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, RADIUS);

  // Dim overlay for non-playable
  if (!playable) {
    gfx.fillStyle(0x000000, 0.35);
    gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, RADIUS);
  }

  container.add(gfx);

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  // Top-left rank + suit
  const tlText = scene.add
    .text(-CARD_W / 2 + 5, -CARD_H / 2 + 3, `${card.rank}\n${symbol}`, {
      fontSize: "13px",
      fontFamily: "Arial Black, Arial, sans-serif",
      color,
      align: "left",
      lineSpacing: -2,
    })
    .setOrigin(0, 0);

  // Center suit symbol
  const centerText = scene.add
    .text(0, 0, symbol, {
      fontSize: "28px",
      fontFamily: "Arial, sans-serif",
      color,
    })
    .setOrigin(0.5, 0.5);

  // Bottom-right rank + suit (rotated 180)
  const brText = scene.add
    .text(CARD_W / 2 - 5, CARD_H / 2 - 3, `${card.rank}\n${symbol}`, {
      fontSize: "13px",
      fontFamily: "Arial Black, Arial, sans-serif",
      color,
      align: "right",
      lineSpacing: -2,
    })
    .setOrigin(1, 1)
    .setAngle(180);

  container.add([tlText, centerText, brText]);

  // Playable glow effect using tween on alpha of a bright border overlay
  if (playable) {
    const glowGfx = scene.add.graphics();
    glowGfx.lineStyle(4, 0xffe000, 0.8);
    glowGfx.strokeRoundedRect(
      -CARD_W / 2 - 2,
      -CARD_H / 2 - 2,
      CARD_W + 4,
      CARD_H + 4,
      RADIUS + 2
    );
    container.add(glowGfx);
    scene.tweens.add({
      targets: glowGfx,
      alpha: { from: 0.3, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  return container;
}

// Card back graphic — colorful original design
export function createCardBackGraphic(
  scene: Phaser.Scene
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const gfx = scene.add.graphics();

  // Background
  gfx.fillStyle(0x1a0a5e, 1);
  gfx.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, RADIUS);

  // Border
  gfx.lineStyle(3, 0x9b59f7, 1);
  gfx.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, RADIUS);

  // Inner decorative pattern — diamond grid
  gfx.lineStyle(1, 0x6a35d0, 0.7);
  for (let y = -CARD_H / 2 + 10; y < CARD_H / 2 - 5; y += 12) {
    for (let x = -CARD_W / 2 + 8; x < CARD_W / 2 - 4; x += 14) {
      const offset = ((y + CARD_H / 2) / 12) % 2 === 0 ? 0 : 7;
      gfx.strokeRect(x + offset - 4, y - 4, 8, 8);
    }
  }

  // Center "R" logo
  const centerText = scene.add
    .text(0, 0, "R", {
      fontSize: "32px",
      fontFamily: "Arial Black, Arial, sans-serif",
      color: "#9b59f7",
      stroke: "#ffffff",
      strokeThickness: 1,
    })
    .setOrigin(0.5, 0.5);

  container.add([gfx, centerText]);
  return container;
}

// Suit icon helper for UI
export function suitColor(suit: Suit): number {
  return suit === "hearts" || suit === "diamonds" ? 0xe03030 : 0x1a1a2e;
}
