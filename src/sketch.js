import p5 from 'p5';
import { GameManager } from './game/GameManager.js';

/** @type {GameManager | null} */
let game = null;

const sketch = (p) => {
  p.setup = () => {
    const root = document.getElementById('three-root');
    if (!root) {
      throw new Error('Missing #three-root container');
    }
    game = new GameManager(p, root);
    game.init();

    p.createCanvas(p.windowWidth, p.windowHeight);
    const c = p.canvas;
    c.style.position = 'fixed';
    c.style.inset = '0';
    c.style.zIndex = '10';
    c.style.pointerEvents = 'none';

    p.textFont('sans-serif');
  };

  p.draw = () => {
    if (!game) return;
    const dt = Math.min(p.deltaTime / 1000, 0.1);
    game.update(dt);
    game.renderThree();
    game.drawHUD();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    game?.resize(p.windowWidth, p.windowHeight);
  };

  p.keyPressed = () => {
    game?.onKeyPressed(p.key, p.keyCode);
  };
};

new p5(sketch);
