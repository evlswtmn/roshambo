import Phaser from "phaser";
import { TurnManager, TurnEvent } from "../game/TurnManager";
import { npcDecide } from "../game/NPCBrain";
import { getPlayableCards } from "../game/RulesEngine";
import { getCurrentPlayer } from "../game/GameState";
import { Card, SUIT_SYMBOLS, SUIT_COLORS, Suit } from "../game/Card";
import { HandView } from "../ui/HandView";
import { ComboBanner } from "../ui/ComboBanner";
import { SuitPicker } from "../ui/SuitPicker";
import { ToastMessage } from "../ui/ToastMessage";
import {
  createCardFaceGraphic,
  createCardBackGraphic,
  CARD_H,
} from "../ui/CardView";

const NPC_THINK_DELAY = 700;  // ms before NPC plays
const AFTER_PLAY_DELAY = 350; // ms after NPC play before next turn begins

export class GameScene extends Phaser.Scene {
  private tm!: TurnManager;
  private playerCount!: 2 | 3;

  private handViews: HandView[] = [];

  private discardContainer!: Phaser.GameObjects.Container;
  private drawDeckContainer!: Phaser.GameObjects.Container;
  private activeSuitText!: Phaser.GameObjects.Text;
  private directionText!: Phaser.GameObjects.Text;
  private pendingDrawText!: Phaser.GameObjects.Text;
  private currentPlayerText!: Phaser.GameObjects.Text;
  private handCountTexts: Phaser.GameObjects.Text[] = [];

  private comboBanner!: ComboBanner;
  private suitPicker!: SuitPicker;
  private toast!: ToastMessage;
  private roshamboBtn?: Phaser.GameObjects.Container;

  // Lock to prevent concurrent actions
  private busy = false;

  constructor() {
    super("GameScene");
  }

  init(data: { playerCount: 2 | 3 }): void {
    this.playerCount = data.playerCount ?? 2;
    this.busy = false;
  }

  create(): void {
    this.busy = false;
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a2a0a, 0x0a2a0a, 0x0a4a1a, 0x0a4a1a, 1);
    bg.fillRect(0, 0, width, height);

    const felt = this.add.graphics();
    felt.fillStyle(0x0d5c1e, 0.7);
    felt.fillCircle(width / 2, height / 2, Math.min(width, height) * 0.44);
    felt.lineStyle(6, 0x1a8a30, 0.5);
    felt.strokeCircle(width / 2, height / 2, Math.min(width, height) * 0.44);

    this.tm = new TurnManager(this.playerCount);
    this.tm.on((e) => this.onTurnEvent(e));

    this.comboBanner = new ComboBanner(this);
    this.suitPicker = new SuitPicker(this);
    this.toast = new ToastMessage(this);

    this.createCenterUI();
    this.createHandViews();
    this.createNPCArms();

    this.playDealAnimation(() => this.startCurrentTurn());
  }

  // ─── CENTER UI ────────────────────────────────────────────────────────────────

  private createCenterUI(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    this.drawDeckContainer = this.add.container(cx - 55, cy);
    this.discardContainer = this.add.container(cx + 55, cy);
    this.renderDrawDeck();
    this.renderDiscard();

    const panelY = cy - 118;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x000000, 0.55);
    panelBg.fillRoundedRect(cx - 112, panelY - 38, 224, 112, 10);

    this.activeSuitText = this.add.text(cx, panelY - 22, "", {
      fontSize: "14px", fontFamily: "Arial, sans-serif", color: "#ffffff",
    }).setOrigin(0.5, 0.5);

    this.directionText = this.add.text(cx, panelY + 2, "", {
      fontSize: "14px", fontFamily: "Arial, sans-serif", color: "#aaddff",
    }).setOrigin(0.5, 0.5);

    this.pendingDrawText = this.add.text(cx, panelY + 28, "", {
      fontSize: "16px", fontFamily: "Arial Black, Arial, sans-serif", color: "#ff6666",
    }).setOrigin(0.5, 0.5);

    this.currentPlayerText = this.add.text(cx, panelY + 54, "", {
      fontSize: "14px", fontFamily: "Arial, sans-serif", color: "#ffe000",
    }).setOrigin(0.5, 0.5);

    this.updateStatusPanel();
  }

  private renderDrawDeck(): void {
    this.drawDeckContainer.removeAll(true);
    const back = createCardBackGraphic(this);
    back.setScale(0.9);
    this.drawDeckContainer.add(back);
    const countText = this.add.text(0, CARD_H / 2 + 10, `${this.tm.state.drawDeck.length}`, {
      fontSize: "12px", fontFamily: "Arial, sans-serif", color: "#cccccc",
    }).setOrigin(0.5, 0);
    this.drawDeckContainer.add(countText);
  }

  private renderDiscard(): void {
    this.discardContainer.removeAll(true);
    const pile = this.tm.state.discardPile;
    if (pile.length === 0) return;
    const top = pile[pile.length - 1];
    const card = createCardFaceGraphic(this, top, false);
    card.setScale(0.9);
    this.discardContainer.add(card);
  }

  private updateStatusPanel(): void {
    const state = this.tm.state;
    const suit = state.activeSuit;
    const symbol = SUIT_SYMBOLS[suit];
    const colorHex = SUIT_COLORS[suit];
    this.activeSuitText.setText(`Active Suit: ${symbol} ${suit.toUpperCase()}`);
    this.activeSuitText.setColor(colorHex === "#e03030" ? "#ff6666" : "#aaaaff");
    this.directionText.setText(`Direction: ${state.direction === 1 ? "Clockwise ↻" : "Counter ↺"}`);
    this.pendingDrawText.setText(state.pendingDraw > 0 ? `Draw Stack: +${state.pendingDraw}` : "");
    const cp = getCurrentPlayer(state);
    this.currentPlayerText.setText(`Turn: ${cp.name}`);
  }

  // ─── HAND VIEWS ───────────────────────────────────────────────────────────────

  private createHandViews(): void {
    const { width, height } = this.scale;

    this.handViews[0] = new HandView({
      scene: this, x: width / 2, y: height - 80,
      faceUp: true, maxWidth: width - 40,
      cardTapCallback: (card) => this.onHumanCardTap(card),
    });

    this.handViews[1] = new HandView({
      scene: this, x: width / 2, y: 80,
      faceUp: false, maxWidth: width - 80,
    });

    if (this.playerCount === 3) {
      this.handViews[2] = new HandView({
        scene: this, x: width - 55, y: height / 2 - 60,
        faceUp: false, maxWidth: 120,
      });
    }

    const players = this.tm.state.players;
    const labelPos = [
      { x: width / 2, y: height - 145 },
      { x: width / 2, y: 145 },
      { x: width - 55, y: height / 2 - 130 },
    ];

    for (let i = 0; i < players.length; i++) {
      const pos = labelPos[i];
      this.add.text(pos.x, pos.y - 16, players[i].name, {
        fontSize: "14px", fontFamily: "Arial Black, Arial, sans-serif",
        color: players[i].type === "human" ? "#ffe000" : "#ffffff",
        stroke: "#000000", strokeThickness: 3,
      }).setOrigin(0.5, 0.5);

      this.handCountTexts[i] = this.add.text(pos.x, pos.y, "Cards: 0", {
        fontSize: "12px", fontFamily: "Arial, sans-serif", color: "#cccccc",
      }).setOrigin(0.5, 0.5);
    }

    this.refreshAllHands(false);
  }

  private createNPCArms(): void {
    const { width, height } = this.scale;
    this.drawArm(width / 2 - 80, 62, -15);
    this.drawArm(width / 2 + 80, 62, 15);
    if (this.playerCount === 3) {
      this.drawArm(width - 30, height / 2 - 80, -30);
      this.drawArm(width - 30, height / 2 - 40, 10);
    }
  }

  private drawArm(x: number, y: number, angle: number): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x334488, 1);
    gfx.fillRoundedRect(-12, -30, 24, 40, 8);
    gfx.fillStyle(0xf0c080, 1);
    gfx.fillCircle(0, 16, 14);
    gfx.setPosition(x, y).setAngle(angle).setDepth(2);
  }

  private refreshAllHands(highlightHuman = true): void {
    const state = this.tm.state;
    const isHumanTurn = state.players[state.currentPlayerIndex].type === "human";
    const playable = highlightHuman && isHumanTurn
      ? getPlayableCards(state.players[0].hand, state)
      : [];
    const playableIds = new Set(playable.map((c) => c.id));

    for (let i = 0; i < state.players.length; i++) {
      if (!this.handViews[i]) continue;
      const ids = i === 0 ? playableIds : new Set<string>();
      this.handViews[i].update(state.players[i].hand, ids);
      if (this.handCountTexts[i]) {
        this.handCountTexts[i].setText(`Cards: ${state.players[i].hand.length}`);
      }
    }
  }

  // ─── DEAL ANIMATION ───────────────────────────────────────────────────────────

  private playDealAnimation(onComplete: () => void): void {
    const { width, height } = this.scale;
    const state = this.tm.state;
    const positions = [
      { x: width / 2, y: height - 80 },
      { x: width / 2, y: 80 },
      { x: width - 55, y: height / 2 - 60 },
    ];

    let delay = 0;
    for (let ci = 0; ci < 7; ci++) {
      for (let pi = 0; pi < state.players.length; pi++) {
        const pos = positions[pi];
        this.time.delayedCall(delay, () => {
          const flash = createCardBackGraphic(this);
          flash.setPosition(width / 2, height / 2).setScale(0.3).setAlpha(0).setDepth(50);
          this.tweens.add({
            targets: flash,
            x: pos.x + (Math.random() - 0.5) * 20,
            y: pos.y + (Math.random() - 0.5) * 10,
            scale: 0.9, alpha: 1, duration: 180, ease: "Quad.easeOut",
            onComplete: () => flash.destroy(),
          });
        });
        delay += 55;
      }
    }
    this.time.delayedCall(delay + 200, onComplete);
  }

  // ─── TURN FLOW ────────────────────────────────────────────────────────────────

  private startCurrentTurn(): void {
    if (this.tm.state.gameOver) return;
    this.busy = false;

    this.tm.beginTurn();
    this.updateStatusPanel();
    this.renderDiscard();
    this.renderDrawDeck();
    this.refreshAllHands(true);
    this.updateRoshamboButton();

    const player = getCurrentPlayer(this.tm.state);
    if (player.type === "npc") {
      this.busy = true;
      this.time.delayedCall(NPC_THINK_DELAY, () => this.runNPCAction());
    }
  }

  // Runs one NPC action then schedules the appropriate follow-up.
  private runNPCAction(): void {
    if (this.tm.state.gameOver) return;
    const state = this.tm.state;
    const player = getCurrentPlayer(state);
    if (player.type !== "npc") { this.busy = false; return; }

    this.tm.npcAutoCallRoshambo();

    const decision = npcDecide(state, player.personality ?? "greg");

    if (!decision) {
      // Forced penalty draw
      const drawn = this.tm.handleForcedDraw();
      this.toast.show(
        `${player.name} draws ${drawn.length} card${drawn.length !== 1 ? "s" : ""}`,
        "#ffaaaa"
      );
      this.renderDrawDeck();
      this.refreshAllHands(false);
      if (!state.gameOver) {
        this.time.delayedCall(AFTER_PLAY_DELAY, () => this.startCurrentTurn());
      }
      return;
    }

    // Capture current player index before playing (playCard may advance turn)
    const prevPlayerIdx = state.currentPlayerIndex;
    const prevPlayerId = player.id;

    // Animate the card flying from NPC hand to discard
    const handView = this.handViews[prevPlayerIdx];
    const cardPos = handView?.getCardPosition(decision.card.id) ?? {
      x: this.scale.width / 2, y: prevPlayerIdx === 1 ? 80 : this.scale.height / 2 - 60,
    };

    const animCard = createCardBackGraphic(this);
    animCard.setPosition(cardPos.x, cardPos.y).setDepth(100);

    this.tweens.add({
      targets: animCard,
      x: this.discardContainer.x, y: this.discardContainer.y,
      duration: 260, ease: "Quad.easeOut",
      onComplete: () => {
        animCard.destroy();

        // Play the card in the rules engine
        const played = this.tm.playCard(decision.card, decision.chosenSuit);
        if (!played) {
          this.busy = false;
          return;
        }

        this.updateStatusPanel();
        this.renderDiscard();
        this.renderDrawDeck();
        this.refreshAllHands(false);

        if (state.gameOver) return;

        // Determine if the same player continues or if turn passed
        const newPlayer = getCurrentPlayer(state);
        if (newPlayer.id === prevPlayerId) {
          // Same player (4 or K in 2-player) — continue with another action
          this.time.delayedCall(NPC_THINK_DELAY, () => this.runNPCAction());
        } else {
          // Turn passed to a new player
          this.time.delayedCall(AFTER_PLAY_DELAY, () => this.startCurrentTurn());
        }
      },
    });
  }

  // ─── HUMAN INTERACTION ────────────────────────────────────────────────────────

  private onHumanCardTap(card: Card): void {
    if (this.busy) return;
    const state = this.tm.state;
    const player = getCurrentPlayer(state);
    if (player.type !== "human") return;

    if (card.rank === "8") {
      this.busy = true;
      this.suitPicker.show(state.activeSuit, (suit: Suit) => {
        this.animateHumanPlay(card, suit);
      });
      return;
    }

    this.busy = true;
    this.animateHumanPlay(card);
  }

  private animateHumanPlay(card: Card, chosenSuit?: Suit): void {
    const state = this.tm.state;
    const prevPlayerId = getCurrentPlayer(state).id;

    // Check Roshambo penalty if player had exactly 1 card at turn start and didn't call
    if (
      state.players[0].hand.length === 1 &&
      !this.tm.humanCalledRoshambo &&
      state.currentPlayerIndex === 0
    ) {
      this.tm.checkRoshamboPenalty();
      this.refreshAllHands(false);
    }

    const handView = this.handViews[0];
    const cardPos = handView?.getCardPosition(card.id) ?? {
      x: this.scale.width / 2, y: this.scale.height - 80,
    };

    const animCard = createCardFaceGraphic(this, card, true);
    animCard.setPosition(cardPos.x, cardPos.y).setDepth(100);
    this.add.existing(animCard);

    this.tweens.add({
      targets: animCard,
      x: this.discardContainer.x, y: this.discardContainer.y,
      duration: 260, ease: "Quad.easeOut",
      onComplete: () => {
        animCard.destroy();

        const played = this.tm.playCard(card, chosenSuit);
        if (!played) { this.busy = false; return; }

        this.updateStatusPanel();
        this.renderDiscard();
        this.renderDrawDeck();
        this.refreshAllHands(false);

        if (state.gameOver) return;

        const newPlayer = getCurrentPlayer(state);
        if (newPlayer.id === prevPlayerId) {
          // Same player continues (4/K in 2-player)
          this.busy = false;
          this.refreshAllHands(true);
          this.updateRoshamboButton();
        } else {
          // Turn passed
          this.time.delayedCall(AFTER_PLAY_DELAY, () => this.startCurrentTurn());
        }
      },
    });
  }

  // ─── ROSHAMBO BUTTON ─────────────────────────────────────────────────────────

  private updateRoshamboButton(): void {
    this.roshamboBtn?.destroy();
    this.roshamboBtn = undefined;

    const state = this.tm.state;
    const player = getCurrentPlayer(state);
    if (player.type !== "human" || player.hand.length !== 1) return;

    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillStyle(0xff0066, 1);
    bg.fillRoundedRect(-90, -28, 180, 56, 14);
    bg.lineStyle(4, 0xffff00, 1);
    bg.strokeRoundedRect(-90, -28, 180, 56, 14);

    const text = this.add.text(0, 0, "ROSHAMBO!", {
      fontSize: "22px", fontFamily: "Arial Black, Arial, sans-serif",
      color: "#ffffff", stroke: "#000000", strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    this.roshamboBtn = this.add.container(width / 2, height - 155, [bg, text]);
    this.roshamboBtn.setDepth(50).setSize(180, 56).setInteractive({ cursor: "pointer" });

    this.tweens.add({
      targets: this.roshamboBtn, scaleX: 1.06, scaleY: 1.06,
      duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    this.roshamboBtn.on("pointerdown", () => {
      this.tm.callRoshambo();
      this.toast.show("ROSHAMBO! 🃏", "#ffe000", 1200);
      this.roshamboBtn?.destroy();
      this.roshamboBtn = undefined;
    });
  }

  // ─── EVENT HANDLER ────────────────────────────────────────────────────────────
  // Only handles side-effect UI — turn flow is driven by animation callbacks above.

  private onTurnEvent(event: TurnEvent): void {
    switch (event.type) {
      case "turn_skipped":
        this.toast.show(`SKIPPED: ${this.getPlayerName(event.playerId)}`, "#ff9900");
        this.animateSkippedLabel(event.playerId);
        break;

      case "direction_reversed":
        this.toast.show(
          `Direction: ${event.newDirection === 1 ? "Clockwise ↻" : "Counter ↺"}`,
          "#aaddff"
        );
        this.animateDirectionFlip();
        break;

      case "suit_changed":
        this.toast.show(
          `Suit: ${SUIT_SYMBOLS[event.suit]} ${event.suit.toUpperCase()}`,
          "#ddaaff"
        );
        break;

      case "pending_draw_updated":
        if (event.amount > 0) this.animatePendingDraw(event.amount);
        break;

      case "combo":
        this.comboBanner.show(event.count);
        break;

      case "roshambo_called":
        if (event.playerId !== "human") {
          this.toast.show(`${this.getPlayerName(event.playerId)}: ROSHAMBO!`, "#ffe000");
        }
        break;

      case "roshambo_missed":
        this.toast.show("Forgot ROSHAMBO! Draw 5!", "#ff4444", 2500);
        break;

      case "discard_reshuffled":
        this.toast.show("Deck reshuffled!", "#aaffaa");
        this.renderDrawDeck();
        break;

      case "win":
        this.time.delayedCall(600, () => {
          const winner = this.tm.state.players.find((p) => p.id === event.playerId);
          this.scene.start("VictoryScene", {
            winnerName: winner?.name ?? "Unknown",
            playerCount: this.playerCount,
          });
        });
        break;
    }
  }

  private getPlayerName(id: string): string {
    return this.tm.state.players.find((p) => p.id === id)?.name ?? id;
  }

  private animateSkippedLabel(playerId: string): void {
    const idx = this.tm.state.players.findIndex((p) => p.id === playerId);
    if (idx < 0 || !this.handViews[idx]) return;
    const hv = this.handViews[idx];
    const label = this.add.text(hv.x, hv.y, "SKIPPED!", {
      fontSize: "26px", fontFamily: "Arial Black, Arial, sans-serif",
      color: "#ff4400", stroke: "#000000", strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setDepth(150);
    this.tweens.add({
      targets: label, y: hv.y - 40, alpha: 0,
      duration: 1000, delay: 200, ease: "Quad.easeIn",
      onComplete: () => label.destroy(),
    });
  }

  private animateDirectionFlip(): void {
    const { width, height } = this.scale;
    const arrow = this.add.text(width / 2, height / 2, "↻", {
      fontSize: "64px", fontFamily: "Arial, sans-serif", color: "#aaddff",
    }).setOrigin(0.5, 0.5).setDepth(150);
    this.tweens.add({
      targets: arrow, angle: 360, alpha: 0, duration: 700, ease: "Quad.easeOut",
      onComplete: () => arrow.destroy(),
    });
  }

  private animatePendingDraw(amount: number): void {
    const { width, height } = this.scale;
    const label = this.add.text(width / 2, height / 2 + 70, `+${amount} DRAW STACK!`, {
      fontSize: "22px", fontFamily: "Arial Black, Arial, sans-serif",
      color: "#ff6666", stroke: "#000000", strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(150).setScale(0.3);
    this.tweens.add({
      targets: label, scale: 1, duration: 250, ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: label, alpha: 0, duration: 600, delay: 800,
          onComplete: () => label.destroy(),
        });
      },
    });
  }
}
