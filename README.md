voronoi-breakable WIP
========================
A demo utilizing [matter.js](https://github.com/liabru/matter-js) and voronoi diagrams to create a breakable rigid bodies simulation.
Using Voronoi library by gorhill https://github.com/gorhill/Javascript-Voronoi

The voronoi diagram is calculated on-the-fly in real-time, and the number of sites is randomized using a random point spray.

Obviously it's not the most efficient way to do that but for this purpose of this demo it is fast enough.

## Demo
[Live demo](https://topaz1008.github.io/voronoi-breakable/); it will shoot 2 boxes towards each other on load, but you can click the mouse anywhere to shoot more.

You can also pause/unpause using the `P` key.
