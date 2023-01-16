// matter aliases for easier access
const Engine = Matter.Engine,
    Render = Matter.Render,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Events = Matter.Events,
    Common = Matter.Common,
    Vector = Matter.Vector,
    Composite = Matter.Composite;

// CVars
const WIREFRAME = false,
    PAUSE_ON_IMPACT = false,
    PAUSE_ON_PREIMPACT = true;

// Add a debug canvas? (separate canvas added to the DOM)
// It will draw vertices and shapes for all bodies that are currently in the world.
const DEBUG_CANVAS = false;

const VIEW_WIDTH = 1280,
    VIEW_HEIGHT = 720,
    BOX_SIZE = 100, // Box size (in pixels)
    BOX_MASS = 100;

let isPaused = false;
let animationFrameHandle = null;

const engineOptions = {
    enableSleeping: true,
    gravity: {
        x: 0,
        y: 1.2,
        scale: 0.001
    }
};

// Create the engine
const engine = Engine.create(engineOptions);

// Voronoi object
const voronoi = new Voronoi();

// Create the renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        background: '#3d3d3d',
        width: VIEW_WIDTH,
        height: VIEW_HEIGHT,
        wireframes: WIREFRAME,
        showAngleIndicator: false,
        showDebug: false,
        showBounds: false,
        showVelocity: false,
        showCollisions: false,
        showSeparations: false,
        showAxes: false,
        showPositions: false
    }
});

const ground = Bodies.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT + 10, VIEW_WIDTH + 10, 60, { isStatic: true });
const leftWall = Bodies.rectangle(-10, VIEW_HEIGHT, 60, 400, { isStatic: true });
const rightWall = Bodies.rectangle(VIEW_WIDTH + 10, VIEW_HEIGHT, 60, 400, { isStatic: true });

// Add bodies to the world
Composite.add(engine.world, [ground, leftWall, rightWall]);

document.addEventListener('click', () => {
    if (!isPaused) {
        // Reset timescale, clear the world and re-add bodies.
        engine.timing.timeScale = 1;
        Composite.clear(engine.world, true, true);
        shootBoxes();

    } else {
        unpause();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'p') {
        (isPaused) ? unpause() : pause();
    }

}, false);

function update() {
    if (isPaused) return;

    Engine.update(engine);

    animationFrameHandle = requestAnimationFrame(update);
}

Events.on(engine.world, 'afterAdd', (e) => {

});

Events.on(engine, 'beforeUpdate', (e) => {
    const engine = e.source;
});

// Collision events
Events.on(engine, 'collisionStart', (e) => {
    // Get the body pairs involved in the collision
    const pairs = e.pairs;
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const a = pair.bodyA;
        const b = pair.bodyB;
        if (a.isStatic || b.isStatic) continue;

        let broken = false;
        // if (PAUSE_ON_PREIMPACT) { return pause(); }

        if (a && a.isBreakable) {
            voronoiBreakBody(a);
            // slowmo(0.25, 2500);
            broken = true;
        }
        if (b && b.isBreakable) {
            voronoiBreakBody(b);
            // slowmo(0.1);
            broken = true;
        }

        if (broken && PAUSE_ON_IMPACT) {
            pause();
        }
    }
});

Events.on(engine, 'collisionActive', (e) => {

});

Events.on(engine, 'collisionEnd', (e) => {

});

function voronoiBreakBody(body) {
    const pieces = voronoiBreakPoly(body);

    // const newBody = Body.create({
    //     position: body.position,
    //     // position: Vector.add(body.position, Vector.create(150, 150)),
    //     render: {
    //         fillStyle: '#ffffff'
    //     }
    // });
    for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];

        let n = Vector.sub(body.position, p.position);
        n = Vector.mult(n, -body.angularVelocity * Vector.magnitude(n) * Common.random(1, 4));

        p.velocity.x += n.x;
        p.velocity.y += n.y;

        Body.setMass(p, body.mass / pieces.length);
        Composite.add(engine.world, p);
    }

    // Body.setParts(newBody, pieces);

    // body.render.fillStyle = '#fff';

    Composite.remove(engine.world, body);
    // Composite.add(engine.world, newBody);
}

function voronoiBreakPoly(body) {
    // A random point spray
    const sites = [];
    const sitesCount = Math.round(Common.random(90, 125));
    // const sitesCount = 125;
    for (let i = 0; i < sitesCount; ++i) {
        // const p = Vector.create(Common.random(0, BOX_SIZE), Common.random(0, BOX_SIZE));
        const p = Vector.create(
            Common.random(-BOX_SIZE * 0.5, BOX_SIZE * 0.5),
            Common.random(-BOX_SIZE * 0.5, BOX_SIZE * 0.5)
        );
        sites.push(p);
    }
    const bbox = {
        xl: -BOX_SIZE * 0.5,
        xr: BOX_SIZE * 0.5,
        yt: -BOX_SIZE * 0.5,
        yb: BOX_SIZE * 0.5
    };
    // const bbox = {
    //     xl: 0,
    //     xr: BOX_SIZE,
    //     yt: 0,
    //     yb: BOX_SIZE
    // };

    // Generate the voronoi diagram
    const diagram = voronoi.compute(sites, bbox);
    if (!diagram) return [];

    const result = [];
    for (let i = 0; i < sites.length; i++) {
        // Get cell
        const cell = diagram.cells[sites[i].voronoiId];
        if (!cell) continue;

        const halfEdges = cell.halfedges,
            length = halfEdges.length;
        if (length <= 2) continue;

        // Get all this cell's edges
        const vertices = [];
        for (let j = 0; j < length; j++) {
            const v = halfEdges[j].getEndpoint();
            // vertices.push(Vector.add(v, Vector.sub(body.positionPrev, body.position)));
            vertices.push(v);
        }

        // Create bodies from all the pieces
        const cellSite = cell.site;
        const render = body.render;
        const b = Body.create({
            // position: Vector.add(cellSite, Vector.sub(body.position, cellSite)),
            position: Vector.add(cellSite, body.position),
            vertices: vertices,
            restitution: 0.75,
            render: {
                fillStyle: render.fillStyle,
                strokeStyle: render.strokeStyle,
                lineWidth: render.lineWidth
            }
        });
        Body.setVelocity(b, body.velocity);
        Body.setAngle(b, body.angle);
        Body.setAngularVelocity(b, body.angularVelocity);
        // const pos = Vector.add(cellSite, body.position);
        // const b = Bodies.fromVertices(pos.x, pos.y, vertices);

        Body.setCentre(b, Vector.create(0, 0), true);
        // Body.rotate(b, body.angle);

        result.push(b);
    }

    // Recycle for next use
    voronoi.recycle();

    return result;
}

function slowmo(scale, time) {
    engine.timing.timeScale = scale;
    setTimeout(() => {
        engine.timing.timeScale = 1;

    }, time || 2500);
}

function getBodyOptions(texture, fillStyle) {
    return {
        friction: 0.1,
        frictionAir: 0.001,
        frictionStatic: 1,
        restitution: 0,
        angularVelocity: 0,
        render: {
            fillStyle: fillStyle || '#ffffff',
            strokeStyle: '#000',
            lineWidth: 2,
            sprite: {
                // texture: texture,
                // xScale: BOX_SCALE,
                // yScale: BOX_SCALE
            }
        }
    };
}

function shootBoxes() {
    // Left and right boxes
    const leftBox = createBreakableBox(-50, Common.random(50, 150), '#b91717');
    const rightBox = createBreakableBox(VIEW_WIDTH + 50, Common.random(50, 150), '#2432c0');

    const position1 = Vector.create(0, 0);
    const force1 = Vector.mult(Vector.normalise(Vector.create(Common.random(0, 1), 0)), Common.random(6, 9));

    const position2 = Vector.create(0, 0);
    const force2 = Vector.mult(Vector.normalise(Vector.create(Common.random(0, -1), 0)), Common.random(6, 9));

    Body.applyForce(leftBox, position1, force1);
    Body.applyForce(rightBox, position2, force2);

    // Add to composite
    Composite.add(engine.world, [leftBox, rightBox]);
}

function createBreakableBox(x, y, fillStyle) {
    const boxOptions = getBodyOptions('./sprites/checkers.png', fillStyle);
    const box = Bodies.rectangle(x, y, BOX_SIZE, BOX_SIZE, boxOptions);

    box.isBreakable = true;

    // Set parameters
    // Body.scale(box, BOX_SCALE, BOX_SCALE);

    Body.setCentre(box, Vector.create(0, 0), true);
    Body.setAngle(box, Common.random(0, 2 * Math.PI));
    Body.setMass(box, BOX_MASS);

    return box;
}

function pause() {
    isPaused = true;
    cancelAnimationFrame(animationFrameHandle);
    animationFrameHandle = null;
}

function unpause() {
    isPaused = false;
    if (animationFrameHandle === null) {
        animationFrameHandle = requestAnimationFrame(update);
    }
}

// Look at viewport
Render.lookAt(render, {
    min: { x: 0, y: 0 },
    // min: { x: -200, y: -200 },
    max: { x: VIEW_WIDTH, y: VIEW_HEIGHT }
});

shootBoxes();

// Run the renderer
Render.run(render);

animationFrameHandle = requestAnimationFrame(update);

function randomVec2(min, max) {
    const x = Common.random(min, max);
    const y = Common.random(min, max);

    return Vector.create(x, y);
}

// A debug canvas
if (DEBUG_CANVAS) {
    const canvas = document.createElement('canvas'),
        context = canvas.getContext('2d');

    canvas.width = VIEW_WIDTH;
    canvas.height = VIEW_HEIGHT;

    document.body.appendChild(canvas);

    (function renderDebugCanvas() {
        const bodies = Composite.allBodies(engine.world);

        requestAnimationFrame(renderDebugCanvas);

        context.fillStyle = '#505050';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.lineWidth = 2;
        context.strokeStyle = '#000000';
        context.beginPath();

        for (let i = 0; i < bodies.length; i++) {
            const vertices = bodies[i].vertices;

            drawBody(vertices);
            const parts = bodies[i].parts;
            for (let j = 0; j < parts.length; j++) {
                drawBody(parts[j].vertices);
            }
        }
        context.stroke();

        context.lineWidth = 1;
        context.fillStyle = '#ff0000';
        for (let i = 0; i < bodies.length; i++) {
            const vertices = bodies[i].vertices;

            drawBodyVertices(vertices);
            const parts = bodies[i].parts;
            for (let j = 0; j < parts.length; j++) {
                drawBodyVertices(parts[j].vertices);
            }
        }

        function drawBody(vertices) {
            context.moveTo(vertices[0].x, vertices[0].y);
            for (let i = 1; i < vertices.length; i++) {
                context.lineTo(vertices[i].x, vertices[i].y);
            }

            context.lineTo(vertices[0].x, vertices[0].y);
            context.closePath();
        }

        function drawBodyVertices(vertices) {
            for (let i = 0; i < vertices.length; i++) {
                context.beginPath();
                context.arc(vertices[i].x, vertices[i].y, 1, 0, 2 * Math.PI);
                context.fill();
            }
        }

    })();
}
