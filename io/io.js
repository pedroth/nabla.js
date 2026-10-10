import {
    Box,
    Camera,
    Camera2D,
    Canvas,
    Color,
    KScene,
    Line,
    NaiveScene,
    Sphere,
    Triangle,
    Vec2,
    Vec3,
} from "https://cdn.jsdelivr.net/npm/tela.js/src/index.js";
import { NArray } from "../src/NArray/index.js";
import { Symbolic } from "../src/Symbolic/index.js";
import { SOURCE } from "./utils.js";

const IO = {};
IO._cache = {};
IO._store = {};

// Persists a value across cells/re-evaluations (the io.js module instance is shared for the whole session)
/**
 * Stores a value for later retrieval.
 * @param {string} key - Name used to retrieve the stored value.
 * @param {*} value - Value to store.
 * @returns {*} The stored value.
 */
IO.store = function (key, value) {
    IO._store[key] = value;
    return value;
};

/**
 * Retrieves a value stored with {@link IO.store}.
 * @param {string} key - Name of the stored value.
 * @returns {*} The stored value, or `undefined` if the key is absent.
 */
IO.recall = function (key) {
    return IO._store[key];
};

/**
 * Measures the duration of an asynchronous or synchronous operation.
 * @param {Function} fn - Operation to execute and time.
 * @returns {Promise<number>} Elapsed time in milliseconds.
 */
IO.measureTime = async function (fn) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
};

// ---------------------------------------------------------------------------
// MNIST data and drawing
// ---------------------------------------------------------------------------

/**
 * Loads MNIST image rows from the bundled sprite sheet.
 * @param {number} samples - Maximum number of image rows to load.
 * @returns {Promise<Float32Array[]>} Image rows as grayscale pixel arrays.
 */
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
};

/**
 * Creates a visualizer for one or more MNIST samples.
 * @param {Float32Array|Float32Array[]} mnistSamples - One image or an array of images.
 * @param {number} scale - Display size multiplier for each image pixel.
 * @returns {{update: Function, toVisual: Function}} Updatable canvas visualization.
 */
IO.paintMNIST = function (mnistSamples, scale = 10) {
    const initialSamples = Array.isArray(mnistSamples) ? mnistSamples : [mnistSamples];
    const width = Math.sqrt(initialSamples[0].length);
    const height = width;
    const canvases = initialSamples.map(() => Canvas.ofSize(width, height));
    /**
     * Repaints the canvases with replacement samples.
     * @param {Float32Array|Float32Array[]} nextSamples - Image data to display.
     */
    const update = nextSamples => {
        const samples = Array.isArray(nextSamples) ? nextSamples : [nextSamples];
        samples.forEach((sample, sampleIndex) => {
            const canvas = canvases[sampleIndex];
            if (!canvas) return;
            for (let i = 0; i < height; i++) {
                for (let j = 0; j < width; j++) {
                    const y = height - 1 - i;
                    const value = sample[i * width + j];
                    canvas.setPxl(j, y, Color.ofRGB(value, value, value));
                }
            }
            canvas.paint();
        });
    };
    update(initialSamples);
    return {
        update,
        toVisual: () => {
            return {
                type: "canvases",
                value: () => canvases.map(canvas => {
                    const painted = canvas.paint();
                    painted.DOM.style.width = `${width * scale}px`;
                    painted.DOM.style.height = `${height * scale}px`;
                    painted.DOM.style.imageRendering = "pixelated";
                    return painted;
                })
            };
        }
    };
};

/**
 * Creates an interactive MNIST drawing surface.
 * @param {object} options - Drawing configuration.
 * @param {number} [options.width=28] - Image width in pixels.
 * @param {number} [options.height=28] - Image height in pixels.
 * @param {number} [options.scale=10] - Display size multiplier for each pixel.
 * @param {number} [options.brushRadius=1.2] - Brush radius in image pixels.
 * @param {Function|null} [options.onSubmit=null] - Callback receiving the image data.
 * @returns {{clear: Function, submit: Function, getData: Function, toVisual: Function}} Drawing controls and visual.
 */
IO.drawMNIST = function (options = {}) {
    const {
        width = 28,
        height = 28,
        scale = 10,
        brushRadius = 1.2,
        onSubmit = null,
    } = options;
    // row-major, row 0 = top, matching paintMNIST/loadMNIST sample layout
    const density = new Float32Array(width * height);
    const canvas = Canvas.ofSize(width, height);
    let drawing = false;

    /**
     * Adds brush density to an image pixel, clamping it to the unit interval.
     * @param {number} row - Pixel row, with zero at the top.
     * @param {number} col - Pixel column.
     * @param {number} value - Density contribution to apply.
     */
    const setDensity = (row, col, value) => {
        if (row < 0 || row >= height || col < 0 || col >= width) return;
        const index = row * width + col;
        density[index] = Math.min(1, Math.max(density[index], value));
    };

    /**
     * Applies the brush centered at a canvas coordinate.
     * @param {number} x - Horizontal canvas coordinate.
     * @param {number} y - Vertical canvas coordinate.
     */
    const paintBrush = (x, y) => {
        const row = height - 1 - y;
        const col = x;
        const r = Math.ceil(brushRadius);
        for (let dr = -r; dr <= r; dr++) {
            for (let dc = -r; dc <= r; dc++) {
                const dist = Math.hypot(dr, dc);
                if (dist > brushRadius) continue;
                setDensity(row + dr, col + dc, 1 - dist / brushRadius);
            }
        }
    };

    const render = () => {
        canvas.map((x, y) => {
            const value = density[(height - 1 - y) * width + x];
            return Color.ofRGB(value, value, value);
        });
        canvas.paint();
    };

    const stopDrawing = () => {
        drawing = false;
    };
    canvas.onMouseDown((x, y) => {
        drawing = true;
        paintBrush(x, y);
        render();
    });
    canvas.onMouseMove((x, y) => {
        if (!drawing) return;
        paintBrush(x, y);
        render();
    });
    canvas.onMouseUp(stopDrawing);

    const clear = () => {
        density.fill(0);
        render();
    };

    const submit = () => {
        onSubmit?.(density);
    };

    render();

    return {
        clear,
        submit,
        getData: () => Float32Array.from(density),
        toVisual: () => {
            return {
                type: "ui",
                value: () => [
                    {
                        type: "canvas",
                        value: () => {
                            const painted = canvas.paint();
                            painted.DOM.style.width = `${width * scale}px`;
                            painted.DOM.style.height = `${height * scale}px`;
                            painted.DOM.style.imageRendering = "pixelated";
                            return painted;
                        }
                    },
                    {
                        type: "group",
                        value: () => [
                            { type: "button", value: () => ({ title: "Clear", onClick: clear }) },
                            { type: "button", value: () => ({ title: "Submit", onClick: submit }) },
                        ]
                    },
                ]
            };
        }
    };
};

// samples: array of MNIST images
// projections: array of vecs (each vec corresponds to a projection of an MNIST image into 3d)
// samples and projections should have the same length
/**
 * Projects MNIST samples into a rotatable 3D image cloud.
 * @param {Array<Float32Array>} samples - Grayscale image data, one sample per projection.
 * @param {Array<Vec3|number[]>} projections - 3D position for each sample.
 * @param {object} options - Canvas and rendering options.
 * @param {number} [options.width=500] - Canvas width in pixels.
 * @param {number} [options.height=500] - Canvas height in pixels.
 * @param {number} [options.quadSize=0.06] - Half-size of each image quad in normalized space.
 * @param {number} [options.scale=1] - Display size multiplier for the canvas.
 * @param {number} [options.lowResFactor=2] - Downsampling factor while interacting.
 * @returns {object} Canvas visualization with `render` and `toVisual` methods.
 */
IO.projectMNIST = function (samples, projections, options = {}) {
    const { width = 500, height = 500, quadSize = 0.06, scale = 1, lowResFactor = 2 } = options;
    if (samples.length !== projections.length) {
        throw new Error("samples and projections must have the same length");
    }
    const points = (projections.toArray?.() ?? projections).map(p => p.toArray?.() ?? p);
    const side = Math.sqrt(samples[0].length);

    const textures = samples.map(sample => {
        return Canvas.ofSize(side, side).map((x, y) => {
            const value = sample[(side - 1 - y) * side + x];
            return Color.ofRGB(value, value, value);
        });
    });

    // normalize positions to [-1, 1]^3, like plot3d
    const min = [0, 1, 2].map(k => Math.min(...points.map(p => p[k])));
    const max = [0, 1, 2].map(k => Math.max(...points.map(p => p[k])));
    const extent = max.map((m, k) => m - min[k] || 1);
    const positions = points.map(p => Vec3(...p.map((x, k) => 2 * (x - min[k]) / extent[k] - 1)));

    const canvas = Canvas.ofSize(width, height);
    const lowCanvas = Canvas.ofSize(Math.ceil(width / lowResFactor), Math.ceil(height / lowResFactor));
    const camera = new Camera().orbit(5, 0, 0);
    let mousedown = false;
    let mouse = Vec2();
    let fullRenderTimeout = null;
    canvas.onMouseDown((x, y) => {
        mousedown = true;
        mouse = Vec2(x, y);
    });
    canvas.onMouseUp(() => {
        mousedown = false;
        mouse = Vec2();
        paint();
    });
    canvas.onMouseMove((x, y) => {
        const newMouse = Vec2(x, y);
        if (!mousedown || newMouse.equals(mouse)) return;
        const [dx, dy] = newMouse.sub(mouse).toArray();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(
            0,
            -2 * Math.PI * (dx / canvas.width),
            -2 * Math.PI * (dy / canvas.height)
        )));
        mouse = newMouse;
        paintLowRes();
    });
    canvas.onMouseWheel(e => {
        e.preventDefault();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(e.deltaY * 0.001, 0, 0)));
        paintLowRes();
        // wheel has no end event, so refine after it goes idle
        clearTimeout(fullRenderTimeout);
        fullRenderTimeout = setTimeout(paint, 150);
    });

    // 0.999 keeps texture lookups inside the image
    const uvs = [Vec2(0, 0), Vec2(0.999, 0), Vec2(0.999, 0.999), Vec2(0, 0.999)];
    /**
     * Renders the projected image quads into a target canvas.
     * @param {Canvas} target - Canvas to render into.
     * @returns {Canvas} Painted target canvas.
     */
    const paintTo = target => {
        const right = camera.basis[0].scale(quadSize);
        const up = camera.basis[1].scale(quadSize);
        const scene = new NaiveScene();
        const triangles = [];
        for (let i = 0; i < positions.length; i++) {
            const p = positions[i];
            const corners = [
                p.sub(right).sub(up),
                p.add(right).sub(up),
                p.add(right).add(up),
                p.sub(right).add(up),
            ];
            for (const [a, b, c] of [[0, 1, 2], [0, 2, 3]]) {
                triangles.push(
                    Triangle.builder()
                        .positions(corners[a], corners[b], corners[c])
                        .texCoords(uvs[a], uvs[b], uvs[c])
                        .texture(textures[i])
                        .build()
                );
            }
        }
        scene.addList(triangles);
        return camera
            .raster(scene, { cullBackFaces: false })
            .to(target)
            .paint();
    };

    const paint = () => paintTo(canvas);

    const paintLowRes = () => {
        const low = paintTo(lowCanvas);
        const painted = canvas.paint();
        painted.DOM.getContext("2d").drawImage(low.DOM, 0, 0, canvas.width, canvas.height);
        return painted;
    };

    return {
        canvas,
        render: paint,
        toVisual: () => ({
            type: "canvas",
            value: () => {
                const painted = paint();
                painted.DOM.style.width = `${width * scale}px`;
                painted.DOM.style.height = `${height * scale}px`;
                return painted;
            }
        }),
    };
};

// ---------------------------------------------------------------------------
// UI and visualization
// ---------------------------------------------------------------------------

/**
 * Wraps child visuals in a UI container.
 * @param {...object} children - Visual elements to place in the UI.
 * @returns {{toVisual: Function}} UI visual descriptor.
 */
IO.UI = function (...children) {
    return {
        toVisual: () => ({
            type: "ui",
            value: () => children,
        }),
    };
};

// points: array of [x, y] or [x, y, z]
/**
 * Plots a cloud of 2D or 3D points.
 * @param {Array|NArray} points - Point coordinates or vectors.
 * @param {object} options - Plot dimensions, colors, radii, and optional scene.
 * @returns {object} Interactive plot with rendering and layer-update methods.
 */
IO.plotPointCloud = function (points, options = {}) {
    if (points instanceof NArray) {
        points = points.toArray();
    }
    const dimensions = points[0]?.dim ?? points[0].length;
    if (dimensions < 2 || dimensions > 3) {
        throw new Error("Points must be 2D or 3D");
    }
    if (dimensions === 2) {
        return plot2d(points, options);
    }
    return plot3d(points, options);
};

/**
 * Plots line segments in 2D or 3D.
 * @param {Array|NArray} lines - Segments as `[[start, end], ...]`; endpoints are coordinate arrays or vectors.
 * @param {object} options - Canvas and line appearance settings.
 * @param {number} [options.width=500] - Canvas width in pixels.
 * @param {number} [options.height=500] - Canvas height in pixels.
 * @param {Array|Color} [options.color=[1, 0, 0]] - Shared RGB color or one color per line.
 * @param {number} [options.radius=0.01] - Line radius for 3D rendering.
 * @returns {object} Interactive plot with update, add, render, and toVisual methods.
 */
IO.plotLineCloud = function (lines, options = {}) {
    const { segments, dimensions } = normalizeLineSegments(lines);
    return plotLines(segments, dimensions, options);
};

/**
 * Plots triangles in 2D or 3D.
 * @param {Array|NArray} triangles - Triangles as `[[p0, p1, p2], ...]`; vertices are coordinate arrays or vectors.
 * @param {object} options - Canvas and triangle appearance settings.
 * @param {number} [options.width=500] - Canvas width in pixels.
 * @param {number} [options.height=500] - Canvas height in pixels.
 * @param {Color|number[]|Array} [options.color=[1, 0, 0]] - One color for all triangles, one color per triangle, or three vertex colors per triangle. Colors may be tela.js `Color` instances or RGB triplets.
 * @returns {object} Interactive plot with update, add, render, and toVisual methods.
 */
IO.plotTriangleCloud = function (triangles, options = {}) {
    const { faces, dimensions } = normalizeTriangles(triangles);
    return plotTriangles(faces, dimensions, options);
};


/**
 * Ray traces a triangle mesh with tela.js, using an orbit camera controlled by the mouse.
 * Frames are accumulated progressively (the image refines over time) until the canvas leaves the page;
 * moving the camera or calling `update` restarts the accumulation.
 * @param {Array|NArray} points - Vertex coordinates as `[[x, y, z], ...]`.
 * @param {Array} faces - Triangles as vertex-index triples `[[i, j, k], ...]` or OBJ faces `{vertices: [i, j, k]}`.
 * @param {object} options - Canvas, color and ray tracing settings.
 * @param {number} [options.width=500] - Canvas width in pixels.
 * @param {number} [options.height=500] - Canvas height in pixels.
 * @param {Color|number[]|Array} [options.color=[0.5, 0.5, 0.5]] - One color for all triangles or one color per triangle.
 * @param {number} [options.bounces=5] - Maximum number of ray bounces.
 * @param {number} [options.samplesPerPxl=1] - Samples per pixel.
 * @returns {object} Plot with update, render, and toVisual methods.
 */
IO.raytrace = function (points, faces, options = {}) {
    const {
        width = 500,
        height = 500,
        color = [0.5, 0.5, 0.5],
        bounces = 5,
        samplesPerPxl = 1,
    } = options;
    const state = { triangles: [], colors: [], color };
    // tela.js only re-sends a scene to its workers when the scene hash changes, and the hash
    // depends on element names, so every update needs fresh names
    let version = 0;
    const canvas = Canvas.ofSize(width, height);
    const camera = new Camera().orbit(5, 0, 0);
    let exposed;
    let scene;

    /**
     * Replaces the mesh and optionally its colors.
     * @param {Array|NArray} nextPoints - Vertex coordinates.
     * @param {Array} [nextFaces] - Replacement faces; keeps the previous faces if omitted.
     * @param {object} [nextOptions] - Optional replacement `color`.
     */
    const update = (nextPoints, nextFaces = state.faces, nextOptions = {}) => {
        const vertices = (nextPoints?.toArray?.() ?? nextPoints)
            .map(p => Vec3(...(p?.toArray?.() ?? p)));
        const indices = (nextFaces?.toArray?.() ?? nextFaces)
            .map(face => face?.vertices ?? face?.toArray?.() ?? face);
        for (const face of indices) {
            if (face.length !== 3 || face.some(i => !vertices[i])) {
                throw new Error("Faces must be triples of valid vertex indices");
            }
        }
        const nextColor = nextOptions.color ?? state.color;
        state.triangles = indices.map(face => face.map(i => vertices[i]));
        state.colors = getTriangleColors(nextColor, indices.length);
        state.color = nextColor;
        state.faces = nextFaces;
        version++;
        scene = undefined;
        exposed = canvas.exposure();
    };
    update(points, faces);

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
        if (!mousedown || newMouse.equals(mouse)) return;
        const [dx, dy] = newMouse.sub(mouse).toArray();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(
            0,
            -2 * Math.PI * (dx / canvas.width),
            -2 * Math.PI * (dy / canvas.height)
        )));
        mouse = newMouse;
        exposed = canvas.exposure();
        render();
    });
    canvas.onMouseWheel(e => {
        e.preventDefault();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(e.deltaY * 0.001, 0, 0)));
        exposed = canvas.exposure();
        render();
    });

    // serialized into the ray tracing workers, so it must be self-contained
    const renderSkyBox = ray => {
        const dir = ray.dir;
        const horizon = Color.ofRGB(0.5, 0.7, 1.0);
        const zenith = Color.ofRGB(0.1, 0.2, 0.4);
        const blend = Math.pow(Math.max(0, dir.z), 0.5);
        const sky = horizon.scale(1 - blend).add(zenith.scale(blend));
        const sunDot = dir.dot(Vec3(0.7, 0.3, 0.5).normalize());
        const sunColor = Color.ofRGB(1.0, 0.8, 0.5);
        const sun = sunColor
            .scale(Math.pow(Math.max(0, sunDot), 200) * 2)
            .add(sunColor.scale(Math.pow(Math.max(0, sunDot), 5) * 0.5));
        return sky.add(sun);
    };
    const lightDir = Vec3(0.7, 0.3, 0.5).normalize();

    const buildScene = () => {
        let box = new Box();
        for (const triangle of state.triangles) {
            for (const point of triangle) box = box.add(new Box(point, point));
        }
        const maxExtent = Math.max(...box.diagonal.toArray()) || 1;
        const center = box.center;
        const scale = 2 / maxExtent;
        const scene = new KScene();
        scene.addList(state.triangles.map((triangle, index) =>
            Triangle.builder()
                .name(`mesh-${version}-${index}`)
                .positions(...triangle.map(point => point.sub(center).scale(scale)))
                .colors(...state.colors[index])
                .build()
        ));
        return scene;
    };

    // each frame is averaged into the exposed canvas; replacing it restarts the accumulation
    exposed = canvas.exposure();
    let running = false;
    let attached = false;

    const frame = async () => {
        if (state.triangles.length === 0) {
            canvas.fill(Color.BLACK);
            canvas.paint();
            return;
        }
        scene ??= buildScene();
        const target = exposed;
        const image = await camera
            .parallelShot(scene, {
                bounces,
                samplesPerPxl,
                gamma: 0.5,
                isBiased: false,
                renderSkyBox,
                lightDir,
                lightSharpness: 200,
            })
            .to(target);
        image.paint();
    };

    // keeps accumulating radiance until the canvas is removed from the page
    const loop = async () => {
        try {
            while (running) {
                await frame();
                await new Promise(resolve => setTimeout(resolve, 0));
                if (canvas.DOM?.isConnected) attached = true;
                else if (attached) running = false;
            }
        } catch (error) {
            running = false;
            console.error(error);
        }
    };

    const render = () => {
        if (!running) {
            running = true;
            attached = false;
            loop();
        }
        return canvas;
    };

    return {
        update,
        canvas,
        render,
        toVisual: () => ({
            type: "canvas",
            value: () => {
                render();
                return canvas.paint();
            },
        }),
    };
};

/**
 * Rasterizes a triangle mesh with tela.js over a sky background, shading each face by its normal and the light direction.
 * @param {Array|NArray} points - Vertex coordinates as `[[x, y, z], ...]`.
 * @param {Array} faces - Triangles as vertex-index triples `[[i, j, k], ...]` or OBJ faces `{vertices: [i, j, k]}`.
 * @param {object} options - Canvas, color and lighting settings.
 * @param {number} [options.width=500] - Canvas width in pixels.
 * @param {number} [options.height=500] - Canvas height in pixels.
 * @param {Color|number[]|Array} [options.color=[0.5, 0.5, 0.5]] - One color for all triangles, one per triangle, or three per triangle.
 * @param {number[]} [options.lightDir=[0.7, 0.3, 0.5]] - Direction towards the light.
 * @param {number} [options.ambient=0.15] - Minimum light intensity.
 * @returns {object} Plot with update, render, and toVisual methods.
 */
IO.raster = function (points, faces, options = {}) {
    const {
        width = 500,
        height = 500,
        color = [0.5, 0.5, 0.5],
        lightDir: lightDirOption = [0.7, 0.3, 0.5],
        ambient = 0.15,
    } = options;
    const lightDir = Vec3(...(lightDirOption?.toArray?.() ?? lightDirOption)).normalize();
    const state = { triangles: [], colors: [], color };
    const canvas = Canvas.ofSize(width, height);
    const camera = new Camera().orbit(5, 0, 0);

    /**
     * Replaces the mesh and optionally its colors.
     * @param {Array|NArray} nextPoints - Vertex coordinates.
     * @param {Array} [nextFaces] - Replacement faces; keeps the previous faces if omitted.
     * @param {object} [nextOptions] - Optional replacement `color`.
     */
    const update = (nextPoints, nextFaces = state.faces, nextOptions = {}) => {
        const vertices = (nextPoints?.toArray?.() ?? nextPoints)
            .map(p => Vec3(...(p?.toArray?.() ?? p)));
        const indices = (nextFaces?.toArray?.() ?? nextFaces)
            .map(face => face?.vertices ?? face?.toArray?.() ?? face);
        for (const face of indices) {
            if (face.length !== 3 || face.some(i => !vertices[i])) {
                throw new Error("Faces must be triples of valid vertex indices");
            }
        }
        const nextColor = nextOptions.color ?? state.color;
        state.triangles = indices.map(face => face.map(i => vertices[i]));
        state.colors = getTriangleColors(nextColor, indices.length);
        state.color = nextColor;
        state.faces = nextFaces;
    };
    update(points, faces);

    const renderSkyBox = ray => {
        const dir = ray.dir;
        const horizon = Color.ofRGB(0.5, 0.7, 1.0);
        const zenith = Color.ofRGB(0.1, 0.2, 0.4);
        const blend = Math.pow(Math.max(0, dir.z), 0.5);
        const sky = horizon.scale(1 - blend).add(zenith.scale(blend));
        const sunDot = dir.dot(lightDir);
        const sunColor = Color.ofRGB(1.0, 0.8, 0.5);
        const sun = sunColor
            .scale(Math.pow(Math.max(0, sunDot), 200) * 2)
            .add(sunColor.scale(Math.pow(Math.max(0, sunDot), 5) * 0.5));
        return sky.add(sun);
    };

    const paint = () => {
        let box = new Box();
        for (const triangle of state.triangles) {
            for (const point of triangle) box = box.add(new Box(point, point));
        }
        const maxExtent = Math.max(...box.diagonal.toArray()) || 1;
        const center = box.center;
        const scale = 2 / maxExtent;
        const scene = new NaiveScene();
        scene.addList(state.triangles.map((triangle, index) => {
            const [p0, p1, p2] = triangle.map(point => point.sub(center).scale(scale));
            const normal = p1.sub(p0).cross(p2.sub(p0));
            const length = normal.length();
            const light = length === 0
                ? ambient
                : Math.min(1, ambient + (1 - ambient) * Math.abs(normal.dot(lightDir)) / length);
            const [c0, c1, c2] = state.colors[index].map(c => {
                const [r, g, b] = c.toArray();
                return Color.ofRGB(r * light, g * light, b * light);
            });
            return Triangle.builder()
                .positions(p0, p1, p2)
                .colors(c0, c1, c2)
                .build();
        }));
        camera.rayMap(renderSkyBox).to(canvas);
        return camera
            .raster(scene, { cullBackFaces: true, clearScreen: false })
            .to(canvas)
            .paint();
    };

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
        if (!mousedown || newMouse.equals(mouse)) return;
        const [dx, dy] = newMouse.sub(mouse).toArray();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(
            0,
            -2 * Math.PI * (dx / canvas.width),
            -2 * Math.PI * (dy / canvas.height)
        )));
        mouse = newMouse;
        paint();
    });
    canvas.onMouseWheel(e => {
        e.preventDefault();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(e.deltaY * 0.001, 0, 0)));
        paint();
    });

    return {
        update,
        canvas,
        render: paint,
        toVisual: () => ({ type: "canvas", value: () => paint() }),
    };
};

/**
 * Loads vertices, normals, texture coordinates, and faces from an OBJ file.
 * @param {string} objPath - Path to the OBJ asset relative to the configured source.
 * @returns {Promise<object>} Parsed mesh data.
 */
IO.loadMesh = async function (objPath) {
    const objFile = await fetch(SOURCE + objPath)
        .then(res => res.text());
    const vertices = [];
    const normals = [];
    const textureCoords = [];
    const faces = [];
    const lines = objFile.split(/\n|\r/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const spaces = line.split(" ")
            .filter(x => x !== "");
        const type = spaces[0];
        if (!type) continue;
        if (type === "v") {
            // 3 numbers
            const v = spaces.slice(1, 4)
                .map(x => Number.parseFloat(x));
            vertices.push(v);
            continue;
        }
        if (type === "vn") {
            // 3 numbers
            const v = spaces.slice(1, 4)
                .map(x => Number.parseFloat(x));
            normals.push(v);
            continue;
        }
        if (type === "vt") {
            // 2 numbers
            const v = spaces
                .slice(1, 3)
                .map(x => Number.parseFloat(x));
            textureCoords.push(v);
            continue;
        }
        if (type === "f") {
            triangulate(spaces.slice(1))
                ?.forEach(triangleIdx => {
                    faces.push(parseFace(triangleIdx))
                })
            continue;
        }
    }
    return { vertices, normals, textureCoords, faces };
};


// ---------------------------------------------------------------------------
// Signed-distance-field views
// ---------------------------------------------------------------------------


/**
 * Calculates the signed distance from a point to an axis-aligned bounding box.
 * @param {number[]} point - Point coordinates in 3D.
 * @param {{min: number[], max: number[]}} aabbClip - Box minimum and maximum corners.
 * @returns {number} Negative inside the box, zero on its surface, positive outside.
 */
function signedDistanceToAabb(point, aabbClip) {
    const q = point.map((value, axis) =>
        Math.abs(value - (aabbClip.min[axis] + aabbClip.max[axis]) / 2) -
        (aabbClip.max[axis] - aabbClip.min[axis]) / 2
    );
    return Math.hypot(...q.map(value => Math.max(value, 0))) +
        Math.min(Math.max(...q), 0);
}

/**
 * Advances a ray until it enters the clipping box or exceeds the tracing limits.
 * @param {object} ray - Ray exposing `trace(distance)`.
 * @param {{min: number[], max: number[]}} aabbClip - Box used to clip the ray.
 * @param {number} maxIterations - Maximum number of tracing steps.
 * @param {number} epsilon - Tolerance used near the box surface.
 * @param {number} maxDistance - Maximum distance to trace.
 * @returns {number|null} Distance to the box entry, or `null` if there is no entry.
 */
function traceToAabb(ray, aabbClip, maxIterations, epsilon, maxDistance) {
    let t = 0;
    let nearAabb = false;
    for (let i = 0; i < maxIterations; i++) {
        const point = ray.trace(t);
        const boxDistance = signedDistanceToAabb(point.toArray(), aabbClip);
        if (boxDistance <= 0) return t;
        if (nearAabb && boxDistance > epsilon) return null;
        nearAabb = boxDistance <= epsilon;
        t += nearAabb ? epsilon : boxDistance;
        if (t > maxDistance) return null;
    }
    return null;
}

/**
 * Validates optional 3D clipping bounds.
 * @param {{min: number[], max: number[]}|null} aabbClip - Bounds to validate.
 * @throws {Error} If bounds are not finite 3D corners or are inverted.
 */
function validateAabbClip(aabbClip) {
    if (aabbClip == null) return;
    for (const bounds of [aabbClip.min, aabbClip.max]) {
        if (!Array.isArray(bounds) || bounds.length !== 3 || bounds.some(value => !Number.isFinite(value))) {
            throw new Error("aabbClip min and max must each be arrays of three finite numbers");
        }
    }
    if (aabbClip.min.some((value, axis) => value > aabbClip.max[axis])) {
        throw new Error("aabbClip min values must not exceed max values");
    }
}

/**
 * Visualizes a signed-distance function using CPU ray marching.
 * @param {Function} sdfFn - Function mapping `[x, y, z]` to a signed distance.
 * @param {object} options - Camera, canvas, and ray-marching configuration.
 * @param {number} [options.width=50] - Canvas width in pixels.
 * @param {number} [options.height=50] - Canvas height in pixels.
 * @param {number} [options.maxIterations=100] - Maximum ray-marching steps.
 * @param {number} [options.epsilon=1e-3] - Surface and normal-estimation tolerance.
 * @param {number} [options.maxDistance=10] - Maximum ray distance.
 * @param {number} [options.scale=10] - Display size multiplier for the canvas.
 * @param {{min: number[], max: number[]}|null} [options.aabbClip=null] - Optional 3D clipping bounds.
 * @returns {object} Interactive canvas visualization.
 */
IO.sdfView = function (sdfFn, options = {}) {
    const {
        width = 50,
        height = 50,
        maxIterations = 100,
        epsilon = 1e-3,
        maxDistance = 10,
        scale = 10,
        aabbClip = null,
    } = options;
    validateAabbClip(aabbClip);
    const canvas = Canvas.ofSize(width, height);

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
        e.preventDefault();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(e.deltaY * 0.001, 0, 0)));
        paint();
    });

    /**
     * Estimates the normalized SDF gradient at a point.
     * @param {Vec3} p - Position where the surface normal is estimated.
     * @returns {Vec3} Normalized gradient, or the zero vector.
     */
    const gradient = (p) => {
        const h = epsilon;
        const dx = sdfFn([p.x + h, p.y, p.z]) - sdfFn([p.x - h, p.y, p.z]);
        const dy = sdfFn([p.x, p.y + h, p.z]) - sdfFn([p.x, p.y - h, p.z]);
        const dz = sdfFn([p.x, p.y, p.z + h]) - sdfFn([p.x, p.y, p.z - h]);
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length === 0 || !Number.isFinite(length)) return Vec3(0, 0, 0);
        return Vec3(dx / length, dy / length, dz / length);
    };

    /**
     * Ray-marches the SDF along one camera ray and returns the hit color.
     * @param {object} ray - Ray exposing `trace(distance)`.
     * @returns {Color} Surface normal color or the background color.
     */
    const renderSDF = (ray) => {
        let t = aabbClip
            ? traceToAabb(ray, aabbClip, maxIterations, epsilon, maxDistance)
            : 0;
        if (t === null) return Color.BLACK;
        let previousT = 0;
        let previousD = 0;
        let hasPreviousSample = false;
        for (let i = 0; i < maxIterations; i++) {
            const p = ray.trace(t);
            if (aabbClip) {
                const boxDistance = signedDistanceToAabb(p.toArray(), aabbClip);
                if (boxDistance > 0) return Color.BLACK;
            }
            const d = sdfFn([p.x, p.y, p.z]);
            if (!Number.isFinite(d)) return Color.BLACK;
            if (hasPreviousSample && previousD * d < 0) {
                const hitT = previousT + (t - previousT) * previousD / (previousD - d);
                const hit = ray.trace(hitT);
                const normal = gradient(hit);
                return Color.ofRGB(
                    (normal.x + 1) / 2,
                    (normal.y + 1) / 2,
                    (normal.z + 1) / 2
                );
            }
            previousT = t;
            previousD = d;
            hasPreviousSample = true;
            if (Math.abs(d) < epsilon) {
                const normal = gradient(p);
                return Color.ofRGB(
                    (normal.x + 1) / 2,
                    (normal.y + 1) / 2,
                    (normal.z + 1) / 2
                );
            }
            t += Math.max(d, epsilon);
            if (t > maxDistance) {
                return aabbClip ? Color.BLACK : Color.ofRGB(0, 0, (i / maxIterations));
            }
        }
        return Color.BLACK;
    };

    const paint = () => {
        return (camera.rayMap(renderSDF).to(canvas)).paint();
    };


    return {
        render: () => paint(),
        toVisual: () => {
            return {
                type: "canvas",
                value: () => {
                    const painted = paint();
                    painted.DOM.style.width = `${width * scale}px`;
                    painted.DOM.style.height = `${height * scale}px`;
                    return painted;
                }
            };
        }
    };
}

/**
 * Visualizes a symbolic SDF or a neural network's symbolic expression.
 * @param {Symbolic|object} expressionOrNN - Symbolic expression or object with `symbolicNN` and `weightsMap`.
 * @param {object} options - Camera, canvas, and ray-marching configuration.
 * @param {number} [options.width=50] - Canvas width in pixels.
 * @param {number} [options.height=50] - Canvas height in pixels.
 * @param {number} [options.maxIterations=100] - Maximum ray-marching steps.
 * @param {number} [options.epsilon=1e-3] - Surface and normal-estimation tolerance.
 * @param {number} [options.maxDistance=10] - Maximum ray distance.
 * @param {number} [options.scale=10] - Display size multiplier for the canvas.
 * @param {{min: number[], max: number[]}|null} [options.aabbClip=null] - Optional 3D clipping bounds.
 * @returns {object} Interactive canvas visualization.
 */
IO.sdfViewSym = function (expressionOrNN, options = {}) {
    const {
        width = 50,
        height = 50,
        maxIterations = 100,
        epsilon = 1e-3,
        maxDistance = 10,
        scale = 10,
        aabbClip = null,
    } = options;
    validateAabbClip(aabbClip);
    const expression = expressionOrNN?.symbolicNN ?? expressionOrNN;
    const inputVariables = expression.vars.filter(variable =>
        variable.isParam || /^x_[0-2]$/.test(variable.name)
    );
    const sdfInputVariables = inputVariables.map(variable => {
        const match = /^x_([0-2])$/.exec(variable.name);
        if (!match) throw new Error(`SDF input variable must be named x_0, x_1, or x_2: ${variable.name}`);
        return { name: variable.name, axis: Number(match[1]) };
    });
    const inputNames = new Set(sdfInputVariables.map(variable => variable.name));
    const weightsMap = expressionOrNN?.symbolicNN ? expressionOrNN.weightsMap : {};
    const missingWeight = expression.vars.find(variable =>
        !inputNames.has(variable.name) && weightsMap[variable.name] === undefined
    );
    if (missingWeight) throw new Error(`Missing weight value for "${missingWeight.name}"`);

    const sdfEval = Symbolic.compile(expression);
    const evaluatorDependency = `const sdfEval = (${sdfEval.toString()});`;
    const canvas = Canvas.ofSize(width, height);
    const camera = new Camera().orbit(5, 0, 0);
    let mousedown = false;
    let mouse = Vec2();

    /**
     * Ray-marches the compiled symbolic SDF along one camera ray.
     * @param {object} ray - Ray exposing `trace(distance)`.
     * @param {object} options - SDF weights, input mapping, and tracing limits.
     * @returns {Color} Surface normal color or the background color.
     */
    const renderSDF = (ray, { sdfWeights, sdfInputVariables, maxIterations, epsilon, maxDistance, aabbClip }) => {
        const evaluate = point => {
            const coordinates = [point.x, point.y, point.z];
            const inputs = { ...sdfWeights };
            for (let i = 0; i < sdfInputVariables.length; i++) {
                const { name, axis } = sdfInputVariables[i];
                inputs[name] = coordinates[axis];
            }
            return sdfEval(inputs);
        };
        const gradient = point => {
            const dx = evaluate({ x: point.x + epsilon, y: point.y, z: point.z }) -
                evaluate({ x: point.x - epsilon, y: point.y, z: point.z });
            const dy = evaluate({ x: point.x, y: point.y + epsilon, z: point.z }) -
                evaluate({ x: point.x, y: point.y - epsilon, z: point.z });
            const dz = evaluate({ x: point.x, y: point.y, z: point.z + epsilon }) -
                evaluate({ x: point.x, y: point.y, z: point.z - epsilon });
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (length === 0 || !Number.isFinite(length)) return { x: 0, y: 0, z: 0 };
            return { x: dx / length, y: dy / length, z: dz / length };
        };
        const hitColor = point => {
            const normal = gradient(point);
            return Color.ofRGB(
                (normal.x + 1) / 2,
                (normal.y + 1) / 2,
                (normal.z + 1) / 2
            );
        };

        let t = aabbClip
            ? traceToAabb(ray, aabbClip, maxIterations, epsilon, maxDistance)
            : 0;
        if (t === null) return Color.BLACK;
        let previousT = 0;
        let previousDistance = 0;
        let hasPreviousSample = false;
        for (let i = 0; i < maxIterations; i++) {
            const point = ray.trace(t);
            if (aabbClip) {
                const boxDistance = signedDistanceToAabb(point.toArray(), aabbClip);
                if (boxDistance > 0) return Color.BLACK;
            }
            const distance = evaluate(point);
            if (!Number.isFinite(distance)) return Color.BLACK;
            if (hasPreviousSample && previousDistance * distance < 0) {
                const hitT = previousT + (t - previousT) * previousDistance / (previousDistance - distance);
                return hitColor(ray.trace(hitT));
            }
            previousT = t;
            previousDistance = distance;
            hasPreviousSample = true;
            if (Math.abs(distance) < epsilon) return hitColor(point);
            t += Math.max(distance, epsilon);
            if (t > maxDistance) return aabbClip ? Color.BLACK : Color.ofRGB(0, 0, i / maxIterations);
        }
        return Color.BLACK;
    };

    const paint = async () => {
        await camera.rayMapParallel(renderSDF, [
            evaluatorDependency,
            signedDistanceToAabb.toString(),
            traceToAabb.toString(),
        ]).to(canvas, {
            sdfWeights: { ...(expressionOrNN?.weightsMap ?? {}) },
            sdfInputVariables,
            maxIterations,
            epsilon,
            maxDistance,
            aabbClip,
        });
        return canvas.paint();
    };

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
        if (!mousedown || newMouse.equals(mouse)) return;
        const [dx, dy] = newMouse.sub(mouse).toArray();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(
            0,
            -2 * Math.PI * (dx / canvas.width),
            -2 * Math.PI * (dy / canvas.height)
        )));
        mouse = newMouse;
        paint();
    });
    canvas.onMouseWheel(e => {
        e.preventDefault();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(e.deltaY * 0.001, 0, 0)));
        paint();
    });

    return {
        render: () => paint(),
        toVisual: () => ({
            type: "canvas",
            value: async () => {
                const painted = await paint();
                painted.DOM.style.width = `${width * scale}px`;
                painted.DOM.style.height = `${height * scale}px`;
                return painted;
            }
        })
    };
}

// Compiles a Symbolic expression (or a NeuralNet's symbolicNN) to GLSL and raymarches it in a WebGL fragment shader.
/**
 * Visualizes a symbolic SDF in a WebGL fragment shader using ray marching.
 * @param {Symbolic|object} expressionOrNN - Symbolic expression or object with `symbolicNN` and `weightsMap`.
 * @param {object} options - Camera, canvas, and ray-marching configuration.
 * @param {number} [options.width=200] - Canvas width in pixels.
 * @param {number} [options.height=200] - Canvas height in pixels.
 * @param {number} [options.maxIterations=300] - Maximum ray-marching steps.
 * @param {number} [options.epsilon=1e-3] - Surface and normal-estimation tolerance.
 * @param {number} [options.maxDistance=10] - Maximum ray distance.
 * @param {number} [options.scale=3] - Display size multiplier for the canvas.
 * @param {{min: number[], max: number[]}|null} [options.aabbClip=null] - Optional 3D clipping bounds.
 * @returns {object} Interactive WebGL canvas visualization.
 */
IO.sdfViewSymGL = function (expressionOrNN, options = {}) {
    const {
        width = 200,
        height = 200,
        maxIterations = 300,
        epsilon = 1e-3,
        maxDistance = 10,
        scale = 3,
        aabbClip = null,
    } = options;
    validateAabbClip(aabbClip);
    const expression = expressionOrNN?.symbolicNN ?? expressionOrNN;
    const weightsMap = expressionOrNN?.symbolicNN
        ? expressionOrNN.weightsMap
        : {};

    const canvasDOM = document.createElement("canvas");
    canvasDOM.width = width;
    canvasDOM.height = height;
    canvasDOM.setAttribute("tabindex", "1");
    const gl = canvasDOM.getContext("webgl");
    if (!gl) throw new Error("WebGL is not supported by this browser");

    const glProgram = { current: null, uniforms: null };
    const orbitCoords = { radius: 5, theta: 0, phi: 0 };

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const buildProgram = () => {
        const fragmentSource = buildSdfFragmentShader(expression, weightsMap, { maxIterations, epsilon, maxDistance });
        const program = createShaderProgram(gl, SDF_VERTEX_SHADER, fragmentSource);
        const aPosition = gl.getAttribLocation(program, "aPosition");
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
        glProgram.current = program;
        glProgram.uniforms = {
            resolution: gl.getUniformLocation(program, "uResolution"),
            camPos: gl.getUniformLocation(program, "uCamPos"),
            basis0: gl.getUniformLocation(program, "uBasis0"),
            basis1: gl.getUniformLocation(program, "uBasis1"),
            basis2: gl.getUniformLocation(program, "uBasis2"),
            aabbMin: gl.getUniformLocation(program, "uAabbMin"),
            aabbMax: gl.getUniformLocation(program, "uAabbMax"),
            useAabbClip: gl.getUniformLocation(program, "uUseAabbClip"),
        };
    };
    buildProgram();

    const paint = () => {
        const { basis0, basis1, basis2, position } = orbitBasis(orbitCoords);
        gl.useProgram(glProgram.current);
        gl.viewport(0, 0, width, height);
        gl.uniform2f(glProgram.uniforms.resolution, width, height);
        gl.uniform3f(glProgram.uniforms.camPos, ...position);
        gl.uniform3f(glProgram.uniforms.basis0, ...basis0);
        gl.uniform3f(glProgram.uniforms.basis1, ...basis1);
        gl.uniform3f(glProgram.uniforms.basis2, ...basis2);
        gl.uniform3f(glProgram.uniforms.aabbMin, ...(aabbClip?.min ?? [0, 0, 0]));
        gl.uniform3f(glProgram.uniforms.aabbMax, ...(aabbClip?.max ?? [0, 0, 0]));
        gl.uniform1i(glProgram.uniforms.useAabbClip, aabbClip ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        return canvasDOM;
    };

    let mousedown = false;
    let mouse = Vec2();
    canvasDOM.addEventListener("mousedown", (e) => {
        mousedown = true;
        mouse = Vec2(e.offsetX, e.offsetY);
    });
    canvasDOM.addEventListener("mouseup", () => {
        mousedown = false;
        mouse = Vec2();
    });
    canvasDOM.addEventListener("mousemove", (e) => {
        const newMouse = Vec2(e.offsetX, e.offsetY);
        if (!mousedown || newMouse.equals(mouse)) {
            return;
        }
        const [dx, dy] = newMouse.sub(mouse).toArray();
        orbitCoords.theta += 2 * Math.PI * (dx / width);
        orbitCoords.phi += -2 * Math.PI * (dy / height);
        mouse = newMouse;
        paint();
    });
    canvasDOM.addEventListener("wheel", (e) => {
        e.preventDefault();
        orbitCoords.radius += e.deltaY * 0.001;
        paint();
    }, { passive: false });

    return {
        render: () => {
            buildProgram();
            return paint();
        },
        toVisual: () => {
            return {
                type: "canvas",
                value: () => {
                    paint();
                    canvasDOM.style.width = `${width * scale}px`;
                    canvasDOM.style.height = `${height * scale}px`;
                    return { DOM: canvasDOM };
                }
            };
        }
    };
}

// ---------------------------------------------------------------------------
// Shader compilation and rendering helpers
// ---------------------------------------------------------------------------

const SDF_VERTEX_SHADER = `
attribute vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * Formats a JavaScript number as a GLSL floating-point literal.
 * @param {number} value - Number to format.
 * @returns {string} GLSL-compatible float literal.
 */
function glslFloat(value) {
    const number = Number.isFinite(value) ? value : 0;
    const str = number.toString();
    return /[.eE]/.test(str) ? str : `${str}.0`;
}

/**
 * Compiles and links a WebGL shader program.
 * @param {WebGLRenderingContext} gl - WebGL context used for compilation.
 * @param {string} vertexSource - Vertex shader source.
 * @param {string} fragmentSource - Fragment shader source.
 * @returns {WebGLProgram} Linked shader program.
 * @throws {Error} If either shader fails to compile or the program fails to link.
 */
function createShaderProgram(gl, vertexSource, fragmentSource) {
    /**
     * Compiles a single WebGL shader.
     * @param {number} type - WebGL shader type.
     * @param {string} source - Shader source code.
     * @returns {WebGLShader} Compiled shader.
     * @throws {Error} If shader compilation fails.
     */
    const compile = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compile error: ${log}`);
        }
        return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        throw new Error(`Program link error: ${log}`);
    }
    return program;
}

/**
 * Converts a symbolic scalar expression to a GLSL SDF evaluator.
 * @param {object} expression - Symbolic expression tree to compile.
 * @param {object} weightsMap - Numeric values keyed by symbolic variable name.
 * @remarks Non-parameter variables are emitted as literals; `x_0`, `x_1`, and `x_2` map to `p.x`, `p.y`, and `p.z`.
 * @returns {string} GLSL function source for `sdfEval`.
 */
function compileSymbolicToGLSL(expression, weightsMap) {
    const { TYPES } = Symbolic;
    const expressionsToNames = new Map();
    const statements = [];

    /**
     * Resolves a symbolic variable to a GLSL input or literal.
     * @param {object} expr - Symbolic variable expression.
     * @returns {string} GLSL value expression.
     */
    const emitVar = (expr) => {
        if (expr.isParam) {
            const match = /^x_(\d+)$/.exec(expr.name);
            const axis = match && ["x", "y", "z"][Number(match[1])];
            if (!axis) throw new Error(`GLSL SDF compile only supports up to 3 input dimensions, got "${expr.name}"`);
            return `p.${axis}`;
        }
        if (!(expr.name in weightsMap)) throw new Error(`Missing weight value for "${expr.name}" during GLSL compile`);
        return glslFloat(weightsMap[expr.name]);
    };

    /**
     * Emits GLSL for a symbolic operation node.
     * @param {object} expr - Symbolic operation expression.
     * @returns {string} GLSL expression source.
     */
    const emitExpression = (expr) => {
        switch (expr.type) {
            case TYPES.add: return `(${emit(expr.left)} + ${emit(expr.right)})`;
            case TYPES.sub: return `(${emit(expr.left)} - ${emit(expr.right)})`;
            case TYPES.mul: return `(${emit(expr.left)} * ${emit(expr.right)})`;
            case TYPES.div: return `(${emit(expr.left)} / ${emit(expr.right)})`;
            case TYPES.exp: return `exp(${emit(expr.value)})`;
            case TYPES.log: return `log(${emit(expr.value)})`;
            case TYPES.cos: return `cos(${emit(expr.value)})`;
            case TYPES.sin: return `sin(${emit(expr.value)})`;
            case TYPES.tan: return `tan(${emit(expr.value)})`;
            default: throw new Error(`Unsupported expression type in GLSL compile: ${expr.type}`);
        }
    };

    /**
     * Emits an expression, reusing a temporary for repeated nodes.
     * @param {object} expr - Symbolic expression to emit.
     * @returns {string} GLSL variable or literal name.
     */
    function emit(expr) {
        if (expr.type === TYPES.real) return glslFloat(expr.value);
        if (expr.type === TYPES.realVar) return emitVar(expr);
        if (expressionsToNames.has(expr)) return expressionsToNames.get(expr);
        const name = `t${expressionsToNames.size}`;
        expressionsToNames.set(expr, name);
        statements.push(`float ${name} = ${emitExpression(expr)};`);
        return name;
    }

    const resultName = emit(expression);
    return `float sdfEval(vec3 p) {\n    ${statements.join("\n    ")}\n    return ${resultName};\n}`;
}

/**
 * Builds a fragment shader that ray-marches a symbolic SDF.
 * @param {object} expression - Symbolic expression tree to compile.
 * @param {object} weightsMap - Numeric values keyed by symbolic variable name.
 * @param {object} options - Shader ray-marching configuration.
 * @param {number} options.maxIterations - Maximum tracing steps.
 * @param {number} options.epsilon - Surface and normal-estimation tolerance.
 * @param {number} options.maxDistance - Maximum ray distance.
 * @returns {string} Complete GLSL fragment shader source.
 */
function buildSdfFragmentShader(expression, weightsMap, { maxIterations, epsilon, maxDistance }) {
    const sdfFunction = compileSymbolicToGLSL(expression, weightsMap);
    return `
precision highp float;
uniform vec2 uResolution;
uniform vec3 uCamPos;
uniform vec3 uBasis0;
uniform vec3 uBasis1;
uniform vec3 uBasis2;
uniform vec3 uAabbMin;
uniform vec3 uAabbMax;
uniform bool uUseAabbClip;

${sdfFunction}

vec3 sdfGradient(vec3 p) {
    float h = ${glslFloat(epsilon)};
    float dx = sdfEval(p + vec3(h, 0.0, 0.0)) - sdfEval(p - vec3(h, 0.0, 0.0));
    float dy = sdfEval(p + vec3(0.0, h, 0.0)) - sdfEval(p - vec3(0.0, h, 0.0));
    float dz = sdfEval(p + vec3(0.0, 0.0, h)) - sdfEval(p - vec3(0.0, 0.0, h));
    vec3 n = vec3(dx, dy, dz);
    float len = length(n);
    return len > 0.0 ? n / len : vec3(0.0);
}

float sdfAabb(vec3 p) {
    vec3 center = 0.5 * (uAabbMin + uAabbMax);
    vec3 halfSize = 0.5 * (uAabbMax - uAabbMin);
    vec3 q = abs(p - center) - halfSize;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

bool traceAabb(vec3 ro, vec3 rd, inout float t) {
    if (sdfAabb(ro) <= 0.0) return true;
    bool nearAabb = false;
    for (int i = 0; i < ${maxIterations}; i++) {
        float boxDistance = sdfAabb(ro + rd * t);
        if (boxDistance <= 0.0) return true;
        if (nearAabb && boxDistance > ${glslFloat(epsilon)}) return false;
        nearAabb = boxDistance <= ${glslFloat(epsilon)};
        t += nearAabb ? ${glslFloat(epsilon)} : boxDistance;
        if (t > ${glslFloat(maxDistance)}) return false;
    }
    return false;
}

vec3 renderSDF(vec3 ro, vec3 rd) {
    float t = 0.0;
    if (uUseAabbClip && !traceAabb(ro, rd, t)) return vec3(0.0);
    float previousT = 0.0;
    float previousD = 0.0;
    bool hasPreviousSample = false;
    for (int i = 0; i < ${maxIterations}; i++) {
        vec3 p = ro + rd * t;
        if (uUseAabbClip) {
            float boxDistance = sdfAabb(p);
            if (boxDistance > 0.0) return vec3(0.0);
        }
        float d = sdfEval(p);
        if (d != d) return vec3(0.0);
        if (hasPreviousSample && previousD * d < 0.0) {
            float hitT = previousT + (t - previousT) * previousD / (previousD - d);
            vec3 n = sdfGradient(ro + rd * hitT);
            return (n + 1.0) / 2.0;
        }
        previousT = t;
        previousD = d;
        hasPreviousSample = true;
        if (abs(d) < ${glslFloat(epsilon)}) {
            vec3 n = sdfGradient(p);
            return (n + 1.0) / 2.0;
        }
        t += max(d, ${glslFloat(epsilon)});
        if (t > ${glslFloat(maxDistance)}) {
            if (uUseAabbClip) return vec3(0.0);
            return vec3(0.0, 0.0, float(i) / float(${maxIterations}));
        }
    }
    return vec3(0.0);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution - 0.5;
    vec3 dirLocal = vec3(uv.x, uv.y, 1.0);
    vec3 dir = normalize(uBasis0 * dirLocal.x + uBasis1 * dirLocal.y + uBasis2 * dirLocal.z);
    gl_FragColor = vec4(renderSDF(uCamPos, dir), 1.0);
}
`;
}

// Mirrors tela.js Camera.orbit/orient basis computation.
/**
 * Computes camera basis vectors and position from spherical orbit coordinates.
 * @param {{radius: number, theta: number, phi: number}} orbit - Camera orbit state in radians.
 * @returns {{basis0: number[], basis1: number[], basis2: number[], position: number[]}} Camera basis and position.
 */
function orbitBasis({ radius, theta, phi }) {
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    const basis0 = [-sinT, cosT, 0];
    const basis1 = [-sinP * cosT, -sinP * sinT, cosP];
    const basis2 = [-cosP * cosT, -cosP * sinT, -sinP];
    const position = [radius * cosP * cosT, radius * cosP * sinT, radius * sinP];
    return { basis0, basis1, basis2, position };
}

/**
 * Creates a layer of points with associated colors and radii.
 * @param {Array|NArray} points - Coordinates as arrays, vectors, or an NArray.
 * @param {object} options - Layer appearance.
 * @param {Array|Color} [options.color=[1, 0, 0]] - Shared color or one color per point.
 * @param {number|number[]} [options.radius=0.01] - Shared radius or radii cycled across points.
 * @param {Function} vector - Vector constructor used to create point vectors.
 * @returns {{layer: object, update: Function}} Layer data and its update method.
 */
// ---------------------------------------------------------------------------
// Point-cloud plotting helpers
// ---------------------------------------------------------------------------

function createLayer(points, { color = [1, 0, 0], radius = 0.01 } = {}, vector) {
    points = points?.toArray?.() ?? points;
    color = color?.toArray?.() ?? color;
    radius = radius?.toArray?.() ?? radius;
    const layer = { points: [], radiuses: [], colors: [] };
    /**
     * Replaces the layer points and optionally changes their color.
     * @param {Array|NArray} nextPoints - Replacement point coordinates.
     * @param {object} options - Optional appearance updates.
     * @param {Array|Color} [options.color] - Replacement shared or per-point color.
     */
    const update = (nextPoints, options = {}) => {
        if (options.color !== undefined) color = options.color?.toArray?.() ?? options.color;
        const pointArray = nextPoints?.toArray?.() ?? nextPoints;
        layer.points = pointArray.map(point => vector(...(point?.toArray?.() ?? point)));
        const radiusAt = Array.isArray(radius) ? i => radius[i % radius.length] : () => radius;
        // color is either a single [r, g, b] or an array of colors, one per point
        const perPoint = Array.isArray(color) && typeof color[0] !== "number";
        const toColor = c => (Array.isArray(c) ? Color.ofRGB(...c) : c);
        layer.radiuses = pointArray.map((_, i) => radiusAt(i));
        layer.colors = pointArray.map((_, i) => toColor(perPoint ? color[i % color.length] : color));
    };
    update(points);
    return { layer, update };
}

/**
 * Concatenates points and appearance data from multiple scenes.
 * @param {object[]} scenes - Scene records containing `points`, `radiuses`, and `colors`.
 * @returns {object} Combined scene record.
 */
function combineScenes(scenes) {
    return scenes.reduce((combined, scene) => ({
        points: combined.points.concat(scene.points),
        radiuses: combined.radiuses.concat(scene.radiuses),
        colors: combined.colors.concat(scene.colors),
    }), { points: [], radiuses: [], colors: [] });
}

/**
 * Creates an interactive 2D point-cloud plot.
 * @param {Array|NArray} points - 2D point coordinates.
 * @param {object} options - Canvas and point appearance settings.
 * @param {number} [options.width=500] - Canvas width in pixels.
 * @param {number} [options.height=500] - Canvas height in pixels.
 * @param {object} [options.scene={}] - Additional scene points, radii, and colors.
 * @param {Array|Color} [options.color=[1, 0, 0]] - Point color or per-point colors.
 * @param {number|number[]} [options.radius=0.01] - Point radius or per-point radii.
 * @returns {object} Interactive plot with update and layer-addition methods.
 */
function plot2d(points, { width = 500, height = 500, scene = {}, color = [1, 0, 0], radius = 0.01 } = {}) {
    // Normalize points to fit in the canvas
    scene = {
        points: scene.points || [],
        radiuses: scene.radiuses || [],
        colors: scene.colors || [],
    };
    const base = createLayer(points, { color, radius }, Vec2);
    const layers = [base.layer];

    let canvas = Canvas.ofSize(width, height);
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
        const renderedScene = combineScenes([scene, ...layers]);
        let box = new Box();
        for (let i = 0; i < renderedScene.points.length; i++) {
            const radius_i = renderedScene.radiuses[i] || 0.01;
            const vec_radius = Vec2(radius_i, radius_i);
            box = box.add(new Box(renderedScene.points[i].sub(vec_radius), renderedScene.points[i].add(vec_radius)));
        }
        // uniform scale keeps the proportions; per-axis division would deform the shape
        const maxExtent = Math.max(...box.diagonal.toArray()) || 1;
        const center = box.center;
        const normalizedSceneVecs = renderedScene.points.map(v =>
            v.sub(center).scale(2 / maxExtent)
        );
        const sceneObj = new NaiveScene();
        sceneObj.addList(normalizedSceneVecs.map((v, i) =>
            Sphere.builder().position(v).radius(renderedScene.radiuses[i]).color(renderedScene.colors[i]).build()
        ));
        canvas.fill(Color.BLACK)
        return camera
            .raster(sceneObj)
            .to(canvas)
            .paint();
    }
    return {
        update: base.update,
        /**
         * Adds a point layer to the plot.
         * @param {Array|NArray} layerPoints - Point coordinates for the new layer.
         * @param {object} options - Layer color and radius settings.
         * @returns {{update: Function}} Update method for the added layer.
         */
        add: (layerPoints, options) => {
            const layer = createLayer(layerPoints, options, Vec2);
            layers.push(layer.layer);
            return { update: layer.update };
        },
        canvas,
        render: paint,
        toVisual: () => {
            return { type: "canvas", value: () => paint() };
        },
        scene: scene,
    };
}

/**
 * Creates an interactive 3D point-cloud plot.
 * @param {Array|NArray} points - 3D point coordinates.
 * @param {object} options - Canvas and point appearance settings.
 * @param {number} [options.width=500] - Canvas width in pixels.
 * @param {number} [options.height=500] - Canvas height in pixels.
 * @param {object} [options.scene={}] - Additional scene points, radii, and colors.
 * @param {Array|Color} [options.color=[1, 0, 0]] - Point color or per-point colors.
 * @param {number|number[]} [options.radius=0.01] - Point radius or per-point radii.
 * @returns {object} Interactive plot with update and layer-addition methods.
 */
function plot3d(points, { width = 500, height = 500, scene = {}, color = [1, 0, 0], radius = 0.01 } = {}) {
    // Normalize points to fit in the canvas
    scene = {
        points: scene.points || [],
        radiuses: scene.radiuses || [],
        colors: scene.colors || [],
    };
    const base = createLayer(points, { color, radius }, Vec3);
    const layers = [base.layer];
    let canvas = Canvas.ofSize(width, height);
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
        e.preventDefault();
        camera.orbit(sphereCoords => sphereCoords.add(Vec3(e.deltaY * 0.001, 0, 0)));
        paint();
    });
    const paint = () => {
        const renderedScene = combineScenes([scene, ...layers]);
        let box = new Box();
        for (let i = 0; i < renderedScene.points.length; i++) {
            const radius_i = renderedScene.radiuses[i] || 0.01;
            const vec_radius = Vec3(radius_i, radius_i, radius_i);
            box = box.add(new Box(renderedScene.points[i].sub(vec_radius), renderedScene.points[i].add(vec_radius)));
        }
        // uniform scale keeps the proportions; per-axis division would deform the shape
        const maxExtent = Math.max(...box.diagonal.toArray()) || 1;
        const center = box.center;
        const normalizedSceneVecs = renderedScene.points.map(v =>
            v.sub(center).scale(2 / maxExtent)
        );
        const sceneObj = new NaiveScene();
        sceneObj.addList(normalizedSceneVecs.map((v, i) =>
            Sphere.builder().position(v).radius(renderedScene.radiuses[i]).color(renderedScene.colors[i]).build()
        ));
        canvas.fill(Color.BLACK)
        return camera
            .raster(sceneObj)
            .to(canvas)
            .paint();
    }
    return {
        update: base.update,
        /**
         * Adds a point layer to the plot.
         * @param {Array|NArray} layerPoints - Point coordinates for the new layer.
         * @param {object} options - Layer color and radius settings.
         * @returns {{update: Function}} Update method for the added layer.
         */
        add: (layerPoints, options) => {
            const layer = createLayer(layerPoints, options, Vec3);
            layers.push(layer.layer);
            return { update: layer.update };
        },
        canvas,
        render: paint,
        toVisual: () => {
            return { type: "canvas", value: () => paint() };
        },
        scene: scene
    };
}

// ---------------------------------------------------------------------------
// Line-cloud plotting helpers
// ---------------------------------------------------------------------------

/**
 * Converts line endpoints to coordinate arrays and validates their dimensions.
 * @param {Array|NArray} lines - Segments represented by pairs of endpoints.
 * @param {number} [expectedDimensions] - Required coordinate dimension for layer updates.
 * @returns {{segments: number[][][], dimensions: number}} Normalized segments and their dimension.
 */
function normalizeLineSegments(lines, expectedDimensions) {
    const input = lines?.toArray?.() ?? lines;
    if (!Array.isArray(input)) {
        throw new Error("Lines must be an array of endpoint pairs");
    }
    if (input.length === 0 && expectedDimensions === undefined) {
        throw new Error("At least one line is required to determine whether the plot is 2D or 3D");
    }

    let dimensions = expectedDimensions;
    const segments = input.map((line, lineIndex) => {
        const endpoints = line?.toArray?.() ?? line;
        if (!Array.isArray(endpoints) || endpoints.length !== 2) {
            throw new Error(`Line ${lineIndex} must contain exactly two endpoints`);
        }

        const coordinates = endpoints.map(endpoint => endpoint?.toArray?.() ?? endpoint);
        for (const point of coordinates) {
            if (!Array.isArray(point)) {
                throw new Error(`Endpoints in line ${lineIndex} must be coordinate arrays or vectors`);
            }
            if (dimensions === undefined) {
                dimensions = point.length;
                if (dimensions !== 2 && dimensions !== 3) {
                    throw new Error("Line endpoints must be 2D or 3D");
                }
            }
            if (point.length !== dimensions) {
                throw new Error(`Every line endpoint must have ${dimensions} coordinates`);
            }
        }
        return coordinates;
    });

    return { segments, dimensions };
}

/**
 * Resolves one shared line color or a color for each segment.
 * @param {Array|Color} color - RGB array, tela.js Color, or array of per-line colors.
 * @param {number} count - Number of line segments to color.
 * @returns {Color[]} Colors assigned to each segment.
 */
function getLineColors(color, count) {
    const normalizedColor = color?.toArray?.() ?? color;
    const hasPerLineColors = Array.isArray(normalizedColor) && typeof normalizedColor[0] !== "number";
    if (hasPerLineColors && normalizedColor.length === 0) {
        throw new Error("The line color list must not be empty");
    }

    return Array.from({ length: count }, (_, index) => {
        const lineColor = hasPerLineColors
            ? normalizedColor[index % normalizedColor.length]
            : normalizedColor;
        const value = lineColor?.toArray?.() ?? lineColor;
        return Array.isArray(value) ? Color.ofRGB(...value) : value;
    });
}

/**
 * Creates a mutable layer of line segments and their colors.
 * @param {Array|NArray} lines - Segments represented by pairs of endpoints.
 * @param {object} options - Layer appearance.
 * @param {Array|Color} [options.color=[1, 0, 0]] - Shared color or per-line colors.
 * @param {number} [options.radius=0.01] - Line radius for 3D rendering.
 * @param {number} dimensions - Coordinate dimension, either 2 or 3.
 * @returns {{layer: object, update: Function}} Layer data and its update method.
 */
function createLineLayer(lines, { color = [1, 0, 0], radius = 0.01 } = {}, dimensions) {
    const vector = dimensions === 2 ? Vec2 : Vec3;
    const layer = { lines: [], colors: [], radius };

    /**
     * Replaces the segments and optionally changes their colors.
     * @param {Array|NArray} nextLines - Replacement segments.
     * @param {object} options - Optional layer appearance updates.
     * @param {Array|Color} [options.color] - Replacement shared color or per-line colors.
     */
    const update = (nextLines, options = {}) => {
        const { segments } = normalizeLineSegments(nextLines, dimensions);
        const nextColor = options.color ?? color;
        const colors = getLineColors(nextColor, segments.length);
        layer.lines = segments.map(segment =>
            segment.map(point => vector(...point))
        );
        color = nextColor;
        layer.colors = colors;
    };

    update(lines);
    return { layer, update };
}

/**
 * Creates an interactive 2D or 3D line plot.
 * @param {Array|NArray} lines - Segments represented by pairs of endpoints.
 * @param {number} dimensions - Coordinate dimension, either 2 or 3.
 * @param {object} options - Canvas and line appearance settings.
 * @returns {object} Interactive plot with update, add, render, and toVisual methods.
 */
function plotLines(lines, dimensions, options = {}) {
    const {
        width = 500,
        height = 500,
        color = [1, 0, 0],
        radius = 0.01,
    } = options;
    const base = createLineLayer(lines, { color, radius }, dimensions);
    const layers = [base.layer];
    let canvas = Canvas.ofSize(width, height);
    const is2d = dimensions === 2;
    let cameraBox;
    let camera;
    if (is2d) {
        cameraBox = new Box(Vec2(-1, -1), Vec2(1, 1)).scale(1.2);
        camera = new Camera2D(cameraBox);
    } else {
        camera = new Camera().orbit(5, 0, 0);
    }

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
        if (!mousedown || newMouse.equals(mouse)) return;

        const [dx, dy] = newMouse.sub(mouse).toArray();
        if (is2d) {
            const movement = Vec2(dx, dy)
                .scale(-1)
                .div(Vec2(width, height))
                .mul(cameraBox.diagonal);
            cameraBox = cameraBox.move(movement);
            camera.box = cameraBox;
        } else {
            camera.orbit(sphereCoords =>
                sphereCoords.add(
                    Vec3(
                        0,
                        -2 * Math.PI * (dx / canvas.width),
                        -2 * Math.PI * (dy / canvas.height)
                    )
                )
            );
        }
        mouse = newMouse;
        paint();
    });
    canvas.onMouseWheel(e => {
        e.preventDefault();
        if (is2d) {
            cameraBox = cameraBox.scale(1 + Math.sign(e.deltaY) * 1e-1);
            camera.box = cameraBox;
        } else {
            camera.orbit(sphereCoords => sphereCoords.add(Vec3(e.deltaY * 0.001, 0, 0)));
        }
        paint();
    });

    const paint = () => {
        const allLines = layers.flatMap(layer => layer.lines);
        canvas.fill(Color.BLACK);
        if (allLines.length === 0) {
            const emptyScene = new NaiveScene();
            return camera.raster(emptyScene).to(canvas).paint();
        }

        let box = new Box();
        for (const [start, end] of allLines) {
            box = box.add(new Box(start, end));
        }
        const maxExtent = Math.max(...box.diagonal.toArray()) || 1;
        const center = box.center;
        const scale = 2 / maxExtent;
        const scene = new NaiveScene();
        for (const layer of layers) {
            const elements = layer.lines.map(([start, end], index) =>
                Line.builder()
                    .positions(
                        start.sub(center).scale(scale),
                        end.sub(center).scale(scale)
                    )
                    .colors(layer.colors[index], layer.colors[index])
                    .radius(layer.radius)
                    .build()
            );
            scene.addList(elements);
        }
        return camera.raster(scene).to(canvas).paint();
    };

    return {
        update: base.update,
        add: (nextLines, layerOptions = {}) => {
            const layer = createLineLayer(nextLines, layerOptions, dimensions);
            layers.push(layer.layer);
            return { update: layer.update };
        },
        canvas,
        render: paint,
        toVisual: () => ({
            type: "canvas",
            value: () => paint(),
        }),
    };
}

// ---------------------------------------------------------------------------
// Triangle-cloud plotting helpers
// ---------------------------------------------------------------------------

/**
 * Converts triangle vertices to coordinate arrays and validates their dimensions.
 * @param {Array|NArray} triangles - Triangles represented by three vertices each.
 * @param {number} [expectedDimensions] - Required coordinate dimension for layer updates.
 * @returns {{faces: number[][][], dimensions: number}} Normalized triangles and their dimension.
 */
function normalizeTriangles(triangles, expectedDimensions) {
    const input = triangles?.toArray?.() ?? triangles;
    if (!Array.isArray(input)) {
        throw new Error("Triangles must be an array of vertex triples");
    }
    if (input.length === 0 && expectedDimensions === undefined) {
        throw new Error("At least one triangle is required to determine whether the plot is 2D or 3D");
    }

    let dimensions = expectedDimensions;
    const faces = input.map((triangle, triangleIndex) => {
        const vertices = triangle?.toArray?.() ?? triangle;
        if (!Array.isArray(vertices) || vertices.length !== 3) {
            throw new Error(`Triangle ${triangleIndex} must contain exactly three vertices`);
        }

        const coordinates = vertices.map(vertex => vertex?.toArray?.() ?? vertex);
        for (const point of coordinates) {
            if (!Array.isArray(point) || point.some(value => !Number.isFinite(value))) {
                throw new Error(`Vertices in triangle ${triangleIndex} must be finite coordinate arrays or vectors`);
            }
            if (dimensions === undefined) {
                dimensions = point.length;
                if (dimensions !== 2 && dimensions !== 3) {
                    throw new Error("Triangle vertices must be 2D or 3D");
                }
            }
            if (point.length !== dimensions) {
                throw new Error(`Every triangle vertex must have ${dimensions} coordinates`);
            }
        }
        return coordinates;
    });

    return { faces, dimensions };
}

/**
 * Converts an RGB triplet or tela.js color to a Color instance.
 * @param {Color|number[]} color - Color instance or RGB channel values.
 * @returns {Color} Normalized color.
 */
function normalizeTriangleColor(color) {
    if (color instanceof Color) return color;
    if (!Array.isArray(color) || color.length !== 3 || color.some(value => !Number.isFinite(value))) {
        throw new Error("Triangle colors must be tela.js Color instances or RGB triplets");
    }
    return Color.ofRGB(...color);
}

/**
 * Resolves a shared color, one color per triangle, or three vertex colors per triangle.
 * @param {Color|number[]|Color[]|Color[][]} color - Color configuration.
 * @param {number} count - Number of triangles to color.
 * @returns {Color[][]} Three colors for each triangle.
 */
function getTriangleColors(color, count) {
    if (color instanceof Color || (Array.isArray(color) && color.length === 3 && color.every(Number.isFinite))) {
        const sharedColor = normalizeTriangleColor(color);
        return Array.from({ length: count }, () => [sharedColor, sharedColor, sharedColor]);
    }
    if (!Array.isArray(color) || color.length === 0) {
        throw new Error("Triangle color must be a color, a per-triangle color array, or per-vertex colors");
    }
    if (color.length !== count) {
        throw new Error(`Expected ${count} triangle colors, received ${color.length}`);
    }

    return color.map((triangleColor, triangleIndex) => {
        if (triangleColor instanceof Color ||
            (Array.isArray(triangleColor) && triangleColor.length === 3 && triangleColor.every(Number.isFinite))) {
            const solidColor = normalizeTriangleColor(triangleColor);
            return [solidColor, solidColor, solidColor];
        }
        if (!Array.isArray(triangleColor) || triangleColor.length !== 3) {
            throw new Error(`Color for triangle ${triangleIndex} must be one color or three vertex colors`);
        }
        return triangleColor.map(normalizeTriangleColor);
    });
}

/**
 * Creates a mutable layer of triangles and their vertex colors.
 * @param {Array|NArray} triangles - Triangles represented by three vertices each.
 * @param {object} options - Layer appearance.
 * @param {Color|number[]|Color[]|Color[][]} [options.color=[1, 0, 0]] - Shared, per-triangle, or per-vertex colors.
 * @param {number} dimensions - Coordinate dimension, either 2 or 3.
 * @returns {{layer: object, update: Function}} Layer data and its update method.
 */
function createTriangleLayer(triangles, { color = [1, 0, 0] } = {}, dimensions) {
    const vector = dimensions === 2 ? Vec2 : Vec3;
    const layer = { triangles: [], colors: [] };

    /**
     * Replaces the triangles and optionally changes their colors.
     * @param {Array|NArray} nextTriangles - Replacement triangles.
     * @param {object} options - Optional layer appearance updates.
     * @param {Color|number[]|Color[]|Color[][]} [options.color] - Replacement shared, per-triangle, or per-vertex colors.
     */
    const update = (nextTriangles, options = {}) => {
        const { faces } = normalizeTriangles(nextTriangles, dimensions);
        const nextColor = options.color ?? color;
        const colors = getTriangleColors(nextColor, faces.length);
        layer.triangles = faces.map(face => face.map(point => vector(...point)));
        layer.colors = colors;
        color = nextColor;
    };

    update(triangles);
    return { layer, update };
}

/**
 * Creates an interactive 2D or 3D triangle plot.
 * @param {Array|NArray} triangles - Triangles represented by three vertices each.
 * @param {number} dimensions - Coordinate dimension, either 2 or 3.
 * @param {object} options - Canvas and triangle appearance settings.
 * @returns {object} Interactive plot with update, add, render, and toVisual methods.
 */
function plotTriangles(triangles, dimensions, options = {}) {
    const { width = 500, height = 500, color = [1, 0, 0] } = options;
    const base = createTriangleLayer(triangles, { color }, dimensions);
    const layers = [base.layer];
    const canvas = Canvas.ofSize(width, height);
    const is2d = dimensions === 2;
    let cameraBox;
    let camera;
    if (is2d) {
        cameraBox = new Box(Vec2(-1, -1), Vec2(1, 1)).scale(1.2);
        camera = new Camera2D(cameraBox);
    } else {
        camera = new Camera().orbit(5, 0, 0);
    }

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
        if (!mousedown || newMouse.equals(mouse)) return;

        const [dx, dy] = newMouse.sub(mouse).toArray();
        if (is2d) {
            const movement = Vec2(dx, dy)
                .scale(-1)
                .div(Vec2(width, height))
                .mul(cameraBox.diagonal);
            cameraBox = cameraBox.move(movement);
            camera.box = cameraBox;
        } else {
            camera.orbit(sphereCoords =>
                sphereCoords.add(
                    Vec3(
                        0,
                        -2 * Math.PI * (dx / canvas.width),
                        -2 * Math.PI * (dy / canvas.height)
                    )
                )
            );
        }
        mouse = newMouse;
        paint();
    });
    canvas.onMouseWheel(e => {
        e.preventDefault();
        if (is2d) {
            cameraBox = cameraBox.scale(1 + Math.sign(e.deltaY) * 1e-1);
            camera.box = cameraBox;
        } else {
            camera.orbit(sphereCoords => sphereCoords.add(Vec3(e.deltaY * 0.001, 0, 0)));
        }
        paint();
    });

    const paint = () => {
        const allTriangles = layers.flatMap(layer => layer.triangles);
        canvas.fill(Color.BLACK);
        if (allTriangles.length === 0) {
            return camera.raster(new NaiveScene(), { cullBackFaces: false }).to(canvas).paint();
        }

        let box = new Box();
        for (const triangle of allTriangles) {
            for (const point of triangle) {
                box = box.add(new Box(point, point));
            }
        }
        const maxExtent = Math.max(...box.diagonal.toArray()) || 1;
        const center = box.center;
        const scale = 2 / maxExtent;
        const scene = new NaiveScene();
        for (const layer of layers) {
            const elements = layer.triangles.map((triangle, index) =>
                Triangle.builder()
                    .positions(...triangle.map(point => point.sub(center).scale(scale)))
                    .colors(...layer.colors[index])
                    .radius(0)
                    .build()
            );
            scene.addList(elements);
        }
        return camera.raster(scene, { cullBackFaces: false }).to(canvas).paint();
    };

    return {
        update: base.update,
        add: (nextTriangles, layerOptions = {}) => {
            const layer = createTriangleLayer(nextTriangles, layerOptions, dimensions);
            layers.push(layer.layer);
            return { update: layer.update };
        },
        canvas,
        render: paint,
        toVisual: () => ({
            type: "canvas",
            value: () => paint(),
        }),
    };
}

// ---------------------------------------------------------------------------
// OBJ parsing helpers
// ---------------------------------------------------------------------------

/**
 * Triangulates a triangular or quadrilateral polygon.
 * @param {Array} polygon - Polygon vertex references in winding order.
 * @returns {Array[]|undefined} Triangles, or `undefined` for unsupported vertex counts.
 */
function triangulate(polygon) {
    if (polygon.length === 3) {
        return [polygon];
    }
    if (polygon.length === 4) {
        return [
            [polygon[0], polygon[1], polygon[2]],
            [polygon[2], polygon[3], polygon[0]]
        ]
    }
}

/**
 * Parses OBJ face vertex descriptors into zero-based index lists.
 * @param {string[]} vertexInfo - Face tokens in `vertex/texture/normal` form.
 * @returns {{vertices: number[], textures: number[], normals: number[]}} Face indices.
 */
function parseFace(vertexInfo) {
    const facesInfo = vertexInfo
        .flatMap(x => x.split("/"))
        .map(x => Number.parseFloat(x));
    const length = facesInfo.length;
    const lengthDiv3 = Math.floor(length / 3);
    // vertex_index/texture_index/normal_index
    const group = groupBy(facesInfo, (_, i) => i % lengthDiv3);
    const face = { vertices: [], textures: [], normals: [] }
    Object.keys(group).map(k => {
        k = Number.parseInt(k);
        const indices = group[k].map(x => x - 1); // obj file is 1-indexed
        if (k === 0) face.vertices = indices;
        if (k === 1) face.textures = indices;
        if (k === 2) face.normals = indices;
    });
    return face;
}

/**
 * Groups array entries by a key returned from a callback.
 * @param {Array} array - Values to group.
 * @param {Function} groupFunction - Receives each value and index and returns its group key.
 * @returns {object} Groups keyed by the callback's return value.
 */
function groupBy(array, groupFunction) {
    const ans = {};
    array.forEach((x, i) => {
        const key = groupFunction(x, i);
        if (!ans[key]) ans[key] = [];
        ans[key].push(x);
    });
    return ans;
}

export default IO;
