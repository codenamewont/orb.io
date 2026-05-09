import { NICKNAME } from "./constants.js";

const STORAGE_KEY = "orb-leaderboard-v1";

/**
 * @returns {Record<string, number>}
 */
function loadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && !Array.isArray(data)) return data;
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * @param {Record<string, number>} map
 */
function saveMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * @param {string} nickname
 * @returns {string}
 */
function normalizeNickname(nickname) {
  return String(nickname).trim().slice(0, NICKNAME.maxLength);
}

/**
 * Best score stored for this nickname (0 if none). Same key rules as {@link recordLeaderboardScore}.
 * @param {string} nickname
 * @returns {number}
 */
export function getStoredBestForNickname(nickname) {
  const name = normalizeNickname(nickname);
  if (!name) return 0;
  const map = loadMap();
  const v = map[name];
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function recordLeaderboardScore(nickname, score) {
  const name = normalizeNickname(nickname);
  if (!name) return;
  const n = Number(score);
  if (!Number.isFinite(n) || n < 0) return;
  const map = loadMap();
  const prev = map[name];
  if (prev !== undefined && n <= prev) return;
  map[name] = n;
  saveMap(map);
}

/** @returns {{ name: string; score: number }[]} */
export function getLeaderboardTop10() {
  const map = loadMap();
  return Object.entries(map)
    .map(([name, score]) => ({ name, score: Number(score) || 0 }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 10);
}
