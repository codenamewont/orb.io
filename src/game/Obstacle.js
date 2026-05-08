import * as THREE from "three";
import { PLAYER, WORLD, OBSTACLE } from "./constants.js";

export class Obstacle {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.radius = OBSTACLE.radius;
    this.hitsRemaining = OBSTACLE.hitsToDestroy;
    const geo = new THREE.SphereGeometry(OBSTACLE.radius, 18, 14);
    const mat = new THREE.MeshStandardMaterial({
      color: OBSTACLE.color,
      roughness: 0.45,
      metalness: 0.2,
      emissive: OBSTACLE.emissive,
      emissiveIntensity: 0.25,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.y = PLAYER.y;
    this.scene.add(this.mesh);
  }

  isActive() {
    return this.hitsRemaining > 0;
  }

  revive() {
    this.hitsRemaining = OBSTACLE.hitsToDestroy;
    this.mesh.visible = true;
    this._syncRadiusScale();
  }

  _syncRadiusScale() {
    const t = this.hitsRemaining / OBSTACLE.hitsToDestroy;
    this.radius = OBSTACLE.radius * t;
    const s = Math.max(t, 1e-3);
    this.mesh.scale.setScalar(s);
  }

  /** shrinks or removes the obstacle. */
  takeHit() {
    if (!this.isActive()) return;
    this.hitsRemaining -= 1;
    if (this.hitsRemaining <= 0) {
      this.radius = 0;
      this.mesh.visible = false;
      this.mesh.scale.setScalar(1e-3);
    } else {
      this._syncRadiusScale();
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    /** @type {THREE.Material} */
    const m = this.mesh.material;
    m.dispose();
  }

  /**
   * Random XZ inside the arena, away from origins in `avoidCenters`.
   * @param {THREE.Vector3[]} avoidCenters
   * @param {number} minSeparationXZ
   */
  placeRandom(avoidCenters, minSeparationXZ) {
    const half = WORLD.floorSize * 0.5 - OBSTACLE.radius - 1;
    const minSq = minSeparationXZ * minSeparationXZ;

    for (let attempt = 0; attempt < 64; attempt++) {
      const x = (Math.random() * 2 - 1) * half;
      const z = (Math.random() * 2 - 1) * half;
      let clear = true;
      for (const c of avoidCenters) {
        const dx = c.x - x;
        const dz = c.z - z;
        if (dx * dx + dz * dz < minSq) {
          clear = false;
          break;
        }
      }
      if (clear) {
        this.mesh.position.set(x, PLAYER.y, z);
        return;
      }
    }

    const x = (Math.random() * 2 - 1) * half;
    const z = (Math.random() * 2 - 1) * half;
    this.mesh.position.set(x, PLAYER.y, z);
  }
}
