export const WORLD = {
  floorSize: 80,
  cameraHeight: 18,
  cameraDistance: 22,
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
};

export const ORB = {
  count: 10,
  radius: 0.3,
  color: 0xffcc44,
  emissive: 0x664400,
  scoreValue: 1,
  pickupPadding: 0.06,
  minSpawnSeparation: 2.8,
};
