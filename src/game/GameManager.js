import { World } from './World.js';
import {
  drawStartScreen,
  drawPlayingHUD,
  drawGameOverScreen,
} from '../ui/hud.js';

export const GameState = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
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
    this.state = GameState.MENU;
    this.score = 0;
    this.bestScore = Number(localStorage.getItem('orb-best') ?? 0) || 0;
  }

  init() {
    this.world = new World(this.threeContainer);
  }

  start() {
    this.state = GameState.PLAYING;
    this.score = 0;
  }

  restart() {
    this.start();
  }

  onGameOver() {
    this.state = GameState.GAME_OVER;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('orb-best', String(this.bestScore));
    }
  }

  /**
   * @param {number} dt seconds
   */
  update(dt) {
    if (this.state !== GameState.PLAYING) return;
    void dt;
    // Player / orbs / collisions will run here.
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
      key === ' ' ||
      key === '\n';
    if (!activate) return;
    if (this.state === GameState.MENU) this.start();
    else if (this.state === GameState.GAME_OVER) this.restart();
  }
}
