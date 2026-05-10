import { NICKNAME } from "./constants.js";
import { supabase } from "../lib/supabaseClient.js";

const STORAGE_KEY = "orb-leaderboard-v1";
const TABLE = "orb_leaderboard";

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

/** @returns {boolean} */
export function usesRemoteLeaderboard() {
  return supabase !== null;
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

/**
 * @param {string} nickname
 * @returns {Promise<number>}
 */
export async function getStoredBestForNicknameAsync(nickname) {
  const name = normalizeNickname(nickname);
  if (!name) return 0;
  if (!supabase) return getStoredBestForNickname(nickname);
  const { data, error } = await supabase
    .from(TABLE)
    .select("score")
    .eq("nickname", name)
    .maybeSingle();
  if (error) {
    console.warn("[leaderboard]", error.message);
    return getStoredBestForNickname(nickname);
  }
  const n = Number(data?.score);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * @param {string} nickname
 * @param {number} score
 * @returns {Promise<void>}
 */
export async function recordLeaderboardScoreAsync(nickname, score) {
  const name = normalizeNickname(nickname);
  if (!name) return;
  const n = Number(score);
  if (!Number.isFinite(n) || n < 0) return;

  if (!supabase) {
    recordLeaderboardScore(nickname, score);
    return;
  }

  const { data: row, error: readErr } = await supabase
    .from(TABLE)
    .select("score")
    .eq("nickname", name)
    .maybeSingle();
  if (readErr) {
    console.warn("[leaderboard]", readErr.message);
    recordLeaderboardScore(nickname, score);
    return;
  }
  const prev = row ? Number(row.score) : NaN;
  if (Number.isFinite(prev) && n <= prev) return;

  const { error: writeErr } = await supabase.from(TABLE).upsert(
    { nickname: name, score: n, updated_at: new Date().toISOString() },
    { onConflict: "nickname" },
  );
  if (writeErr) {
    console.warn("[leaderboard]", writeErr.message);
    recordLeaderboardScore(nickname, score);
  }
}

/** @returns {Promise<{ name: string; score: number }[]>} */
export async function getLeaderboardTop10Async() {
  if (!supabase) return getLeaderboardTop10();

  const { data, error } = await supabase
    .from(TABLE)
    .select("nickname, score")
    .order("score", { ascending: false })
    .order("nickname", { ascending: true })
    .limit(10);

  if (error) {
    console.warn("[leaderboard]", error.message);
    return getLeaderboardTop10();
  }
  return (data ?? []).map((row) => ({
    name: String(row.nickname),
    score: Number(row.score) || 0,
  }));
}
