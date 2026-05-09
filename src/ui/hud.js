/**
 * @param {import('p5')} p
 */
export function drawStartScreen(p) {
  p.push();
  p.fill(240, 245, 255);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(42);
  p.text("Orb.io", p.width / 2, p.height / 2 - 36);
  p.textSize(18);
  p.fill(200, 205, 220);
  p.text(
    "Enter nickname below, then Start or ENTER",
    p.width / 2,
    p.height / 2 + 12,
  );
  p.textSize(15);
  p.fill(170, 175, 200);
  p.text("A key: segment shot vs obstacles", p.width / 2, p.height / 2 + 42);
  p.pop();
}

/**
 * @param {import('p5')} p
 * @param {number} score
 * @param {number} best
 */
export function drawPlayingHUD(p, score, best) {
  p.push();
  p.noStroke();
  p.fill(0, 0, 0, 120);
  p.rect(12, 12, 228, 56, 8);
  p.fill(235, 240, 255);
  p.textAlign(p.LEFT, p.TOP);
  p.textSize(16);
  p.text(`Score: ${score}`, 24, 22);
  p.textSize(14);
  p.fill(180, 186, 210);
  p.text(`Your best: ${best}`, 24, 44);
  p.pop();
}

/**
 * @param {import('p5')} p
 * @param {number} score
 * @param {number} best
 */
export function drawGameOverScreen(p, score, best) {
  p.push();
  p.noStroke();
  p.fill(0, 0, 0, 170);
  p.rect(0, 0, p.width, p.height);
  p.fill(255, 90, 90);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(40);
  p.text("Game Over", p.width / 2, p.height / 2 - 48);
  p.fill(235, 238, 250);
  p.textSize(20);
  p.text(`Score: ${score}   Your best: ${best}`, p.width / 2, p.height / 2);
  p.textSize(18);
  p.fill(190, 195, 215);
  p.text(
    "Click Start or press ENTER to restart",
    p.width / 2,
    p.height / 2 + 40,
  );
  p.pop();
}
