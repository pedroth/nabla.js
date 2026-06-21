import { Canvas, Color } from "https://cdn.jsdelivr.net/npm/tela.js/src/index.js"
const IO = {}
IO._cache = {}

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
    return {toVisual: () => {
        return {type: "canvas", value: outputCanvas.paint()};
    }};
}

export default IO;
