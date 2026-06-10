import Phaser from "phaser";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    const { width, height } = this.scale;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a0a5e, 0x1a0a5e, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative card suits floating in background
    const suits = ["♥", "♦", "♣", "♠"];
    const colors = [0xe03030, 0xe03030, 0x6666aa, 0x6666aa];
    for (let i = 0; i < 12; i++) {
      const si = Math.floor(Math.random() * 4);
      const t = this.add
        .text(
          Math.random() * width,
          Math.random() * height,
          suits[si],
          {
            fontSize: `${24 + Math.floor(Math.random() * 32)}px`,
            fontFamily: "Arial, sans-serif",
            color: `#${colors[si].toString(16).padStart(6, "0")}`,
          }
        )
        .setOrigin(0.5, 0.5)
        .setAlpha(0.15);
      this.tweens.add({
        targets: t,
        y: t.y - 60 - Math.random() * 60,
        alpha: 0,
        duration: 3000 + Math.random() * 4000,
        delay: Math.random() * 3000,
        repeat: -1,
        repeatDelay: Math.random() * 2000,
        ease: "Sine.easeInOut",
        onRepeat: () => {
          t.setPosition(Math.random() * width, height + 20);
        },
      });
    }

    // Title
    const titleShadow = this.add
      .text(width / 2 + 4, 160 + 4, "ROSHAMBO", {
        fontSize: "64px",
        fontFamily: "Arial Black, Arial, sans-serif",
        color: "#000000",
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.5);

    const title = this.add
      .text(width / 2, 160, "ROSHAMBO", {
        fontSize: "64px",
        fontFamily: "Arial Black, Arial, sans-serif",
        color: "#ffe000",
        stroke: "#ff6600",
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5);

    // Bounce title
    this.tweens.add({
      targets: [title, titleShadow],
      y: "-=8",
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const subtitle = this.add
      .text(width / 2, 225, "The Card Shedding Game", {
        fontSize: "18px",
        fontFamily: "Arial, sans-serif",
        color: "#aaaadd",
      })
      .setOrigin(0.5, 0.5);

    // Buttons
    this.makeButton(width / 2, 340, "2 PLAYERS", 0x1a6e2e, () => {
      this.scene.start("GameScene", { playerCount: 2 });
    });

    this.makeButton(width / 2, 430, "3 PLAYERS", 0x1a3e7e, () => {
      this.scene.start("GameScene", { playerCount: 3 });
    });

    this.makeButton(
      width / 2,
      520,
      "RULES",
      0x3e1a7e,
      () => this.showRules(),
      true
    );

    // Version tag
    this.add
      .text(width / 2, height - 20, "v0.1 Prototype", {
        fontSize: "12px",
        fontFamily: "Arial, sans-serif",
        color: "#555577",
      })
      .setOrigin(0.5, 1);
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    cb: () => void,
    small = false
  ): void {
    const bw = small ? 180 : 240;
    const bh = small ? 48 : 64;

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 14);
    bg.lineStyle(3, 0xffffff, 0.5);
    bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 14);

    const text = this.add
      .text(x, y, label, {
        fontSize: small ? "16px" : "22px",
        fontFamily: "Arial Black, Arial, sans-serif",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5);

    const zone = this.add
      .zone(x, y, bw, bh)
      .setOrigin(0.5, 0.5)
      .setInteractive({ cursor: "pointer" });

    zone.on("pointerover", () => {
      this.tweens.add({ targets: [bg, text], scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    zone.on("pointerout", () => {
      this.tweens.add({ targets: [bg, text], scaleX: 1, scaleY: 1, duration: 100 });
    });
    zone.on("pointerdown", cb);
  }

  private showRules(): void {
    const { width, height } = this.scale;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.88);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(400);
    overlay.setInteractive();

    const rules = [
      "ROSHAMBO RULES",
      "",
      "Be the first to empty your hand!",
      "",
      "♥♦♣♠  Match suit or rank to play.",
      "8      Wild — choose any active suit.",
      "2      Draw 2 for the next player (stackable).",
      "4      Skip the next player.",
      "K      Reverse turn direction.",
      "",
      "ROSHAMBO — Call it when you have 1 card!",
      "Forget? Draw 5 penalty.",
      "",
      "Tap anywhere to close.",
    ].join("\n");

    const text = this.add
      .text(width / 2, height / 2, rules, {
        fontSize: "15px",
        fontFamily: "Arial, sans-serif",
        color: "#ffffff",
        align: "center",
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(401);

    overlay.on("pointerdown", () => {
      overlay.destroy();
      text.destroy();
    });
  }
}
