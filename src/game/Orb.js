import * as THREE from "three";
import { PLAYER, WORLD, ORB } from "./constants.js";
import { spheresOverlap } from "./collision.js";

export class Orb {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.SphereGeometry(ORB.radius, 16, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: ORB.color,
      roughness: 0.35,
      metalness: 0.2,
      emissive: ORB.emissive,
      emissiveIntensity: 0.45,
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
   * @param {THREE.Vector3} head
   * @returns {boolean}
   */
  tryCollect(head) {
    return spheresOverlap(
      head,
      PLAYER.headRadius,
      this.mesh.position,
      ORB.radius + ORB.pickupPadding,
    );
  }

  /**
   * Random XZ on the floor, away from `avoidCenters` (XZ distance).
   * @param {THREE.Vector3[]} avoidCenters
   * @param {number} minSeparationXZ
   */
  respawn(avoidCenters, minSeparationXZ) {
    const half = WORLD.floorSize * 0.5 - ORB.radius - 1;
    const minSq = minSeparationXZ * minSeparationXZ;

    for (let attempt = 0; attempt < 48; attempt++) {
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

    // fallback
    const x = (Math.random() * 2 - 1) * half;
    const z = (Math.random() * 2 - 1) * half;
    this.mesh.position.set(x, PLAYER.y, z);
  }
}
