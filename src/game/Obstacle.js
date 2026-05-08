import * as THREE from "three";
import { PLAYER, WORLD, OBSTACLE } from "./constants.js";

export class Obstacle {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.radius = OBSTACLE.radius;
    const geo = new THREE.SphereGeometry(this.radius, 18, 14);
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
    const half = WORLD.floorSize * 0.5 - this.radius - 1;
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
