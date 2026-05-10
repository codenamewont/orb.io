import * as THREE from "three";
import { World } from "./World.js";
import { Player } from "./Player.js";
import { Orb } from "./Orb.js";
import { Obstacle } from "./Obstacle.js";
import {
  BODY_SHOT,
  COLLISION,
  NICKNAME,
  OBSTACLE,
  ORB,
  PLAYER,
  SCORE,
} from "./constants.js";
import { headOutsideArenaXZ, spheresOverlap } from "./collision.js";
import {
  drawStartScreen,
  drawPlayingHUD,
  drawGameOverScreen,
} from "../ui/hud.js";
import {
  getLeaderboardTop10Async,
  getStoredBestForNickname,
  getStoredBestForNicknameAsync,
  recordLeaderboardScoreAsync,
  usesRemoteLeaderboard,
} from "./leaderboard.js";
import {
  playBodyShotFire,
  playBodyShotHit,
  playGameOver,
  playOrbCollect,
  preloadGameAudio,
} from "../audio/sfx.js";

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
    /** @type {Obstacle[]} */
    this.obstacles = [];
    this.state = GameState.MENU;
    this.score = 0;
    this.bestScore = Number(localStorage.getItem("orb-best") ?? 0) || 0;

    /** @type {{ active: boolean; pos: THREE.Vector3; dir: THREE.Vector3; traveled: number; mesh: THREE.Mesh | null }} */
    this._bodyShot = {
      active: false,
      pos: new THREE.Vector3(),
      dir: new THREE.Vector3(0, 0, 1),
      traveled: 0,
      mesh: null,
    };
    this._bodyShotCooldown = 0;

    /** @type {HTMLInputElement | null} */
    this._nicknameInput = null;
    /** @type {HTMLElement | null} */
    this._menuOverlay = null;
    /** @type {HTMLButtonElement | null} */
    this._startButton = null;
    this._nicknameSnapshot = "";
    /** Nickname used for the current run (leaderboard on game over). */
    this._sessionNickname = "";

    /** @type {HTMLOListElement | null} */
    this._leaderboardList = null;
    /** Best score for current session nickname (local + optional remote). */
    this._sessionBestStored = 0;

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
      if (this.state === GameState.PLAYING) {
        if (e.code === "Space") {
          e.preventDefault();
          this._spaceHeld = true;
        } else if (e.code === "KeyA" && !e.repeat) {
          e.preventDefault();
          this._tryFireBodyShot();
        }
        return;
      }
      if (e.code === "KeyA" && !e.repeat) this._tryFireBodyShot();
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
    this._wireNicknameMenu();
  }

  _wireNicknameMenu() {
    this._nicknameInput = document.getElementById("nickname-input");
    this._menuOverlay = document.getElementById("menu-overlay");
    this._startButton = document.getElementById("start-button");
    this._leaderboardList = document.getElementById("leaderboard-list");
    if (this._startButton) {
      this._startButton.addEventListener("click", () =>
        this.tryStartFromMenu(),
      );
    }
    if (this._nicknameInput) {
      const syncNick = () => {
        this._nicknameSnapshot = this._nicknameInput?.value ?? "";
      };
      syncNick();
      this._nicknameInput.addEventListener("input", syncNick);
      this._nicknameInput.addEventListener("compositionend", syncNick);
      this._nicknameInput.addEventListener("keydown", (e) => {
        if (e.code === "Enter") {
          e.preventDefault();
          this._nicknameSnapshot = this._nicknameInput?.value ?? "";
          setTimeout(() => this.tryStartFromMenu(), 0);
        }
      });
      queueMicrotask(() => {
        if (this.state === GameState.MENU) this._nicknameInput?.focus();
      });
    }
    void this._refreshLeaderboardDOM().catch((e) => console.warn(e));
  }

  async _refreshLeaderboardDOM() {
    const list = this._leaderboardList;
    if (!list) return;
    list.replaceChildren();
    if (usesRemoteLeaderboard()) {
      const loading = document.createElement("li");
      loading.className = "leaderboard-empty";
      loading.textContent = "Loading…";
      list.appendChild(loading);
    }
    let rows;
    try {
      rows = await getLeaderboardTop10Async();
    } catch (e) {
      console.warn(e);
      rows = [];
    }
    list.replaceChildren();
    if (rows.length === 0) {
      const li = document.createElement("li");
      li.className = "leaderboard-empty";
      li.textContent = "No scores yet — play to set a record.";
      list.appendChild(li);
      return;
    }
    for (let i = 0; i < rows.length; i++) {
      const { name, score } = rows[i];
      const li = document.createElement("li");
      li.className = "leaderboard-row";
      const rank = document.createElement("span");
      rank.className = "lb-rank";
      rank.textContent = String(i + 1);
      const nameEl = document.createElement("span");
      nameEl.className = "lb-name";
      nameEl.textContent = name;
      const scoreEl = document.createElement("span");
      scoreEl.className = "lb-score";
      scoreEl.textContent = String(score);
      li.append(rank, nameEl, scoreEl);
      list.appendChild(li);
    }
  }

  tryStartFromMenu() {
    if (this._nicknameInput) this._nicknameSnapshot = this._nicknameInput.value;
    if (this.state === GameState.MENU) this.start();
    else if (this.state === GameState.GAME_OVER) this.restart();
  }

  _syncMenuOverlay() {
    if (!this._menuOverlay) return;
    const show =
      this.state === GameState.MENU || this.state === GameState.GAME_OVER;
    this._menuOverlay.style.display = show ? "flex" : "none";
  }

  _readNicknameForGame() {
    const raw = (
      this._nicknameSnapshot ||
      this._nicknameInput?.value ||
      ""
    ).trim();
    if (raw.length === 0) return NICKNAME.defaultName;
    return raw.slice(0, NICKNAME.maxLength);
  }

  _personalBestForHud() {
    return Math.max(this._sessionBestStored, this.score);
  }

  start() {
    if (!this.world) return;
    if (this._nicknameInput) this._nicknameSnapshot = this._nicknameInput.value;
    this._nicknameInput?.blur();
    this._startButton?.blur();
    this._spaceHeld = false;
    this._sessionNickname = this._readNicknameForGame();
    this._sessionBestStored = getStoredBestForNickname(this._sessionNickname);
    void getStoredBestForNicknameAsync(this._sessionNickname).then((n) => {
      this._sessionBestStored = n;
    });
    preloadGameAudio();
    this.state = GameState.PLAYING;
    this.score = 0;
    this._endBodyShot();
    this._bodyShotCooldown = 0;
    this.player?.dispose();
    this.player = new Player(this.world.scene);
    this.player.reset();
    this._applyPlayerNickname();

    if (this.orbs.length === 0) {
      for (let i = 0; i < ORB.count; i++) {
        this.orbs.push(new Orb(this.world.scene));
      }
    }
    this._layoutObstacles();
    this._layoutOrbs();
  }

  _applyPlayerNickname() {
    const apply = () => {
      const name = this._readNicknameForGame();
      this.player?.setNickname(name);
    };
    apply();
    requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
  }

  // Same obstacle objects every time. Only their positions change in start().
  _ensureObstacles() {
    if (!this.world) return;
    if (this.obstacles.length > 0) return;
    for (let i = 0; i < OBSTACLE.count; i++) {
      this.obstacles.push(new Obstacle(this.world.scene));
    }
  }

  _layoutObstacles() {
    if (!this.player) return;
    this._ensureObstacles();
    /** @type {import("three").Vector3[]} */
    const avoid = [this.player.head];
    for (const obs of this.obstacles) {
      obs.revive();
      obs.placeRandom(avoid, OBSTACLE.minSpawnSeparation);
      avoid.push(obs.mesh.position);
    }
  }

  /** Spread orbs on the floor away from the head, obstacles, and each other. */
  _layoutOrbs() {
    if (!this.player) return;
    /** @type {import("three").Vector3[]} */
    const avoid = [this.player.head];
    for (const obs of this.obstacles) {
      if (obs.isActive()) avoid.push(obs.mesh.position);
    }
    for (const orb of this.orbs) {
      orb.respawn(avoid, ORB.minSpawnSeparation);
      avoid.push(orb.mesh.position);
    }
  }

  restart() {
    this.start();
  }

  onGameOver() {
    this._endBodyShot();
    this.state = GameState.GAME_OVER;
    playGameOver();
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem("orb-best", String(this.bestScore));
    }
    this._sessionBestStored = Math.max(this._sessionBestStored, this.score);
    void (async () => {
      await recordLeaderboardScoreAsync(this._sessionNickname, this.score);
      this._sessionBestStored = Math.max(
        this._sessionBestStored,
        await getStoredBestForNicknameAsync(this._sessionNickname),
      );
      await this._refreshLeaderboardDOM();
    })().catch((e) => console.warn(e));
  }

  /**
   * @param {number} dt seconds
   */
  update(dt) {
    if (this.state !== GameState.PLAYING) return;
    if (this.player && this.world) {
      if (this._bodyShotCooldown > 0) {
        this._bodyShotCooldown = Math.max(0, this._bodyShotCooldown - dt);
      }

      const ground = this.world.screenToGround(
        this._mouseClientX,
        this._mouseClientY,
      );
      const boost = this._spaceHeld;
      this.player.update(dt, { groundPoint: ground, boost });
      if (this._checkFatalCollisions()) {
        this.onGameOver();
        return;
      }
      this.player.updateNameLabel();
      this._updateOrbs();
      this._updateBodyShot(dt);
      this.world.updateCamera(this.player, dt);
    }
  }

  _tryFireBodyShot() {
    if (this.state !== GameState.PLAYING || !this.player || !this.world) return;
    if (this._bodyShot.active) return;
    if (this._bodyShotCooldown > 0) return;
    if (!this.player.sacrificeTailSegment()) return;
    this.score = Math.max(0, this.score - SCORE.bodyShotCost);

    const dir = this.player.direction.clone();
    dir.y = 0;
    if (dir.lengthSq() < 1e-8) dir.set(0, 0, 1);
    else dir.normalize();

    const pos = this.player.head.clone();
    pos.y = PLAYER.y;
    pos.addScaledVector(dir, PLAYER.headRadius + BODY_SHOT.startOffset);

    const geo = new THREE.SphereGeometry(BODY_SHOT.radius, 14, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: BODY_SHOT.projectileColor,
      roughness: 0.32,
      metalness: 0.22,
      emissive: BODY_SHOT.projectileEmissive,
      emissiveIntensity: BODY_SHOT.projectileEmissiveIntensity,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.copy(pos);
    this.world.scene.add(mesh);

    this._bodyShot.active = true;
    this._bodyShot.pos.copy(pos);
    this._bodyShot.dir.copy(dir);
    this._bodyShot.traveled = 0;
    this._bodyShot.mesh = mesh;
    this._bodyShotCooldown = BODY_SHOT.cooldown;
    playBodyShotFire();
  }

  _updateBodyShot(dt) {
    if (!this._bodyShot.active || !this.world) return;

    const step = BODY_SHOT.speed * dt;
    this._bodyShot.traveled += step;
    this._bodyShot.pos.addScaledVector(this._bodyShot.dir, step);
    this._bodyShot.mesh.position.copy(this._bodyShot.pos);

    if (
      this._bodyShot.traveled > BODY_SHOT.maxRange ||
      headOutsideArenaXZ(this._bodyShot.pos)
    ) {
      this._endBodyShot();
      return;
    }

    for (const obs of this.obstacles) {
      if (!obs.isActive()) continue;
      if (
        spheresOverlap(
          this._bodyShot.pos,
          BODY_SHOT.radius,
          obs.mesh.position,
          obs.radius,
        )
      ) {
        playBodyShotHit();
        obs.takeHit();
        this.score += SCORE.obstacleHitReward;
        this._endBodyShot();
        return;
      }
    }
  }

  _endBodyShot() {
    if (!this._bodyShot.active || !this.world) {
      this._bodyShot.active = false;
      this._bodyShot.mesh = null;
      return;
    }
    const m = this._bodyShot.mesh;
    if (m) {
      this.world.scene.remove(m);
      m.geometry.dispose();
      /** @type {THREE.Material} */
      const mat = m.material;
      mat.dispose();
    }
    this._bodyShot.active = false;
    this._bodyShot.mesh = null;
  }

  /**
   * @returns {boolean} true if the player should die this frame
   */
  _checkFatalCollisions() {
    if (!this.player) return false;
    const head = this.player.head;

    if (headOutsideArenaXZ(head)) return true;

    for (const obs of this.obstacles) {
      if (!obs.isActive()) continue;
      if (
        spheresOverlap(head, PLAYER.headRadius, obs.mesh.position, obs.radius)
      ) {
        return true;
      }
    }

    for (
      let i = COLLISION.selfBodySkipCount;
      i < this.player.bodyMeshes.length;
      i++
    ) {
      const seg = this.player.bodyMeshes[i];
      if (
        spheresOverlap(
          head,
          PLAYER.headRadius,
          seg.position,
          PLAYER.segmentRadius,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  _updateOrbs() {
    if (!this.player) return;
    for (const orb of this.orbs) {
      if (!orb.tryCollect(this.player.head)) continue;
      playOrbCollect();
      this.score += ORB.scoreValue;
      this.player.grow();
      const avoid = [this.player.head];
      for (const o of this.orbs) {
        if (o !== orb) avoid.push(o.mesh.position);
      }
      for (const obs of this.obstacles) {
        if (obs.isActive()) avoid.push(obs.mesh.position);
      }
      orb.respawn(avoid, ORB.minSpawnSeparation);
    }
  }

  renderThree() {
    this.world?.render();
  }

  drawHUD() {
    this._syncMenuOverlay();
    const p = this.p;
    p.clear();
    switch (this.state) {
      case GameState.MENU:
        drawStartScreen(p);
        break;
      case GameState.PLAYING:
        drawPlayingHUD(p, this.score, this._personalBestForHud());
        break;
      case GameState.GAME_OVER:
        drawGameOverScreen(p, this.score, this._personalBestForHud());
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
    const enter = keyCode === 13 || key === "\n";
    if (!enter) return;
    const input = this._nicknameInput;
    const typing = !!(input && document.activeElement === input);
    if (typing) return;
    if (this._startButton && document.activeElement === this._startButton)
      return;
    if (this._nicknameInput) this._nicknameSnapshot = this._nicknameInput.value;
    if (this.state === GameState.MENU) this.start();
    else if (this.state === GameState.GAME_OVER) this.restart();
  }
}
