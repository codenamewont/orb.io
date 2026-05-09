import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { BLOOM, CAMERA, RENDER, WORLD } from "./constants.js";

export class World {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(WORLD.sceneBackground);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    this.camera.position.set(0, WORLD.cameraHeight, WORLD.cameraDistance);
    this.camera.lookAt(0, 0, 0);

    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2(); // Normalized Device Coordinates
    /** Ground plane y = 0 (raycast target for mouse steering). */
    this._groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this._camGoal = new THREE.Vector3();
    this._camLook = new THREE.Vector3();
    this._groundHitResult = new THREE.Vector3();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = RENDER.toneMappingExposure;
    container.appendChild(this.renderer.domElement);

    this._composer = new EffectComposer(this.renderer);
    this._composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      BLOOM.strength,
      BLOOM.radius,
      BLOOM.threshold,
    );
    this._composer.addPass(bloomPass);
    this._composer.addPass(new OutputPass());

    const ambient = new THREE.AmbientLight(
      WORLD.ambientColor,
      WORLD.ambientIntensity,
    );
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(WORLD.sunColor, WORLD.sunIntensity);
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
      color: WORLD.floorColor,
      roughness: WORLD.floorRoughness,
      metalness: WORLD.floorMetalness,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    /** @type {THREE.GridHelper | null} */
    this._grid = new THREE.GridHelper(
      WORLD.floorSize,
      40,
      WORLD.gridColorPrimary,
      WORLD.gridColorSecondary,
    );
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
    this._composer.setPixelRatio(this.renderer.getPixelRatio());
    this._composer.setSize(width, height);
  }

  render() {
    this._composer.render();
  }

  /**
   * Screen position (client pixels) → world point on the ground plane (y = 0).
   * @param {number} clientX
   * @param {number} clientY
   * @returns {THREE.Vector3 | null}
   */
  screenToGround(clientX, clientY) {
    const dom = this.renderer.domElement;
    const rect = dom.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this._ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._ndc, this.camera);
    const hit = this._raycaster.ray.intersectPlane(
      this._groundPlane,
      this._groundHitResult,
    );
    return hit;
  }

  /**
   * Camera follows the player's head with a fixed offset in world space.
   * It moves with the player but does NOT rotate when the player turns.
   * This keeps the view stable, so the ground does not appear to spin or tilt.
   * @param {{ head: THREE.Vector3 }} player
   * @param {number} dt
   */
  updateCamera(player, dt) {
    const head = player.head;
    const a = 1 - Math.exp(-CAMERA.smooth * Math.min(dt, 0.1));

    this._camGoal.set(
      head.x + CAMERA.worldOffsetX,
      head.y + CAMERA.worldOffsetY,
      head.z + CAMERA.worldOffsetZ,
    );

    this._camLook.set(head.x, head.y + CAMERA.lookAtYOffset, head.z);

    if (
      this.camera.position.distanceToSquared(this._camGoal) >
      CAMERA.snapDistance ** 2
    ) {
      this.camera.position.copy(this._camGoal);
    } else {
      this.camera.position.lerp(this._camGoal, a);
    }
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this._camLook);
  }
}
