import Phaser from "phaser";
import { Suit, SUITS, SUIT_SYMBOLS, SUIT_COLORS } from "../game/Card";

export class SuitPicker {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(currentSuit: Suit, onChoose: (suit: Suit) => void): void {
    this.destroy();

    const { width, height } = this.scene.scale;

    // Backdrop
    const backdrop = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setInteractive();

    const title = this.scene.add
      .text(width / 2, height / 2 - 130, "Choose Active Suit", {
        fontSize: "22px",
        fontFamily: "Arial Black, Arial, sans-serif",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5);

    const buttons: Phaser.GameObjects.Container[] = [];

    const allOptions: Array<{ suit: Suit | null; label: string }> = [
      ...SUITS.map((s) => ({ suit: s as Suit, label: SUIT_SYMBOLS[s] })),
      { suit: null, label: "Keep" },
    ];

    allOptions.forEach((opt, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bx = width / 2 + (col - 1) * 90;
      const by = height / 2 - 50 + row * 100;

      const bg = this.scene.add.graphics();
      const isKeep = opt.suit === null;
      const colorHex = isKeep
        ? 0x334455
        : opt.suit === "hearts" || opt.suit === "diamonds"
        ? 0xb01010
        : 0x111133;
      bg.fillStyle(colorHex, 1);
      bg.fillRoundedRect(-40, -38, 80, 76, 12);
      bg.lineStyle(3, 0xffffff, 0.8);
      bg.strokeRoundedRect(-40, -38, 80, 76, 12);

      const label = this.scene.add
        .text(0, isKeep ? 0 : -5, opt.label, {
          fontSize: isKeep ? "14px" : "34px",
          fontFamily: "Arial, sans-serif",
          color: "#ffffff",
        })
        .setOrigin(0.5, 0.5);

      let suitLabel: Phaser.GameObjects.Text | null = null;
      if (!isKeep && opt.suit) {
        suitLabel = this.scene.add
          .text(0, 26, opt.suit.toUpperCase(), {
            fontSize: "10px",
            fontFamily: "Arial, sans-serif",
            color: "#ffffff",
          })
          .setOrigin(0.5, 0.5)
          .setAlpha(0.9);
      }

      const items: Phaser.GameObjects.GameObject[] = [bg, label];
      if (suitLabel) items.push(suitLabel);

      const btn = this.scene.add.container(bx, by, items);
      btn.setSize(80, 76);
      btn.setInteractive({ cursor: "pointer" });

      const chosenSuit = opt.suit ?? currentSuit;
      btn.on("pointerdown", () => {
        this.destroy();
        onChoose(chosenSuit);
      });
      btn.on("pointerover", () => btn.setScale(1.08));
      btn.on("pointerout", () => btn.setScale(1));

      buttons.push(btn);
    });

    this.container = this.scene.add.container(0, 0, [
      backdrop,
      title,
      ...buttons,
    ]);
    this.container.setDepth(500);

    // Animate in
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 150,
    });
  }

  destroy(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
