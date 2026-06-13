import Phaser from "phaser";
import { Card } from "../game/Card";
import { createCardFaceGraphic, createCardBackGraphic, CARD_W, CARD_H } from "./CardView";

export interface HandViewOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  faceUp: boolean;
  maxWidth: number;
  cardTapCallback?: (card: Card, container: Phaser.GameObjects.Container) => void;
}

export class HandView {
  scene: Phaser.Scene;
  x: number;
  y: number;
  faceUp: boolean;
  maxWidth: number;
  private cardTapCallback?: (card: Card, container: Phaser.GameObjects.Container) => void;
  containers: Phaser.GameObjects.Container[] = [];
  cards: Card[] = [];
  playableIds: Set<string> = new Set();

  constructor(opts: HandViewOptions) {
    this.scene = opts.scene;
    this.x = opts.x;
    this.y = opts.y;
    this.faceUp = opts.faceUp;
    this.maxWidth = opts.maxWidth;
    this.cardTapCallback = opts.cardTapCallback;
  }

  update(cards: Card[], playableIds: Set<string>): void {
    this.cards = cards;
    this.playableIds = playableIds;
    this.destroyAll();
    this.renderCards();
  }

  private destroyAll(): void {
    for (const c of this.containers) c.destroy();
    this.containers = [];
  }

  private renderCards(): void {
    const n = this.cards.length;
    if (n === 0) return;

    const maxSpread = this.maxWidth;
    const spacing = Math.min(CARD_W + 6, (maxSpread - CARD_W) / Math.max(n - 1, 1));

    const totalWidth = (n - 1) * spacing + CARD_W;
    const startX = this.x - totalWidth / 2 + CARD_W / 2;

    for (let i = 0; i < n; i++) {
      const card = this.cards[i];
      const cx = startX + i * spacing;
      const cy = this.y;

      let container: Phaser.GameObjects.Container;
      if (this.faceUp) {
        const isPlayable = this.playableIds.has(card.id);
        container = createCardFaceGraphic(this.scene, card, isPlayable);
      } else {
        container = createCardBackGraphic(this.scene);
      }

      container.setPosition(cx, cy);
      container.setDepth(i);

      if (this.faceUp && this.playableIds.has(card.id) && this.cardTapCallback) {
        container.setSize(CARD_W, CARD_H);
        container.setInteractive({ cursor: "pointer" });
        const cb = this.cardTapCallback;
        container.on("pointerdown", () => cb(card, container));
        container.on("pointerover", () => {
          this.scene.tweens.add({
            targets: container,
            y: cy - 12,
            duration: 120,
            ease: "Quad.easeOut",
          });
        });
        container.on("pointerout", () => {
          this.scene.tweens.add({
            targets: container,
            y: cy,
            duration: 120,
            ease: "Quad.easeIn",
          });
        });
      } else if (this.faceUp && !this.playableIds.has(card.id)) {
        container.setAlpha(0.6);
      }

      this.containers.push(container);
    }
  }

  // Animate a specific card flying to a target position, then call onComplete
  animateCardTo(
    cardId: string,
    targetX: number,
    targetY: number,
    onComplete: () => void
  ): void {
    const idx = this.cards.findIndex((c) => c.id === cardId);
    if (idx < 0) { onComplete(); return; }
    const container = this.containers[idx];
    if (!container) { onComplete(); return; }

    container.setDepth(100);
    this.scene.tweens.add({
      targets: container,
      x: targetX,
      y: targetY,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 280,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 80,
          ease: "Quad.easeIn",
          onComplete: () => {
            container.destroy();
            onComplete();
          },
        });
      },
    });
  }

  getCardPosition(cardId: string): { x: number; y: number } | null {
    const idx = this.cards.findIndex((c) => c.id === cardId);
    if (idx < 0) return null;
    const container = this.containers[idx];
    return container ? { x: container.x, y: container.y } : null;
  }
}
