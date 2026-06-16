/**
 * Entry point: creates the matter.js engine, fixed-timestep loop, collision-driven
 * fracturing, effects, renderer, input and the lil-gui control panel.
 */
import Matter from 'matter-js';
import GUI from 'lil-gui';

import { PHYSICS_STEP_MS, config } from './config.js';
import { MATERIALS, MATERIAL_NAMES } from './materials.js';
import { fractureBody } from './fracture.js';
import { Effects } from './effects.js';
import { Renderer } from './renderer.js';
import { setupInput } from './input.js';
import {
  createEngine,
  addBounds,
  shootBoxes,
  clearDynamicBodies,
  manageFragments
} from './world.js';

const { Engine, Events, Composite, Vector } = Matter;

// Setup
const engine = createEngine();
addBounds(engine);

const effects = new Effects(engine);
const renderer = new Renderer(document.querySelector('#canvas-container'), engine, effects);
setupInput(renderer.canvas, engine, renderer);

let isPaused = false;
const stats = { bodies: 0, fps: 0 };

// Fixed-timestep accumulator, the simulation always advances in PHYSICS_STEP_MS
// increments regardless of display refresh rate (same speed at 60Hz and 240Hz).
let lastTime = performance.now();
let accumulator = 0;
let fpsCounter = 0;
let fpsTime = 0;

// Fracturing
// Breaks are queued during collision events and processed after Engine.update returns
const breakQueue = new Map(); // body.id -> { body, point, intensity }

Events.on(engine, 'collisionStart', (e) => {
  for (const pair of e.pairs) {
    const { bodyA, bodyB, collision } = pair;

    // Relative speed along the collision normal decides if anything breaks.
    const relativeVelocity = Vector.sub(bodyA.velocity, bodyB.velocity);
    const normalSpeed = Math.abs(Vector.dot(relativeVelocity, collision.normal));
    const point = collision.supports?.[0]
      ?? Vector.mult(Vector.add(bodyA.position, bodyB.position), 0.5);

    for (const body of [bodyA, bodyB]) {
      if (!body.isBreakable || breakQueue.has(body.id)) continue;

      const material = MATERIALS[body.materialName] ?? MATERIALS[config.material];
      const threshold = config.breakSpeed * material.breakSpeedScale;
      if (normalSpeed < threshold) continue;

      const intensity = Math.min(1, (normalSpeed - threshold) / (threshold * 2.5));

      breakQueue.set(body.id, { body, point: { x: point.x, y: point.y }, intensity });
    }
  }
});

function processBreakQueue() {
  if (breakQueue.size === 0) return;

  for (const { body, point, intensity } of breakQueue.values()) {
    const fragments = fractureBody(body, point, intensity);
    if (fragments.length === 0) continue;

    Composite.remove(engine.world, body);
    Composite.add(engine.world, fragments);

    const material = MATERIALS[body.materialName] ?? MATERIALS[config.material];
    effects.onBreak(point, intensity, material.particleColors);
  }

  breakQueue.clear();
}

function update(now) {
  requestAnimationFrame(update);

  const dt = Math.min(now - lastTime, 250); // Clamp tab-switch spikes
  lastTime = now;

  fpsCounter++;
  fpsTime += dt;
  if (fpsTime >= 500) {
    stats.fps = Math.round(fpsCounter / (fpsTime / 1000));
    fpsCounter = 0;
    fpsTime = 0;
  }

  if (!isPaused) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= PHYSICS_STEP_MS && steps < 5) {
      Engine.update(engine, PHYSICS_STEP_MS);
      processBreakQueue();
      steps++;
      accumulator -= PHYSICS_STEP_MS;
    }
    if (steps === 5) accumulator = 0; // Simulation can't keep up; drop time

    effects.update(dt, engine.timing.timeScale);
    stats.bodies = manageFragments(engine, now);
  }

  renderer.draw();
}

// Controls
const actions = {
  shootBoxes: () => shootBoxes(engine),
  clearWorld: () => {
    clearDynamicBodies(engine);
    effects.reset();
    breakQueue.clear();
  },
  togglePause: () => {
    isPaused = !isPaused;
    pauseController.updateDisplay();
  }
};

// lil-gui
const gui = new GUI({ title: 'voronoi-breakable' });

const spawnFolder = gui.addFolder('Spawn');
spawnFolder.add(config, 'material', MATERIAL_NAMES).name('Material');
spawnFolder.add(config, 'boxSize', 40, 220, 5).name('Box size');
spawnFolder.add(actions, 'shootBoxes').name('Shoot boxes');
spawnFolder.add(actions, 'clearWorld').name('Clear world');

const fractureFolder = gui.addFolder('Fracture');
fractureFolder.add(config, 'shardCount', 6, 80, 1).name('Shards');
fractureFolder.add(config, 'impactFocus', 0, 1, 0.05).name('Impact focus');
fractureFolder.add(config, 'breakSpeed', 1, 15, 0.5).name('Break threshold');
fractureFolder.add(config, 'recursiveBreaking').name('Recursive breaking');
fractureFolder.add(config, 'maxBreakDepth', 1, 4, 1).name('Max depth');

const effectsFolder = gui.addFolder('Effects');
effectsFolder.add(config, 'slowMotion').name('Slow motion');
effectsFolder.add(config, 'screenShake').name('Screen shake');
effectsFolder.add(config, 'particles').name('Particles');
effectsFolder.add(config, 'showWireframe').name('Wireframe');

const worldFolder = gui.addFolder('World');
worldFolder.add(config, 'gravityY', -2, 3, 0.1).name('Gravity')
  .onChange((v) => {
    engine.gravity.y = v;
  });

const pauseController = worldFolder.add({
  get paused() {
    return isPaused;
  },
  set paused(v) {
    isPaused = v;
  }

}, 'paused')
  .name('Pause [P]');

const statsFolder = gui.addFolder('Stats');
statsFolder.add(stats, 'bodies').name('Bodies').listen().disable();
statsFolder.add(stats, 'fps').name('FPS').listen().disable();
statsFolder.close();

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;

  switch (e.key.toLowerCase()) {
    case 'p':
      actions.togglePause();
      break;
    case 'r':
      actions.clearWorld();
      break;
    case 'b':
      actions.shootBoxes();
      break;
  }
});

shootBoxes(engine);
requestAnimationFrame(update);
