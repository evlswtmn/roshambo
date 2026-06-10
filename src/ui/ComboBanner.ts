import Phaser from "phaser";

const MESSAGES: Record<number, string> = {
  2: "COMBO!",
  3: "BIG COMBO!",
};

function getMessage(count: number): string {
  if (count >= 4) return "ROSHAMBO RUSH!";
  return MESSAGES[count] ?? "COMBO!";
}

const COLORS: Record<number, number> = {
  2: 0xffe000,
  3: 0xff6600,
};
function getColor(count: number): number {
  if (count >= 4) return 0xff0099;
  return COLORS[count] ?? 0xffe000;
}

export class ComboBanner {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(count: number): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    const { width, height } = this.scene.scale;
    const msg = getMessage(count);
    const color = getColor(count);

    const text = this.scene.add
      .text(0, 0, msg, {
        fontSize: count >= 4 ? "42px" : count >= 3 ? "36px" : "30px",
        fontFamily: "Arial Black, Arial, sans-serif",
        color: `#${color.toString(16).padStart(6, "0")}`,
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5);

    this.container = this.scene.add.container(width / 2, height / 2 - 40, [text]);
    this.container.setDepth(200);
    this.container.setScale(0.1);
    this.container.setAlpha(0);

    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 220,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.container,
          y: height / 2 - 80,
          alpha: 0,
          duration: 800,
          delay: 900,
          ease: "Quad.easeIn",
          onComplete: () => {
            this.container?.destroy();
            this.container = null;
          },
        });
      },
    });
  }
}
