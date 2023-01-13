// matter aliases for easier access
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Events = Matter.Events,
    Common = Matter.Common,
    Vector = Matter.Vector,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse,
    Composite = Matter.Composite;

// CVars
const WIREFRAME = false;

const VIEW_WIDTH = 1280,
    VIEW_HEIGHT = 720,
    BOX_SIZE = 100, // Box size (in pixels)
    BODY_SCALE = 1; // Uniform scaling

// Create the engine
const engine = Engine.create();

// Create the renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        background: '#565656',
        width: VIEW_WIDTH,
        height: VIEW_HEIGHT,
        wireframes: WIREFRAME,
        showAngleIndicator: WIREFRAME
    }
});

const ground = Bodies.rectangle(VIEW_WIDTH / 2, VIEW_HEIGHT + 10, VIEW_WIDTH + 10, 60, { isStatic: true });
// const leftWall = Bodies.rectangle(-10, VIEW_HEIGHT / 2, 60, 810, { isStatic: true });
// const rightWall = Bodies.rectangle(VIEW_WIDTH + 10, VIEW_HEIGHT / 2, 60, 810, { isStatic: true });
// const ceiling = Bodies.rectangle(VIEW_WIDTH / 2, -10, 810, 60, { isStatic: true });

// Add bodies to the world
Composite.add(engine.world, [ground]);

document.addEventListener('click', () => {
    addBodies();
});

Events.on(engine.world, 'afterAdd', (e) => {

});

Events.on(engine, 'beforeUpdate', (e) => {
    const engine = e.source;
});

// Collision events
Events.on(engine, 'collisionStart', (e) => {
    // Slow-mo
    //engine.timing.timeScale = 0.5;

    // Get the body pairs involved in the collision
    // const pairs = e.pairs;
    // for (let i = 0; i < pairs.length; i++) {
    //     const pair = pairs[i];
    //     pair.bodyA.render.fillStyle = color;
    //     pair.bodyB.render.fillStyle = color;
    // }
});

Events.on(engine, 'collisionActive', (e) => {
    //changeColor('#14f60a', e.pairs);
});

Events.on(engine, 'collisionEnd', (e) => {
    //engine.timing.timeScale = 1;
});

// Mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.1,
        render: {
            visible: false
        }
    }
});

Composite.add(engine.world, mouseConstraint);

// Keep mouse in sync with rendering
render.mouse = mouse;

// Run the renderer
Render.run(render);

function update() {
    // Update loop
    requestAnimationFrame(update);
}

function addBodies() {
    const leftBoxOptions = {
        render: {
            fillStyle: '#ffffff',
            sprite: {
                texture: './sprites/checkers.png',
                xScale: BODY_SCALE,
                yScale: BODY_SCALE
            }
        }
    };
    const rightBoxOptions = {
        render: {
            fillStyle: '#ffffff',
            sprite: {
                texture: './sprites/checkers.png',
                xScale: BODY_SCALE,
                yScale: BODY_SCALE
            }
        }
    };

    // Bodies
    const leftBox = Bodies.rectangle(-50, 100, BOX_SIZE, BOX_SIZE, leftBoxOptions);
    const rightBox = Bodies.rectangle(VIEW_WIDTH + 50, 100, BOX_SIZE, BOX_SIZE, rightBoxOptions);

    // Set parameters
    // Body.rotate(leftBox, Common.random(0, 2 * Math.PI));
    // Body.rotate(rightBox, Common.random(0, 2 * Math.PI));

    Body.scale(leftBox, BODY_SCALE, BODY_SCALE);
    Body.scale(rightBox, BODY_SCALE, BODY_SCALE);

    Body.setMass(leftBox, Common.random(100, 150));
    Body.setMass(rightBox, Common.random(100, 150));

    const position1 = Vector.create(50, 0);
    const force1 = Vector.mult(Vector.normalise(Vector.create(Common.random(0, 1), 0)), Common.random(5, 10));

    const position2 = Vector.create(-50, 0);
    const force2 = Vector.mult(Vector.normalise(Vector.create(Common.random(0, -1), 0)), Common.random(5, 10));

    Body.applyForce(leftBox, position1, force1);
    Body.applyForce(rightBox, position2, force2);

    // Add
    Composite.add(engine.world, [leftBox, rightBox]);
}

requestAnimationFrame(update);
addBodies();

// Create runner
const runner = Runner.create();

// Look at viewport
Render.lookAt(render, {
    min: { x: 0, y: 0 },
    max: { x: VIEW_WIDTH, y: VIEW_HEIGHT }
});

// Run the engine
Runner.run(runner, engine);

function randomVec2(min, max) {
    const x = Common.random(min, max);
    const y = Common.random(min, max);

    return Vector.create(x, y);
}
