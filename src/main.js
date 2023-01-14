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
    PAUSE_ON_IMPACT = false;

const VIEW_WIDTH = 1280,
    VIEW_HEIGHT = 720,
    BOX_SIZE = 100, // Box size (in pixels)
    BOX_MASS = 100, // Box size (in pixels)
    BOX_SCALE = 1; // Uniform scaling

let isPaused = false;

const engineOptions = {
    enableSleeping: true,
    gravity: {
        x: 0,
        y: 1,
        scale: 0.001
    }
};

// Create the engine
const engine = Engine.create(engineOptions);

// Create the renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        background: '#565656',
        width: VIEW_WIDTH,
        height: VIEW_HEIGHT,
        wireframes: WIREFRAME,
        showAngleIndicator: false,
        showDebug: false,
        showBounds: true,
        showVelocity: false,
        showCollisions: false,
        showSeparations: false,
        showAxes: false,
        showPositions: false
    }
});

const ground = Bodies.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT + 10, VIEW_WIDTH + 10, 60, { isStatic: true });

// Add bodies to the world
Composite.add(engine.world, [ground]);

document.addEventListener('click', () => {
    if (!isPaused) {
        // Reset timescale, clear the world and re-add bodies.
        engine.timing.timeScale = 1;
        Composite.clear(engine.world, true, true);
        addBodies();

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

    requestAnimationFrame(update);
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
        // pause();
        if (a && a.isBreakable) {
            voronoiBreakBody(a);
            // slowmo(0.1);
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
    const broken = voronoiBreakPoly(body);

    const newBody = Body.create({
        position: body.position,
        // position: Vector.add(body.position, Vector.create(150, 150)),
        render: {
            fillStyle: '#ffffff'
        }
    });
    for (let i = 0; i < broken.length; i++) {
        const p = broken[i];

        let n = Vector.sub(body.position, p.position);
        n = Vector.mult(n, -body.angularVelocity * Vector.magnitude(n) * Common.random(1, 2));

        Body.setMass(p, body.mass / broken.length);
        Body.setVelocity(p, body.velocity);
        Body.setAngle(p, body.angle);
        Body.setAngularVelocity(p, body.angularVelocity);

        p.velocity.x += n.x;
        p.velocity.y += n.y;
        Composite.add(engine.world, p);
    }

    // Body.setParts(newBody, broken);

    Composite.remove(engine.world, body);
    // Composite.add(engine.world, newBody);
}

function voronoiBreakPoly(body) {
    // A random point spray
    const sites = [];
    // const sitesCount = Math.round(Common.random(50, 100));
    const sitesCount = 125;
    for (let i = 0; i < sitesCount; ++i) {
        // const p = Vector.create(Common.random(0, BOX_SIZE), Common.random(0, BOX_SIZE));
        const p = Vector.create(Common.random(-BOX_SIZE * 0.5, BOX_SIZE * 0.5), Common.random(-BOX_SIZE * 0.5, BOX_SIZE * 0.5));
        sites.push(p);
    }

    const voronoi = new Voronoi();
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
        const b = Body.create({
            // position: Vector.add(cellSite, Vector.sub(body.position, cellSite)),
            position: Vector.add(cellSite, body.position),
            vertices: vertices,
            render: {
                fillStyle: '#ffffff'
            }
        });

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

function getBodyOptions(texture) {
    return {
        friction: 0.1,
        frictionAir: 0.01,
        frictionStatic: 1,
        restitution: 0,
        angularVelocity: 0,
        render: {
            fillStyle: '#ffffff',
            sprite: {
                // texture: texture,
                // xScale: BOX_SCALE,
                // yScale: BOX_SCALE
            }
        }
    };
}

function addBodies() {
    const leftBoxOptions = getBodyOptions('./sprites/checkers.png');
    const rightBoxOptions = getBodyOptions('./sprites/checkers.png');

    // Left and right boxes
    const leftBox = Bodies.rectangle(-50, 100, BOX_SIZE, BOX_SIZE, leftBoxOptions);
    const rightBox = Bodies.rectangle(VIEW_WIDTH + 50, 100, BOX_SIZE, BOX_SIZE, rightBoxOptions);

    leftBox.isBreakable = true;
    rightBox.isBreakable = true;

    // Set parameters
    // Body.scale(leftBox, BOX_SCALE, BOX_SCALE);
    // Body.scale(rightBox, BOX_SCALE, BOX_SCALE);

    Body.setCentre(leftBox, Vector.create(0, 0), true);
    Body.setCentre(rightBox, Vector.create(0, 0), true);

    Body.setAngle(leftBox, Common.random(0, 2 * Math.PI));
    Body.setAngle(rightBox, Common.random(0, 2 * Math.PI));

    Body.setMass(leftBox, BOX_MASS);
    Body.setMass(rightBox, BOX_MASS);

    const position1 = Vector.create(0, 0);
    const force1 = Vector.mult(Vector.normalise(Vector.create(Common.random(0, 1), 0)), Common.random(6, 9));

    const position2 = Vector.create(0, 0);
    const force2 = Vector.mult(Vector.normalise(Vector.create(Common.random(0, -1), 0)), Common.random(6, 9));

    Body.applyForce(leftBox, leftBox.position, force1);
    Body.applyForce(rightBox, rightBox.position, force2);

    // Add to composite
    Composite.add(engine.world, [leftBox, rightBox]);
}

function pause() {
    isPaused = true;
}

function unpause() {
    isPaused = false;
    requestAnimationFrame(update);
}

// Look at viewport
Render.lookAt(render, {
    min: { x: 0, y: 0 },
    // min: { x: -200, y: -200 },
    max: { x: VIEW_WIDTH, y: VIEW_HEIGHT }
});

addBodies();

// Run the renderer
Render.run(render);

requestAnimationFrame(update);

function randomVec2(min, max) {
    const x = Common.random(min, max);
    const y = Common.random(min, max);

    return Vector.create(x, y);
}

// A debug canvas
// const canvas = document.createElement('canvas'),
//     context = canvas.getContext('2d');
//
// canvas.width = VIEW_WIDTH;
// canvas.height = VIEW_HEIGHT;
//
// document.body.appendChild(canvas);
//
// (function renderDebugCanvas() {
//     const bodies = Composite.allBodies(engine.world);
//
//     requestAnimationFrame(renderDebugCanvas);
//
//     context.fillStyle = '#505050';
//     context.fillRect(0, 0, canvas.width, canvas.height);
//
//     context.lineWidth = 2;
//     context.strokeStyle = '#000000';
//     context.beginPath();
//
//     for (let i = 0; i < bodies.length; i++) {
//         const vertices = bodies[i].vertices;
//
//         drawBody(vertices);
//         const parts = bodies[i].parts;
//         for (let j = 0; j < parts.length; j++) {
//             drawBody(parts[j].vertices);
//         }
//     }
//     context.stroke();
//
//     context.lineWidth = 2;
//     context.fillStyle = '#ff0000';
//     for (let i = 0; i < bodies.length; i++) {
//         const vertices = bodies[i].vertices;
//
//         drawBodyVertices(vertices);
//         const parts = bodies[i].parts;
//         for (let j = 0; j < parts.length; j++) {
//             drawBodyVertices(parts[j].vertices);
//         }
//     }
//
//     function drawBody(vertices) {
//         context.moveTo(vertices[0].x, vertices[0].y);
//         for (let i = 1; i < vertices.length; i++) {
//             context.lineTo(vertices[i].x, vertices[i].y);
//         }
//
//         context.lineTo(vertices[0].x, vertices[0].y);
//         context.closePath();
//     }
//
//     function drawBodyVertices(vertices) {
//         for (let i = 0; i < vertices.length; i++) {
//             context.beginPath();
//             context.arc(vertices[i].x, vertices[i].y, 3, 0, 2 * Math.PI);
//             context.fill();
//         }
//     }
//
// })();
