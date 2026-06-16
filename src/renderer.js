/**
 * Custom canvas renderer (replaces Matter.Render).
 *
 * Why custom: Matter.Render can't texture-map arbitrary polygons. Here each
 * body carries a 'texInfo' describing where it sits inside the original
 * texture, and the renderer clips the body's polygon and draws the texture
 * through it - so every shard shows its own piece of the original image and
 * the pieces visually "reassemble" the unbroken body.
 *
 * Also renders at devicePixelRatio so it is crisp on high-DPI displays.
 */
import Matter from 'matter-js';

import { VIEW_WIDTH, VIEW_HEIGHT, config } from './config.js';
import { MATERIALS } from './materials.js';

const { Composite } = Matter;

const BACKGROUND_TOP_COLOR = '#23232b';
const BACKGROUND_BOTTOM_COLOR = '#17171d';
const STATIC_FILL_COLOR = '#3a3a44';

export class Renderer {

  constructor(container, engine, effects) {
    this.engine = engine;
    this.effects = effects;
    this.aim = null; // { from: {x,y}, to: {x,y} } while dragging

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);

    this.#resize();
    window.addEventListener('resize', () => this.#resize());
  }

  draw() {
    const ctx = this.ctx;
    const now = performance.now();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, BACKGROUND_TOP_COLOR);
    gradient.addColorStop(1, BACKGROUND_BOTTOM_COLOR);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Screen shake
    const shake = this.effects.shakeOffset;
    ctx.translate(shake.x, shake.y);

    const bodies = Composite.allBodies(this.engine.world);
    for (const body of bodies) {
      if (body.isStatic) {
        this.#drawStatic(ctx, body);

      } else {
        this.#drawBody(ctx, body, now);
      }
    }

    this.effects.draw(ctx);

    if (this.aim)
      this.#drawAim(ctx, this.aim);
  }

  #resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = VIEW_WIDTH * dpr;
    this.canvas.height = VIEW_HEIGHT * dpr;
    this.canvas.style.aspectRatio = `${VIEW_WIDTH} / ${VIEW_HEIGHT}`;
    this.dpr = dpr;
  }

  #path(ctx, vertices) {
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
  }

  #drawStatic(ctx, body) {
    this.#path(ctx, body.vertices);
    ctx.fillStyle = STATIC_FILL_COLOR;
    ctx.fill();
  }

  #drawBody(ctx, body, now) {
    const material = MATERIALS[body.materialName] ?? null;

    // Fade-out for small, aging fragments (renderer side; removal is in main).
    let alpha = material?.alpha ?? 1;
    if (body.fadeStart !== undefined) {
      const t = (now - body.fadeStart) / 1500;
      alpha *= Math.max(0, 1 - t);
    }

    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    this.#path(ctx, body.vertices);

    if (config.showWireframe) {
      ctx.strokeStyle = '#9fd1ff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      return;
    }

    const tex = body.texInfo;
    const textureReady = tex && (!(tex.texture instanceof HTMLImageElement) || tex.texture.complete);

    if (textureReady) {
      ctx.clip();

      // Draw the texture in the body's current local frame. The texture
      // spans [-size/2, size/2] in the original body's local frame;
      // 'tex.offset' is this fragment's centroid in that frame.
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);
      ctx.drawImage(
        tex.texture,
        -tex.size * 0.5 - tex.offset.x,
        -tex.size * 0.5 - tex.offset.y,
        tex.size, tex.size
      );
      ctx.rotate(-body.angle);
      ctx.translate(-body.position.x, -body.position.y);

      // Per-shard shade overlay.
      if (body.shade) {
        ctx.fillStyle = (body.shade < 0)
          ? `rgba(0, 0, 0, ${-body.shade})`
          : `rgba(255, 255, 255, ${body.shade})`;
        ctx.fillRect(body.bounds.min.x, body.bounds.min.y,
          body.bounds.max.x - body.bounds.min.x,
          body.bounds.max.y - body.bounds.min.y);
      }

    } else {
      ctx.fillStyle = body.fillColor ?? '#cfcfcf';
      ctx.fill();
    }

    ctx.restore();

    // Edge stroke.
    ctx.save();
    ctx.globalAlpha = alpha;
    this.#path(ctx, body.vertices);
    ctx.strokeStyle = material?.edgeColor ?? '#16161c';
    ctx.lineWidth = body.isFragment ? 1 : 2;
    ctx.stroke();
    ctx.restore();
  }

  #drawAim(ctx, aim) {
    const { from, to } = aim;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - 14 * Math.cos(angle - 0.45), to.y - 14 * Math.sin(angle - 0.45));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - 14 * Math.cos(angle + 0.45), to.y - 14 * Math.sin(angle + 0.45));
    ctx.stroke();

    // Spawn marker
    ctx.beginPath();
    ctx.arc(from.x, from.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
