export const WORLD = {
  floorSize: 80,
  cameraHeight: 18,
  cameraDistance: 22,
  sceneBackground: 0x04030a,
  ambientColor: 0x5533aa,
  ambientIntensity: 0.4,
  sunColor: 0xa8d8ff,
  sunIntensity: 0.68,
  floorColor: 0x0f0c18,
  floorRoughness: 0.9,
  floorMetalness: 0.08,
  gridColorPrimary: 0x00e8c8,
  gridColorSecondary: 0xff0a8c,
};

// The camera follows the player's position,
// but it does NOT rotate based on the player's facing direction.
// It stays aligned with the world axes for a stable, top-down-like view.
export const CAMERA = {
  worldOffsetX: 0,
  worldOffsetY: 15,
  worldOffsetZ: 13,
  lookAtYOffset: 0.15,
  smooth: 12,
  snapDistance: 35,
};

export const BLOOM = {
  strength: 0.46,
  radius: 0.28,
  threshold: 0.34,
};

export const RENDER = {
  toneMappingExposure: 2.0,
};

export const PLAYER = {
  moveSpeed: 12,
  boostMoveSpeed: 21,
  directionSmoothing: 10,
  y: 0.55,
  headRadius: 0.38,
  segmentRadius: 0.32,
  segmentSpacing: 0.42,
  initialBodySegments: 3,
  trailSampleDistance: 0.18,
  maxTrailSamples: 4000,
  headColor: 0x78f8ff,
  headEmissive: 0x40e8f5,
  headEmissiveIntensity: 0.38,
  bodyColor: 0x56b8ff,
  bodyEmissive: 0x3090e8,
  bodyEmissiveIntensity: 0.32,
};

/** In-world name tag above the head (sprite + canvas texture). */
export const NICKNAME = {
  maxLength: 14,
  defaultName: "Player",
  labelOffsetY: 0.78,
  spriteWorldWidth: 3.6,
  textureWidth: 768,
  textureHeight: 192,
  fontPx: 78,
  labelFill: "#8eb0c4",
};

/** Sacrifice one tail segment; projectile flies along facing (A key). */
export const BODY_SHOT = {
  speed: 28,
  radius: 0.28,
  maxRange: 48,
  cooldown: 0.4,
  startOffset: 0.55,
  projectileColor: 0xcfffff,
  projectileEmissive: 0x55ffff,
  projectileEmissiveIntensity: 0.42,
};

export const ORB = {
  count: 10,
  radius: 0.3,
  color: 0xffee55,
  emissive: 0xffcc22,
  emissiveIntensity: 0.44,
  scoreValue: 1,
  pickupPadding: 0.06,
  minSpawnSeparation: 2.8,
};

export const SCORE = {
  bodyShotCost: 1,
  obstacleHitReward: 2,
};

export const OBSTACLE = {
  count: 12,
  radius: 0.85,
  color: 0xc86bff,
  emissive: 0x9a3dff,
  emissiveIntensity: 0.4,
  minSpawnSeparation: 4.5,
  /** Hits from body shots before the obstacle is destroyed. */
  hitsToDestroy: 3,
};

/** First body segment indices (0-based) skipped for head vs self collision. */
export const COLLISION = {
  selfBodySkipCount: 3,
};
