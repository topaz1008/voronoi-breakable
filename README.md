voronoi-breakable WIP
========================

Breakable rigid bodies simulation using Voronoi diagrams.

Using [matter.js](https://github.com/liabru/matter-js) physics engine and [Javascript-Voronoi](https://github.com/gorhill/Javascript-Voronoi) library by gorhill for calculating the voronoi diagram. 

The voronoi diagram is calculated on-the-fly in real-time, and the number of sites is randomized using a random point spray.

Obviously it's not the most efficient way to do that but for this purpose of this demo it is fast enough.

NOTE: This demo is just a simple poc tech demo, might invest more in the future to make this code better written.
but for the time being this is just a research/poc/educational project.

## Demo
[Live demo](https://topaz1008.github.io/voronoi-breakable/); it will shoot 2 boxes towards each other on load, but you can click the mouse anywhere to shoot more.

You can also pause/unpause using the `P` key.
