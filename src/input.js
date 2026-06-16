/**
 * Pointer input.
 *  - Click: drop a box at the pointer.
 *  - Drag: aim - a box spawns at the drag start and launches along the drag
 *    vector with power proportional to its length.
 */
import Matter from 'matter-js';
import { VIEW_WIDTH, VIEW_HEIGHT } from './config.js';
import { createBreakableBox } from './world.js';
import { chance } from './utils.js';

const { Body, Composite, Vector } = Matter;

const CLICK_THRESHOLD = 10;  // px of movement below which a drag counts as a click
const POWER_SCALE = 0.055;   // Drag length -> launch speed
const MAX_SPEED = 26;

export function setupInput(canvas, engine, renderer) {
  let dragStart = null;

  const toWorld = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * VIEW_WIDTH,
      y: (e.clientY - rect.top) / rect.height * VIEW_HEIGHT
    };
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    dragStart = toWorld(e);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragStart) return;
    const current = toWorld(e);
    renderer.aim = (Vector.magnitude(Vector.sub(current, dragStart)) > CLICK_THRESHOLD)
      ? { from: dragStart, to: current }
      : null;
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!dragStart) return;

    const end = toWorld(e);
    const drag = Vector.sub(end, dragStart);
    const distance = Vector.magnitude(drag);

    const box = createBreakableBox(dragStart.x, dragStart.y);
    if (distance > CLICK_THRESHOLD) {
      const speed = Math.min(distance * POWER_SCALE, MAX_SPEED);
      Body.setVelocity(box, Vector.mult(Vector.normalise(drag), speed));

      // Spin scales with launch power.
      Body.setAngularVelocity(box, (speed / MAX_SPEED) * 0.18 * (chance() ? -1 : 1));
    }

    Composite.add(engine.world, box);

    dragStart = null;
    renderer.aim = null;
  });

  canvas.addEventListener('pointercancel', () => {
    dragStart = null;
    renderer.aim = null;
  });
}
