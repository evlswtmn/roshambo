import Phaser from "phaser";

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super("VictoryScene");
  }

  create(data: { winnerName: string; playerCount: number }): void {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1a0a, 0x0a1a0a, 0x0a3a0a, 0x0a3a0a, 1);
    bg.fillRect(0, 0, width, height);

    // Confetti-style particles
    for (let i = 0; i < 60; i++) {
      const colors = [0xffe000, 0xff6600, 0xff0099, 0x00ddff, 0x00ff88];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particle = this.add.graphics();
      particle.fillStyle(color, 1);
      particle.fillRect(0, 0, 8 + Math.random() * 8, 6 + Math.random() * 6);
      particle.setPosition(Math.random() * width, -20);

      this.tweens.add({
        targets: particle,
        x: `+=${(Math.random() - 0.5) * 200}`,
        y: height + 40,
        angle: Math.random() * 720 - 360,
        alpha: { from: 1, to: 0 },
        duration: 2000 + Math.random() * 2000,
        delay: Math.random() * 1500,
        ease: "Quad.easeIn",
        repeat: -1,
        onRepeat: (tween: Phaser.Tweens.Tween) => {
          particle.setPosition(Math.random() * width, -20);
          particle.setAlpha(1);
        },
      });
    }

    // Winner text
    const isHuman = data.winnerName === "You";
    const headline = isHuman ? "YOU WIN!" : `${data.winnerName} WINS!`;

    this.add
      .text(width / 2, height / 2 - 120, headline, {
        fontSize: "54px",
        fontFamily: "Arial Black, Arial, sans-serif",
        color: "#ffe000",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5, 0.5);

    const subtitle = isHuman
      ? "🃏 Roshambo Champion! 🃏"
      : "Better luck next time!";
    this.add
      .text(width / 2, height / 2 - 50, subtitle, {
        fontSize: "22px",
        fontFamily: "Arial, sans-serif",
        color: "#aaffaa",
      })
      .setOrigin(0.5, 0.5);

    // Buttons
    this.makeButton(width / 2, height / 2 + 60, "PLAY AGAIN", 0x1a6e2e, () => {
      this.scene.start("GameScene", { playerCount: data.playerCount });
    });

    this.makeButton(width / 2, height / 2 + 150, "MAIN MENU", 0x1a1a5e, () => {
      this.scene.start("MainMenuScene");
    });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    cb: () => void
  ): void {
    const bw = 220;
    const bh = 60;

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 14);
    bg.lineStyle(3, 0xffffff, 0.5);
    bg.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 14);

    const text = this.add
      .text(x, y, label, {
        fontSize: "22px",
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
}
