voronoi-breakable
========================

Breakable rigid bodies simulation using Voronoi diagrams.

Built with the [matter.js](https://github.com/liabru/matter-js) physics engine and [d3-delaunay](https://github.com/d3/d3-delaunay)
for computing Voronoi diagrams on the fly.

On every qualifying impact the body is fractured in real time: Voronoi sites are
sprayed across the body in its local frame, clustered around the contact point for a
radial shatter pattern, and each cell becomes a new rigid body that inherits the
velocity of its material point (`v + ω × r`). Fragments are
texture-mapped so the shards visually reassemble the original body, and large
fragments can break again recursively.

## Demo

[Live demo](https://topaz1008.github.io/voronoi-breakable/) — two boxes are shot at each other on load.

Controls:

* **Click** the canvas to drop a box.
* **drag** to aim and launch one.
* `B` shoot boxes, `R` reset, `P` pause.
* The panel (top right) controls material (checkers / stone / wood / glass),
  shard count, impact focus, break threshold, recursion, slow motion, screen
  shake, particles and gravity.
