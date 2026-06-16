/**
 * Voronoi fracture.
 *
 * Replaces the old gorhill Javascript-Voronoi implementation with d3-delaunay.
 *
 * Fixes over the original implementation:
 *  - Fragments are placed rotation-aware: cells are computed in the body's
 *    local frame and centroids are rotated by 'body.angle' before being
 *    translated to world space, so a rotated body breaks in place.
 *
 *  - Velocities are applied with 'Body.setVelocity()' (direct mutation of
 *    'body.velocity' is ignored by matter's Verlet integrator).
 *
 *  - Each fragment gets the physically correct velocity of its material point:
 *    v_frag = v_body + omega x r, plus a small outward burst scaled by impact
 *    intensity.
 *
 *  - Cells are clipped (Sutherland-Hodgman) against the body's actual polygon,
 *    so non-rectangular bodies - i.e. fragments being re-broken - fracture
 *    into their true shape instead of their bounding box.
 *    @link https://en.wikipedia.org/wiki/Sutherland-Hodgman_algorithm
 *
 *  - Sliver cells are discarded by minimum area, and fragment mass comes from
 *    density instead of an even mass split.
 *
 *  - Voronoi sites are clustered around the impact point for a radial shatter
 *    pattern ('config.impactFocus' controls the ratio).
 */
import Matter from 'matter-js';
import { Delaunay } from 'd3-delaunay';

import { config, BOX_SIZE } from './config.js';
import { MATERIALS } from './materials.js';
import { rand } from './utils.js';

const { Body, Vector, Vertices, Common } = Matter;

function rotateVec(v, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos
  };
}

/**
 * Sutherland-Hodgman polygon clipping. 'clipPoly' must be convex
 * (Voronoi cells and matter rectangle bodies always are).
 */
function clipPolygon(subject, clipPoly) {
  // Signed area determines the winding of the clip polygon so the
  // inside-test works for both CW (matter convention) and CCW input.
  let signedArea = 0;
  for (let i = 0; i < clipPoly.length; i++) {
    const a = clipPoly[i];
    const b = clipPoly[(i + 1) % clipPoly.length];

    signedArea += (a.x * b.y - b.x * a.y);
  }

  const sign = (signedArea >= 0) ? 1 : -1;

  let output = subject;
  for (let i = 0; i < clipPoly.length; i++) {
    const a = clipPoly[i];
    const b = clipPoly[(i + 1) % clipPoly.length];

    const input = output;
    output = [];
    if (input.length === 0) break;

    const ex = b.x - a.x, ey = b.y - a.y;
    const isInside = (p) => sign * (ex * (p.y - a.y) - ey * (p.x - a.x)) >= 0;

    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const pIn = isInside(p);
      const qIn = isInside(q);

      if (pIn) output.push(p);
      if (pIn !== qIn) {
        // Segment p->q crosses the clip edge; add the intersection.
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const denominator = ex * dy - ey * dx;
        if (Math.abs(denominator) < 1e-9) continue;

        const t = (ex * (p.y - a.y) - ey * (p.x - a.x)) / -denominator;
        output.push({ x: p.x + t * dx, y: p.y + t * dy });
      }
    }
  }

  return output;
}

/**
 * Breaks 'body' into Voronoi fragments.
 *
 * @param body          The matter body to fracture (removed by the caller).
 * @param impactPoint   World-space contact point (cells cluster around it).
 * @param intensity     0..1 - how far above the break threshold the impact was.
 * @returns {Matter.Body[]} The fragment bodies
 */
export function fractureBody(body, impactPoint, intensity) {
  const angle = body.angle;
  const position = body.position;
  const material = MATERIALS[body.materialName] ?? MATERIALS[config.material];

  // Transform the body's polygon into its local (unrotated) frame.
  const toLocal = (p) => rotateVec({ x: p.x - position.x, y: p.y - position.y }, -angle);
  const localPoly = body.vertices.map(toLocal);

  // Local-frame bounding box.
  let xl = Infinity,
    xr = -Infinity,
    yt = Infinity,
    yb = -Infinity;
  for (const v of localPoly) {
    if (v.x < xl) xl = v.x;
    if (v.x > xr) xr = v.x;
    if (v.y < yt) yt = v.y;
    if (v.y > yb) yb = v.y;
  }

  const width = xr - xl;
  const height = yb - yt;
  if (width < 4 || height < 4) return [];

  // Impact point in local frame, clamped into the bbox.
  const impactLocal = impactPoint
    ? toLocal(impactPoint)
    : { x: (xl + xr) * 0.5, y: (yt + yb) * 0.5 };

  impactLocal.x = Common.clamp(impactLocal.x, xl, xr);
  impactLocal.y = Common.clamp(impactLocal.y, yt, yb);

  // Random point spray: a fraction clustered around the impact point
  // (power-law radius for density near the center) and the rest uniform.
  // The site count scales with body area so re-breaking a small fragment
  // yields a few clean pieces instead of dozens of filtered-out slivers.
  const bodyArea = Math.abs(Vertices.area(localPoly, true));
  const areaRatio = bodyArea / (BOX_SIZE * BOX_SIZE);
  const siteCount = Common.clamp(Math.round(config.shardCount * areaRatio), 5, 80);
  const clusterCount = Math.round(siteCount * config.impactFocus);
  const clusterRadius = Math.max(width, height) * 0.5;
  const sites = [];

  for (let i = 0; i < siteCount; i++) {
    let x, y;
    if (i < clusterCount) {
      const theta = rand(0, 1) * Math.PI * 2;
      const r = Math.pow(rand(0, 1), 2.2) * clusterRadius;
      x = Common.clamp(impactLocal.x + Math.cos(theta) * r, xl, xr);
      y = Common.clamp(impactLocal.y + Math.sin(theta) * r, yt, yb);

    } else {
      x = Common.random(xl, xr);
      y = Common.random(yt, yb);
    }

    sites.push([x, y]);
  }

  const delaunay = Delaunay.from(sites);
  const voronoi = delaunay.voronoi([xl, yt, xr, yb]);

  const fragments = [];
  for (let i = 0; i < sites.length; i++) {
    const cell = voronoi.cellPolygon(i);
    if (!cell || cell.length < 4) continue; // Closed ring: 3 vertices + repeat

    // Drop the closing point and clip against the body's true polygon so
    // fragments of fragments keep their real shape (not the bbox).
    let vertices = cell.slice(0, -1).map(([x, y]) => ({ x, y }));
    vertices = clipPolygon(vertices, localPoly);
    if (vertices.length < 3) continue;

    const area = Math.abs(Vertices.area(vertices, true));
    if (area < config.minCellArea) continue;

    // World position of this fragment: rotate the local centroid by the
    // body's angle, then translate by the body's position.
    const centroidLocal = Vertices.centre(vertices);
    const worldPosition = Vector.add(position, rotateVec(centroidLocal, angle));

    const fragment = Body.create({
      vertices: vertices,
      restitution: material.restitution,
      friction: material.friction,
      frictionAir: 0.001,
      density: body.density,
      sleepThreshold: 30
    });
    Body.setPosition(fragment, worldPosition);
    Body.setAngle(fragment, angle);

    // v_frag = v_body + omega x r  (2D cross: omega * (-ry, rx)),
    // plus an outward burst away from the impact point.
    const r = Vector.sub(worldPosition, position);
    const velocity = {
      x: body.velocity.x - body.angularVelocity * r.y,
      y: body.velocity.y + body.angularVelocity * r.x
    };
    if (impactPoint) {
      const away = Vector.sub(worldPosition, impactPoint);
      const distance = Math.max(Vector.magnitude(away), 1);
      const falloff = 1 / (1 + distance * 0.04);
      const burst = (1 + intensity * 4) * falloff;
      velocity.x += (away.x / distance) * burst + Common.random(-0.4, 0.4);
      velocity.y += (away.y / distance) * burst + Common.random(-0.4, 0.4);
    }

    Body.setVelocity(fragment, velocity);
    Body.setAngularVelocity(fragment, body.angularVelocity + Common.random(-0.08, 0.08) * (1 + intensity));

    // Texture mapping: the fragment's local frame is parallel to the
    // parent's local frame at creation time, so texture-space offsets
    // accumulate down the recursion chain.
    if (body.texInfo) {
      fragment.texInfo = {
        texture: body.texInfo.texture,
        size: body.texInfo.size,
        offset: Vector.add(body.texInfo.offset, centroidLocal)
      };
    }

    fragment.materialName = body.materialName;
    fragment.isFragment = true;
    fragment.breakDepth = (body.breakDepth ?? 0) + 1;
    fragment.bornAt = performance.now();
    fragment.cachedArea = area;
    fragment.shade = Common.random(-0.14, 0.1);
    fragment.isBreakable = config.recursiveBreaking
      && fragment.breakDepth < config.maxBreakDepth
      && area >= config.minBreakArea;

    fragments.push(fragment);
  }

  return fragments;
}
