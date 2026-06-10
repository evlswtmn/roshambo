import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    // No external assets to load — all graphics are generated in code
  }

  create(): void {
    this.scene.start("MainMenuScene");
  }
}
