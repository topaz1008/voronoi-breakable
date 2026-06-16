/**
 * World setup and body management: engine, static bounds, the breakable box
 * factory and fragment lifecycle (fade-out + hard body cap).
 */
import Matter from 'matter-js';

import { VIEW_WIDTH, VIEW_HEIGHT, config } from './config.js';
import { MATERIALS } from './materials.js';

const { Engine, Bodies, Body, Composite, Common, Vector } = Matter;

export function createEngine() {
  return Engine.create({
    enableSleeping: true,
    gravity: {
      x: 0,
      y: config.gravityY,
      scale: 0.001
    }
  });
}

export function addBounds(engine) {
  const wallOptions = {
    isStatic: true,
    friction: 0.6
  };
  const ground = Bodies.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT + 20, VIEW_WIDTH + 200, 80, wallOptions);
  const leftWall = Bodies.rectangle(-15, VIEW_HEIGHT / 2, 60, VIEW_HEIGHT * 2, wallOptions);
  const rightWall = Bodies.rectangle(VIEW_WIDTH + 15, VIEW_HEIGHT / 2, 60, VIEW_HEIGHT * 2, wallOptions);

  Composite.add(engine.world, [ground, leftWall, rightWall]);
}

export function createBreakableBox(x, y, materialName = config.material, size = config.boxSize) {
  const material = MATERIALS[materialName];
  const box = Bodies.rectangle(x, y, size, size, {
    restitution: material.restitution,
    friction: material.friction,
    frictionAir: 0.001,
    density: material.density
  });

  Body.setAngle(box, Common.random(0, 2 * Math.PI));

  box.isBreakable = true;
  box.materialName = materialName;
  box.breakDepth = 0;
  box.texInfo = {
    texture: material.texture,
    size: size,
    offset: { x: 0, y: 0 }
  };

  return box;
}

export function shootBoxes(engine) {
  // Spawn inside the viewport with enough margin to clear the walls
  const margin = config.boxSize * 0.75 + 15;
  const left = createBreakableBox(margin, Common.random(80, 220));
  const right = createBreakableBox(VIEW_WIDTH - margin, Common.random(80, 220));

  Body.setVelocity(left, Vector.create(Common.random(14, 20), Common.random(-2, 1)));
  Body.setVelocity(right, Vector.create(-Common.random(14, 20), Common.random(-2, 1)));

  Body.setAngularVelocity(left, Common.random(0.06, 0.18) * Common.choose([-1, 1]));
  Body.setAngularVelocity(right, Common.random(0.06, 0.18) * Common.choose([-1, 1]));

  Composite.add(engine.world, [left, right]);
}

export function clearDynamicBodies(engine) {
  // keepStatic = true keeps the ground and walls.
  Composite.clear(engine.world, true, true);
}

/**
 * Fragment lifecycle, runs once per frame:
 *  - Small fragments fade out after 'fragmentLifetimeMs' and get removed.
 *  - A hard cap on dynamic bodies removes the oldest/smallest fragments first,
 *    keeping the simulation stable no matter how much gets broken.
 */
export function manageFragments(engine, now) {
  const bodies = Composite.allBodies(engine.world);
  const fragments = [];
  let dynamicCount = 0;

  for (const body of bodies) {
    if (body.isStatic) continue;
    dynamicCount++;
    if (!body.isFragment) continue;

    fragments.push(body);

    const isSmall = body.cachedArea < config.smallFragmentArea;
    const expired = (now - body.bornAt) > config.fragmentLifetimeMs;
    if (isSmall && expired && body.fadeStart === undefined) {
      body.fadeStart = now;
      body.collisionFilter.mask = 0; // Stop colliding while fading
    }

    if (body.fadeStart !== undefined && (now - body.fadeStart) > 1500) {
      Composite.remove(engine.world, body);
      dynamicCount--;
    }
  }

  // Hard cap: drop the smallest, oldest fragments first.
  if (dynamicCount > config.maxBodies) {
    fragments.sort((a, b) => (a.cachedArea - b.cachedArea) || (a.bornAt - b.bornAt));

    let excess = dynamicCount - config.maxBodies;

    for (const fragment of fragments) {
      if (excess <= 0) break;
      if (fragment.fadeStart === undefined) {
        fragment.fadeStart = now - 1200; // Quick fade
        fragment.collisionFilter.mask = 0;
        excess--;
      }
    }
  }

  return dynamicCount;
}
