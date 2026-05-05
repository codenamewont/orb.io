import * as THREE from 'three';
import { WORLD } from './constants.js';

/**
 * Three.js scene: lighting, ground plane, camera, renderer.
 * Gameplay meshes are added later by Player / collectibles.
 */
export class World {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    this.camera.position.set(0, WORLD.cameraHeight, WORLD.cameraDistance);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0x7a7a90, 0.85);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.05);
    sun.position.set(12, 24, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -40;
    sun.shadow.camera.right = sun.shadow.camera.top = 40;
    this.scene.add(sun);

    const floorGeo = new THREE.PlaneGeometry(WORLD.floorSize, WORLD.floorSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e32,
      roughness: 0.92,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    /** @type {THREE.GridHelper | null} */
    this._grid = new THREE.GridHelper(WORLD.floorSize, 40, 0x3d3d55, 0x2a2a3d);
    this._grid.position.y = 0.01;
    this.scene.add(this._grid);
  }

  /**
   * @param {number} _w
   * @param {number} _h
   */
  resize(_w, _h) {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
