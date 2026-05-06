/**
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @returns {number}
 */
export function distance3(a, b) {
  return a.distanceTo(b);
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
