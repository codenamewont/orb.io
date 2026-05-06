import { World } from "./World.js";
import { Player } from "./Player.js";
import { Orb } from "./Orb.js";
import { ORB } from "./constants.js";
import {
  drawStartScreen,
  drawPlayingHUD,
  drawGameOverScreen,
} from "../ui/hud.js";

export const GameState = {
  MENU: "MENU",
  PLAYING: "PLAYING",
  GAME_OVER: "GAME_OVER",
};

export class GameManager {
  /**
   * @param {import('p5')} p
   * @param {HTMLElement} threeContainer
   */
  constructor(p, threeContainer) {
    this.p = p;
    this.threeContainer = threeContainer;
    /** @type {World | null} */
    this.world = null;
    /** @type {Player | null} */
    this.player = null;
    /** @type {Orb[]} */
    this.orbs = [];
    this.state = GameState.MENU;
    this.score = 0;
    this.bestScore = Number(localStorage.getItem("orb-best") ?? 0) || 0;

    this._mouseClientX =
      typeof window !== "undefined" ? window.innerWidth * 0.5 : 0;
    this._mouseClientY =
      typeof window !== "undefined" ? window.innerHeight * 0.5 : 0;
    /** @param {PointerEvent} e */
    this._onPointerMove = (e) => {
      this._mouseClientX = e.clientX;
      this._mouseClientY = e.clientY;
    };

    /** Space held (boost); keyup/blur clears so it is never stuck on. */
    this._spaceHeld = false;
    /** @param {KeyboardEvent} e */
    this._onKeyDown = (e) => {
      if (e.code === "Space") this._spaceHeld = true;
    };
    /** @param {KeyboardEvent} e */
    this._onKeyUp = (e) => {
      if (e.code === "Space") this._spaceHeld = false;
    };
    this._onWindowBlur = () => {
      this._spaceHeld = false;
    };
  }

  init() {
    this.world = new World(this.threeContainer);
    this.threeContainer.addEventListener("pointermove", this._onPointerMove, {
      passive: true,
    });
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onWindowBlur);
  }

  start() {
    if (!this.world) return;
    this.state = GameState.PLAYING;
    this.score = 0;
    this.player?.dispose();
    this.player = new Player(this.world.scene);
    this.player.reset();

    if (this.orbs.length === 0) {
      for (let i = 0; i < ORB.count; i++) {
        this.orbs.push(new Orb(this.world.scene));
      }
    }
    this._layoutOrbs();
  }

  /** Spread orbs on the floor away from the head and each other. */
  _layoutOrbs() {
    if (!this.player) return;
    /** @type {import("three").Vector3[]} */
    const avoid = [this.player.head];
    for (const orb of this.orbs) {
      orb.respawn(avoid, ORB.minSpawnSeparation);
      avoid.push(orb.mesh.position);
    }
  }

  restart() {
    this.start();
  }

  onGameOver() {
    this.state = GameState.GAME_OVER;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem("orb-best", String(this.bestScore));
    }
  }

  /**
   * @param {number} dt seconds
   */
  update(dt) {
    if (this.state !== GameState.PLAYING) return;
    if (this.player && this.world) {
      const ground = this.world.screenToGround(
        this._mouseClientX,
        this._mouseClientY,
      );
      const boost = this._spaceHeld;
      this.player.update(dt, { groundPoint: ground, boost });
      this._updateOrbs();
      this.world.updateCamera(this.player, dt);
    }
  }

  _updateOrbs() {
    if (!this.player) return;
    for (const orb of this.orbs) {
      if (!orb.tryCollect(this.player.head)) continue;
      this.score += ORB.scoreValue;
      this.player.grow();
      const avoid = [this.player.head];
      for (const o of this.orbs) {
        if (o !== orb) avoid.push(o.mesh.position);
      }
      orb.respawn(avoid, ORB.minSpawnSeparation);
    }
  }

  renderThree() {
    this.world?.render();
  }

  drawHUD() {
    const p = this.p;
    p.clear();
    switch (this.state) {
      case GameState.MENU:
        drawStartScreen(p);
        break;
      case GameState.PLAYING:
        drawPlayingHUD(p, this.score, this.bestScore);
        break;
      case GameState.GAME_OVER:
        drawGameOverScreen(p, this.score, this.bestScore);
        break;
      default:
        break;
    }
  }

  /**
   * @param {number} w
   * @param {number} h
   */
  resize(w, h) {
    this.world?.resize(w, h);
  }

  /**
   * @param {string} key
   * @param {number} keyCode p5 keyCode (13 = Enter, 32 = Space)
   */
  onKeyPressed(key, keyCode) {
    const activate =
      keyCode === 13 || // Enter
      keyCode === 32 || // Space
      key === " " ||
      key === "\n";
    if (!activate) return;
    if (this.state === GameState.MENU) this.start();
    else if (this.state === GameState.GAME_OVER) this.restart();
  }
}
