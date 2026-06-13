import Phaser from "phaser";

export class ToastMessage {
  private scene: Phaser.Scene;
  private queue: string[] = [];
  private active = false;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(message: string, color = "#ffffff", duration = 1800): void {
    const { width, height } = this.scene.scale;
    if (this.container) this.container.destroy();

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    const textObj = this.scene.add
      .text(0, 0, message, {
        fontSize: "18px",
        fontFamily: "Arial Black, Arial, sans-serif",
        color,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5);

    const pad = 16;
    const w = textObj.width + pad * 2;
    const h = textObj.height + pad;
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);

    this.container = this.scene.add.container(width / 2, height - 180, [
      bg,
      textObj,
    ]);
    this.container.setDepth(300);
    this.container.setAlpha(0);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: height - 200,
      duration: 200,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.container,
          alpha: 0,
          delay: duration,
          duration: 300,
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
