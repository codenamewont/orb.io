import { SFX_URLS, SFX_VOLUME } from "./sfxUrls.js";

/** @type {boolean} */
let _preloaded = false;

/** @type {HTMLAudioElement[]} */
const _preloadRefs = [];

export function preloadGameAudio() {
  if (typeof Audio === "undefined" || _preloaded) return;
  _preloaded = true;
  for (const url of Object.values(SFX_URLS)) {
    const a = new Audio(url);
    a.preload = "auto";
    a.volume = SFX_VOLUME;
    _preloadRefs.push(a);
    void a.load();
  }
}

/**
 * @param {string} url
 */
function playUrl(url) {
  if (typeof Audio === "undefined") return;
  const a = new Audio(url);
  a.volume = SFX_VOLUME;
  void a.play().catch(() => {});
}

export function playOrbCollect() {
  playUrl(SFX_URLS.orbCollect);
}

export function playBodyShotFire() {
  playUrl(SFX_URLS.bodyShotFire);
}

export function playBodyShotHit() {
  playUrl(SFX_URLS.bodyShotHit);
}

export function playGameOver() {
  playUrl(SFX_URLS.gameOver);
}
