import { Canvas, Color, Vec2, Vec3, Box, NaiveScene, Sphere, Camera, Camera2D } from "https://cdn.jsdelivr.net/npm/tela.js/src/index.js"
import { NArray } from "../src/NArray/index.js";
import { SOURCE } from "./utils.js";

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

IO.paintMNIST = function (mnistSamples, scale = 10) {
    const initialSamples = Array.isArray(mnistSamples) ? mnistSamples : [mnistSamples];
    const width = Math.sqrt(initialSamples[0].length);
    const height = width;
    const canvases = initialSamples.map(() => Canvas.ofSize(width, height));
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
}

IO.UI = function (...children) {
    return {
        toVisual: () => ({
            type: "ui",
            value: () => children,
        }),
    };
}

// points: array of [x, y] or [x, y, z]
IO.plotPointCloud = function (points, options = {}) {
    if (points instanceof NArray) {
        points = points.toArray();
    }
    const dimensions = points[0].length;
    if (dimensions < 2 || dimensions > 3) {
        throw new Error("Points must be 2D or 3D");
    }
    if (dimensions === 2) {
        return plot2d(points, options);
    }
    return plot3d(points, options);
}

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


IO.sdfView = function (sdfFn, options = {}) {
    const {
        width = 100,
        height = 100,
        maxIterations = 100,
        epsilon = 1e-3,
        maxDistance = 10,
        scale = 3,
    } = options;
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

    const renderSDF = (ray) => {
        const gradient = (p) => {
            const h = epsilon;
            const dx = sdfFn([p.x + h, p.y, p.z]) - sdfFn([p.x - h, p.y, p.z]);
            const dy = sdfFn([p.x, p.y + h, p.z]) - sdfFn([p.x, p.y - h, p.z]);
            const dz = sdfFn([p.x, p.y, p.z + h]) - sdfFn([p.x, p.y, p.z - h]);
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (length === 0 || !Number.isFinite(length)) return Vec3(0, 0, 0);
            return Vec3(dx / length, dy / length, dz / length);
        };
        let p = ray.init;
        let t = 0;
        for (let i = 0; i < maxIterations; i++) {
            p = ray.trace(t);
            const d = sdfFn([p.x, p.y, p.z]);
            if (!Number.isFinite(d)) return Color.BLACK;
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
                return Color.ofRGB(0, 0, maxDistance * (i / maxIterations));
            }
        }
        return Color.BLACK;
    };

    const paint = () => {
        return (camera.rayMap(renderSDF).to(canvas)).paint();
    };


    return {
        render: async () => await paint(),
        toVisual: () => {
            return {
                type: "canvas",
                value: async () => {
                    const painted = await paint();
                    painted.DOM.style.width = `${width * scale}px`;
                    painted.DOM.style.height = `${height * scale}px`;
                    return painted;
                }
            };
        }
    };
}

//========================================================================================
/*                                                                                      *
 *                                         UTILS                                        *
 *                                                                                      */
//========================================================================================

function createLayer(points, { color = [1, 0, 0], radius = 0.01 } = {}, vector) {
    const layer = { points: [], radiuses: [], colors: [] };
    const update = nextPoints => {
        const pointArray = nextPoints?.toArray?.() ?? nextPoints;
        layer.points = pointArray.map(point => vector(...point));
        layer.radiuses = pointArray.map(() => radius);
        layer.colors = pointArray.map(() => Color.ofRGB(...color));
    };
    update(points);
    return { layer, update };
}

function combineScenes(scenes) {
    return scenes.reduce((combined, scene) => ({
        points: combined.points.concat(scene.points),
        radiuses: combined.radiuses.concat(scene.radiuses),
        colors: combined.colors.concat(scene.colors),
    }), { points: [], radiuses: [], colors: [] });
}

function plot2d(points, { width = 500, height = 500, scene = {}, color = [1, 0, 0], radius = 0.01 } = {}) {
    // Normalize points to fit in the canvas
    scene = {
        points: scene.points || [],
        radiuses: scene.radiuses || [],
        colors: scene.colors || [],
    };
    const baseLayer = createLayer(points, { color, radius }, Vec2).layer;
    const layers = [baseLayer];

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
        const normalizedSceneVecs = renderedScene.points.map(v =>
            v.sub(box.min).div(box.diagonal).scale(2).map(x => x - 1)
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

function plot3d(points, { width = 500, height = 500, scene = {}, color = [1, 0, 0], radius = 0.01 } = {}) {
    // Normalize points to fit in the canvas
    scene = {
        points: scene.points || [],
        radiuses: scene.radiuses || [],
        colors: scene.colors || [],
    };
    const baseLayer = createLayer(points, { color, radius }, Vec3).layer;
    const layers = [baseLayer];
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
        const normalizedSceneVecs = renderedScene.points.map(v =>
            v.sub(box.min).div(box.diagonal).scale(2).map(x => x - 1)
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
