import * as THREE from "three";
import { PLAYER, WORLD } from "./constants.js";

const _move = new THREE.Vector3();
const _segPos = new THREE.Vector3();
const _steer = new THREE.Vector3();
const _fwd = new THREE.Vector3(0, 0, 1);
const _qCur = new THREE.Quaternion();
const _qTgt = new THREE.Quaternion();

/**
 * Moves like Slither.io:
 * always moves forward and turns toward the mouse.
 * The body follows the path that the head has traveled.
 */
export class Player {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    this.head = new THREE.Vector3(0, PLAYER.y, 0);
    /** Unit direction on XZ (Y ignored). */
    this.direction = new THREE.Vector3(0, 0, 1);
    /** Smoothed steer target (unit XZ). */
    this.targetDirection = new THREE.Vector3(0, 0, 1);
    /** Current scalar speed (updated each frame). */
    this.speed = PLAYER.moveSpeed;

    /** @type {THREE.Vector3[]} A list of past positions (oldest → newest). */
    this.trail = [];
    this._lastSamplePos = new THREE.Vector3().copy(this.head);

    const half = WORLD.floorSize * 0.5 - PLAYER.headRadius - 0.5;
    this._boundsMin = new THREE.Vector3(-half, PLAYER.y, -half);
    this._boundsMax = new THREE.Vector3(half, PLAYER.y, half);

    const headGeo = new THREE.SphereGeometry(PLAYER.headRadius, 20, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      roughness: 0.35,
      metalness: 0.15,
      emissive: 0x112233,
    });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.castShadow = true;
    this.headMesh.position.copy(this.head);
    this.scene.add(this.headMesh);

    this.segmentCount = PLAYER.initialBodySegments;
    /** @type {THREE.Mesh[]} */
    this.bodyMeshes = [];
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4488cc,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0x0a1520,
    });
    const bodyGeo = new THREE.SphereGeometry(PLAYER.segmentRadius, 18, 14);
    for (let i = 0; i < this.segmentCount; i++) {
      const m = new THREE.Mesh(bodyGeo, bodyMat);
      m.castShadow = true;
      this.bodyMeshes.push(m);
      this.scene.add(m);
    }

    this._syncBodyBehindDirection();
  }

  /** Adds one body segment (shared geometry/material with existing body). */
  grow() {
    if (this.bodyMeshes.length === 0) return;
    const template = this.bodyMeshes[0];
    const m = new THREE.Mesh(template.geometry, template.material);
    m.castShadow = true;
    const last = this.bodyMeshes[this.bodyMeshes.length - 1];
    m.position.copy(last.position);
    this.bodyMeshes.push(m);
    this.segmentCount = this.bodyMeshes.length;
    this.scene.add(m);
  }

  /** Place body spheres along -direction from the head. */
  _syncBodyBehindDirection() {
    for (let i = 0; i < this.bodyMeshes.length; i++) {
      const d = (i + 1) * PLAYER.segmentSpacing;
      _segPos.copy(this.head).addScaledVector(this.direction, -d);
      _segPos.y = PLAYER.y;
      this.bodyMeshes[i].position.copy(_segPos);
    }
  }

  /**
   * @param {number} dt
   * @param {{ groundPoint: THREE.Vector3 | null; boost: boolean }} input
   */
  update(dt, input) {
    this.speed = input.boost ? PLAYER.boostMoveSpeed : PLAYER.moveSpeed;

    if (input.groundPoint) {
      _steer.copy(input.groundPoint).sub(this.head);
      _steer.y = 0;
      if (_steer.lengthSq() > 1e-6) {
        _steer.normalize();
        this.targetDirection.copy(_steer);
      }
    }

    const blend = 1 - Math.exp(-PLAYER.directionSmoothing * Math.min(dt, 0.1));
    _qCur.setFromUnitVectors(_fwd, this.direction);
    _qTgt.setFromUnitVectors(_fwd, this.targetDirection);
    _qCur.slerp(_qTgt, blend);
    this.direction.copy(_fwd).applyQuaternion(_qCur);
    this.direction.y = 0;
    if (this.direction.lengthSq() < 1e-8) this.direction.set(0, 0, 1);
    else this.direction.normalize();

    _move.copy(this.direction).multiplyScalar(this.speed * dt);
    this.head.add(_move);
    this.head.y = PLAYER.y;
    this.head.clamp(this._boundsMin, this._boundsMax);

    const d2 = PLAYER.trailSampleDistance * PLAYER.trailSampleDistance;
    while (this.head.distanceToSquared(this._lastSamplePos) >= d2) {
      _segPos.copy(this.head).sub(this._lastSamplePos).normalize();
      this._lastSamplePos.addScaledVector(_segPos, PLAYER.trailSampleDistance);
      this._lastSamplePos.y = PLAYER.y;
      this.trail.push(new THREE.Vector3().copy(this._lastSamplePos));
      while (this.trail.length > PLAYER.maxTrailSamples) this.trail.shift();
    }

    this.headMesh.position.copy(this.head);

    for (let i = 0; i < this.bodyMeshes.length; i++) {
      const dist = (i + 1) * PLAYER.segmentSpacing;
      this._pointBehindHead(dist, _segPos);
      this.bodyMeshes[i].position.copy(_segPos);
    }
  }

  /**
   * Finds a point `dist` units behind the head along its movement path.
   * Used to position body segments smoothly along the trail.
   * @param {number} dist
   * @param {THREE.Vector3} out
   */
  _pointBehindHead(dist, out) {
    if (dist <= 0) {
      out.copy(this.head);
      out.y = PLAYER.y;
      return;
    }

    if (this.trail.length === 0) {
      out.copy(this.head).addScaledVector(this.direction, -dist);
      out.y = PLAYER.y;
      return;
    }

    let remaining = dist;
    let cx = this.head.x;
    let cz = this.head.z;

    for (let idx = this.trail.length - 1; idx >= 0; idx--) {
      const p = this.trail[idx];
      const dx = p.x - cx;
      const dz = p.z - cz;
      const len = Math.hypot(dx, dz);
      if (len < 1e-8) {
        cx = p.x;
        cz = p.z;
        continue;
      }
      if (remaining <= len) {
        const t = remaining / len;
        out.set(cx + (p.x - cx) * t, PLAYER.y, cz + (p.z - cz) * t);
        return;
      }
      remaining -= len;
      cx = p.x;
      cz = p.z;
    }

    if (remaining > 0) {
      let ox;
      let oz;
      if (this.trail.length >= 2) {
        const p0 = this.trail[0];
        const p1 = this.trail[1];
        ox = p0.x - p1.x;
        oz = p0.z - p1.z;
      } else {
        const p0 = this.trail[0];
        ox = p0.x - this.head.x;
        oz = p0.z - this.head.z;
      }
      const elen = Math.hypot(ox, oz);
      if (elen > 1e-8) {
        ox /= elen;
        oz /= elen;
        out.set(cx - ox * remaining, PLAYER.y, cz - oz * remaining);
      } else {
        out.set(cx, PLAYER.y, cz);
      }
    } else {
      out.set(cx, PLAYER.y, cz);
    }
  }

  reset() {
    this.head.set(0, PLAYER.y, 0);
    this.direction.set(0, 0, 1);
    this.targetDirection.set(0, 0, 1);
    this.speed = PLAYER.moveSpeed;
    this.trail.length = 0;
    this._lastSamplePos.copy(this.head);
    this.headMesh.position.copy(this.head);
    this._syncBodyBehindDirection();
  }

  dispose() {
    this.scene.remove(this.headMesh);
    this.headMesh.geometry.dispose();
    /** @type {THREE.Material} */
    const hm = this.headMesh.material;
    hm.dispose();
    for (const m of this.bodyMeshes) {
      this.scene.remove(m);
    }
    if (this.bodyMeshes.length > 0) {
      this.bodyMeshes[0].geometry.dispose();
      /** @type {THREE.Material} */
      const mat = this.bodyMeshes[0].material;
      mat.dispose();
    }
    this.bodyMeshes.length = 0;
  }
}
