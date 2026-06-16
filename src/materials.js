import { chance, rand } from './utils.js';

/**
 * Material presets.
 *
 * Each material defines physics properties, a break threshold multiplier and a texture.
 * Textures are either loaded from an image file
 * or generated procedurally on an offscreen canvas.
 */
const TEX_SIZE = 256;

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEX_SIZE;

  return [canvas, canvas.getContext('2d')];
}

function createStoneTexture() {
  const [canvas, ctx] = createCanvas();

  const g = ctx.createLinearGradient(0, 0, TEX_SIZE, TEX_SIZE);
  g.addColorStop(0, '#8d8d95');
  g.addColorStop(0.5, '#75757d');
  g.addColorStop(1, '#64646c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Speckle noise
  for (let i = 0; i < 2600; i++) {
    const v = Math.floor(rand(0, 70));
    const light = chance();

    ctx.fillStyle = light
      ? `rgba(${160 + v}, ${160 + v}, ${168 + v}, 0.25)`
      : `rgba(${40 + v}, ${40 + v}, ${46 + v}, 0.25)`;

    ctx.fillRect(rand(0, 1) * TEX_SIZE, rand(0, 1) * TEX_SIZE, 2, 2);
  }

  // A few faint veins
  ctx.strokeStyle = 'rgba(35, 35, 40, 0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = rand(0, 1) * TEX_SIZE;
    let y = rand(0, 1) * TEX_SIZE;
    ctx.moveTo(x, y);

    for (let j = 0; j < 5; j++) {
      x += rand(0, 0.5) * 90;
      y += rand(0, 0.5) * 90;
      ctx.lineTo(x, y);
    }

    ctx.stroke();
  }

  return canvas;
}

function createWoodTexture() {
  const [canvas, ctx] = createCanvas();

  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Vertical grain with a sine wobble
  for (let x = 0; x < TEX_SIZE; x += 3) {
    const shade = 18 * Math.sin(x * 0.22) + rand(0, 0.5) * 14;

    ctx.fillStyle = `rgb(` +
      `${Math.round(132 + shade)}, ` +
      `${Math.round(86 + shade * 0.7)}, ` +
      `${Math.round(42 + shade * 0.4)})`;

    ctx.fillRect(x, 0, 3, TEX_SIZE);
  }

  // Dark grain lines
  ctx.strokeStyle = 'rgba(70, 42, 16, 0.5)';
  for (let i = 0; i < 14; i++) {
    const x0 = rand(0, 1) * TEX_SIZE;
    ctx.lineWidth = 1 + rand(0, 1) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, 0);

    for (let y = 0; y <= TEX_SIZE; y += 16) {
      ctx.lineTo(x0 + Math.sin(y * 0.05 + i) * 6, y);
    }

    ctx.stroke();
  }

  // Knot
  ctx.strokeStyle = 'rgba(60, 36, 14, 0.6)';
  ctx.lineWidth = 2;
  const kx = TEX_SIZE * rand(0.3, 0.7);
  const ky = TEX_SIZE * rand(0.3, 0.7);
  for (let r = 4; r < 22; r += 5) {
    ctx.beginPath();
    ctx.ellipse(kx, ky, r, r * 1.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas;
}

function createGlassTexture() {
  const [canvas, ctx] = createCanvas();

  const g = ctx.createLinearGradient(0, 0, TEX_SIZE, TEX_SIZE);
  g.addColorStop(0, '#bfeef7');
  g.addColorStop(0.45, '#8fd4e8');
  g.addColorStop(0.55, '#aee4f2');
  g.addColorStop(1, '#79c2dc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Diagonal light streaks
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  for (const [offset, width] of [[-40, 26], [60, 12], [130, 40], [220, 8]]) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset + width, 0);
    ctx.lineTo(offset + width - TEX_SIZE * 0.6, TEX_SIZE);
    ctx.lineTo(offset - TEX_SIZE * 0.6, TEX_SIZE);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  return canvas;
}

function loadImage(url) {
  const img = new Image();
  img.src = url;

  return img;
}

export const MATERIALS = {
  checkers: {
    label: 'Checkers',
    texture: loadImage('./sprites/checkers.png'),
    restitution: 0.35,
    friction: 0.1,
    density: 0.0012,
    breakSpeedScale: 1.0, // Multiplies config.breakSpeed
    edgeColor: '#16161c',
    alpha: 1,
    particleColors: ['#e8e4d8', '#b9b4a4', '#8f8a7c']
  },
  stone: {
    label: 'Stone',
    texture: createStoneTexture(),
    restitution: 0.18,
    friction: 0.45,
    density: 0.002,
    breakSpeedScale: 1.4,
    edgeColor: '#2c2c33',
    alpha: 1,
    particleColors: ['#a8a8b0', '#7d7d85', '#55555c']
  },
  wood: {
    label: 'Wood',
    texture: createWoodTexture(),
    restitution: 0.3,
    friction: 0.4,
    density: 0.0008,
    breakSpeedScale: 1.0,
    edgeColor: '#3a2410',
    alpha: 1,
    particleColors: ['#c89a5b', '#8a5a2b', '#5c3a18']
  },
  glass: {
    label: 'Glass',
    texture: createGlassTexture(),
    restitution: 0.1,
    friction: 0.05,
    density: 0.0015,
    breakSpeedScale: 0.45, // Glass shatters easily
    edgeColor: '#e9fbff',
    alpha: 0.82,
    particleColors: ['#e9fbff', '#aee4f2', '#79c2dc']
  }
};

export const MATERIAL_NAMES = Object.keys(MATERIALS);
