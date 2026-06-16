import { config, PHYSICS_STEP_MS } from './config.js';
import { chance, rand } from './utils.js';

/**
 * Visual effects: impact particles, screen shake and slow motion.
 * Particles are plain objects drawn by the renderer, not physics bodies.
 */
const MAX_PARTICLES = 600;

export class Effects {

  constructor(engine) {
    this.engine = engine;
    this.particles = [];
    this.screenShakeScale = 0; // Screen shake "energy", decays each frame
    this.slowmoTimer = 0;      // Remaining slow motion time (ms)
    this.shakeOffset = { x: 0, y: 0 };
    this.slowmoDuration = 0;
  }

  // Called once per break with the impact point and 0..1 intensity.
  onBreak(point, intensity, colors) {
    if (config.particles && point) {
      this.#spawnParticles(point, intensity, colors);
    }
    if (config.screenShake) {
      this.screenShakeScale = Math.min(1, this.screenShakeScale + 0.25 + intensity * 0.45);
    }
    if (config.slowMotion && intensity > 0.35) {
      this.slowmoDuration = 700 + intensity * 800;
      this.slowmoTimer = this.slowmoDuration;
      this.engine.timing.timeScale = 0.15;
    }
  }

  update(dt, simScale) {
    // Slow motion eases back to real time.
    if (this.slowmoTimer > 0) {
      this.slowmoTimer -= dt;
      if (this.slowmoTimer <= 0) {
        this.engine.timing.timeScale = 1;

      } else {
        const t = 1 - (this.slowmoTimer / this.slowmoDuration); // 0 -> 1
        this.engine.timing.timeScale = 0.15 + (1 - 0.15) * (t * t);
      }
    }

    // Screen shake.
    this.screenShakeScale = Math.max(0, this.screenShakeScale - dt * 0.0016);
    const magnitude = this.screenShakeScale * this.screenShakeScale * 14;
    this.shakeOffset.x = rand(-1, 1) * magnitude;
    this.shakeOffset.y = rand(-1, 1) * magnitude;

    // Particles advance in simulation time so slow motion affects them too.
    const simDt = dt * simScale;
    const step = simDt / PHYSICS_STEP_MS;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += simDt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vy += (p.dust ? 0.05 : 0.18) * step; // Gravity
      p.vx *= Math.pow(p.dust ? 0.96 : 0.99, step);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = (1 - t) * (p.dust ? 0.5 : 0.9);
      ctx.fillStyle = p.color;

      const size = p.size * (p.dust ? (1 + t * 1.5) : (1 - t * 0.5));
      ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);
      // ctx.beginPath();
      // ctx.arc(p.x, p.y, size, 0, 2 * Math.PI);
      // ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  reset() {
    this.particles.length = 0;
    this.screenShakeScale = 0;
    this.slowmoTimer = 0;
    this.engine.timing.timeScale = 1;
  }

  #spawnParticles(point, intensity, colors) {
    const count = Math.round(14 + intensity * 36);
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES)
        this.particles.shift();

      const theta = rand(0, 1) * Math.PI * 2;
      const speed = rand(1, 6) * (0.6 + intensity);
      const dust = chance(0.45);

      this.particles.push({
        x: point.x,
        y: point.y,
        vx: Math.cos(theta) * speed,
        vy: Math.sin(theta) * speed - rand(0, 2),
        life: 0,
        maxLife: dust ? rand(900, 1800) : rand(300, 750),
        size: dust ? rand(2, 6) : rand(1, 3),
        color: colors[Math.floor(rand(0, colors.length))],
        dust: dust
      });
    }
  }
}
