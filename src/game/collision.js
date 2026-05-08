import { PLAYER, WORLD } from "./constants.js";

/**
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @returns {number}
 */
export function distance3(a, b) {
  return a.distanceTo(b);
}

/**
 * Head left the playable XZ bounds (matches former Player clamp margin).
 * @param {THREE.Vector3} head
 * @returns {boolean}
 */
export function headOutsideArenaXZ(head) {
  const half = WORLD.floorSize * 0.5 - PLAYER.headRadius - 0.5;
  return Math.abs(head.x) > half || Math.abs(head.z) > half;
}

/**
 * @param {THREE.Vector3} ca
 * @param {number} ra
 * @param {THREE.Vector3} cb
 * @param {number} rb
 * @returns {boolean}
 */
export function spheresOverlap(ca, ra, cb, rb) {
  const sum = ra + rb;
  return ca.distanceToSquared(cb) <= sum * sum;
}
