import { Canvas, Color, Vec2, Vec3, Box, NaiveScene, Sphere, Camera, Camera2D } from "https://cdn.jsdelivr.net/npm/tela.js/src/index.js"
import * as NablaArray from "../src/Array/index.js";
const IO = {}
IO._cache = {}

IO.measureTime = async function (fn) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
}

IO.loadMNIST = async function (samples = 1000) {
    const key = `loadMNIST_${samples}`;
    if (IO._cache[key]) return IO._cache[key];
    let canvas = await Canvas.ofUrl("/assets/mnist_images.png");
    const width = canvas.width;
    const height = Math.min(canvas.height, samples);

    const data = [];
    for (let i = 0; i < height; i++) {
        const mnistSample = new Float32Array(width);
        for (let j = 0; j < width; j++) {
            mnistSample[j] = canvas.image[(i * width + j) * 4];
        }
        data.push(mnistSample);
    }
    IO._cache[key] = data;
    return data;
}

IO.paintMNIST = function (mnistSample, scale = 10) {
    const width = Math.sqrt(mnistSample.length);
    const height = width;
    let canvas = Canvas.ofSize(width, height);
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const y = height - 1 - i;
            const x = j;
            const value = mnistSample[i * width + j];
            canvas.setPxl(x, y, Color.ofRGB(value, value, value));
        }
    }
    let outputCanvas = Canvas.ofSize(width * scale, height * scale);
    outputCanvas = outputCanvas.map((x, y) => {
        const px = x / (width * scale);
        const py = y / (height * scale);
        return canvas.getPxl(px * width, py * height);
    })
    return {
        toVisual: () => {
            return { type: "canvas", value: outputCanvas.paint() };
        }
    };
}

function plot2d(points, width = 500, height = 500) {
    // Normalize points to fit in the canvas
    const vecs = points.map(p => Vec2(p[0], p[1]));
    let box = new Box();
    for (let i = 0; i < vecs.length; i++) {
        box = box.add(new Box(vecs[i], vecs[i]));
    }
    const min = box.min;
    const diag = box.diagonal;
    const normalizedVecs = vecs.map(v => {
        return v.sub(min).div(diag).scale(2).map(x => x - 1); // Normalize to [-1, 1]
    });

    let canvas = Canvas.ofSize(width, height);
    let scene = new NaiveScene();
    scene.addList(normalizedVecs.map(v => {
        return Sphere.builder().position(v).radius(0.01).color(Color.ofRGB(1, 0, 0)).build();
    }));
    let cameraBox = new Box(Vec2(-1, -1), Vec2(1, 1));
    cameraBox = cameraBox.scale(1.2); // Add some padding
    const camera = new Camera2D(cameraBox);
    let mouse = Vec2();
    let mousedown = false;
    canvas.onMouseDown((x, y) => {
        mousedown = true;
        mouse = Vec2(x, y);
    })
    canvas.onMouseUp(() => {
        mousedown = false;
        mouse = Vec2();
    })
    canvas.onMouseMove((x, y) => {
        const newMouse = Vec2(x, y);
        if (!mousedown || newMouse.equals(mouse)) {
            return;
        }
        const [dx, dy] = newMouse.sub(mouse).toArray();
        const v = Vec2(dx, dy).scale(-1).div(Vec2(width, height)).mul(cameraBox.diagonal);
        cameraBox = cameraBox.move(v);
        mouse = newMouse;
        camera.box = cameraBox;
        paint();
    })
    canvas.onMouseWheel((e) => {
        e.preventDefault();
        const scale = Math.sign(e.deltaY) * 1e-1;
        cameraBox = cameraBox.scale(1 + scale);
        camera.box = cameraBox;
        paint();
    })
    const paint = () => {
        canvas.fill(Color.BLACK)
        return camera
            .raster(scene)
            .to(canvas)
            .paint();
    }
    return {
        toVisual: () => {
            return { type: "canvas", value: paint() };
        }
    };
}

function plot3d(points, width = 500, height = 500) {
    // Normalize points to fit in the canvas
    const vecs = points.map(p => Vec3(p[0], p[1], p[2]));
    let box = new Box();
    for (let i = 0; i < vecs.length; i++) {
        box = box.add(new Box(vecs[i], vecs[i]));
    }
    const min = box.min;
    const diag = box.diagonal;
    const normalizedVecs = vecs.map(v => {
        return v.sub(min).div(diag).scale(2).map(x => x - 1); // Normalize to [-1, 1]
    });

    let canvas = Canvas.ofSize(width, height);
    let scene = new NaiveScene();
    scene.addList(normalizedVecs.map(v => {
        return Sphere.builder().position(v).radius(0.01).color(Color.ofRGB(1, 0, 0)).build();
    }));
    const camera = new Camera().orbit(5, 0, 0);
    let mousedown = false;
    let mouse = Vec2();
    canvas.onMouseDown((x, y) => {
        mousedown = true;
        mouse = Vec2(x, y);
    });

    canvas.onMouseUp(() => {
        mousedown = false;
        mouse = Vec2();
    });

    canvas.onMouseMove((x, y) => {
        const newMouse = Vec2(x, y);
        if (!mousedown || newMouse.equals(mouse)) {
            return;
        }
        const [dx, dy] = newMouse.sub(mouse).toArray();
        camera.orbit(sphereCoords =>
            sphereCoords.add(
                Vec3(
                    0,
                    -2 * Math.PI * (dx / canvas.width),
                    -2 * Math.PI * (dy / canvas.height)
                )
            )
        );
        mouse = newMouse;
        paint();
    });
    canvas.onMouseWheel((e) => {
        event.preventDefault();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(e.deltaY * 0.001, 0, 0)));
        paint();
    });
    const paint = () => {
        canvas.fill(Color.BLACK)
        return camera
            .raster(scene)
            .to(canvas)
            .paint();
    }
    return {
        toVisual: () => {
            return { type: "canvas", value: paint() };
        }
    };
}

// points: array of [x, y] or [x, y, z]
IO.plotPointCloud = function (points) {
    if (points instanceof NablaArray.Array) {
        points = points.toArray();
    }
    const dimensions = points[0].length;
    if (dimensions < 2 || dimensions > 3) {
        throw new Error("Points must be 2D or 3D");
    }
    if (dimensions === 2) {
        return plot2d(points);
    }
    return plot3d(points);
}

export default IO;
