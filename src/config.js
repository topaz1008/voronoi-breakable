/**
 * Central configuration.
 * Everything in 'config' is mutable at runtime (bound to the lil-gui panel).
 */
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;

export const PHYSICS_STEP_MS = 1000 / 60; // Fixed timestep

export const BOX_SIZE = 100;

export const config = {
  // Spawning
  material: 'checkers',
  boxSize: BOX_SIZE,

  // Fracture
  shardCount: 35,           // Voronoi sites per break
  impactFocus: 0.6,         // Fraction of sites clustered around the impact point (0..1)
  breakSpeed: 5,            // Minimum relative normal speed required to break (px/step)
  recursiveBreaking: true,  // Fragments can break again
  maxBreakDepth: 2,         // 0 = original body; fragments deeper than this never break
  minBreakArea: 1200,       // Fragments smaller than this (px^2) never re-break
  minCellArea: 30,          // Voronoi cells smaller than this are discarded

  // Fragment lifecycle
  smallFragmentArea: 600,   // Fragments below this area fade out and get removed
  fragmentLifetimeMs: 8000,
  maxBodies: 400,           // Hard cap on dynamic bodies in the world

  // Effects
  slowMotion: true,
  screenShake: true,
  particles: true,

  // World
  gravityY: 1.2,
  showWireframe: false
};
