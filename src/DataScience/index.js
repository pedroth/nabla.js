import { Symbolic } from "../Symbolic/index.js";

function createThetaMapIndex(model) {
    const ans = {};
    let index = 0;
    model.vars.forEach((v) => {
        if (!v.isParam) {
            ans[v.name] = index;
            index++;
        }
    });
    return ans;
}

// X: array of input vectors, Y: array of output vectors
function fitData(X, Y, model, params = {}) {
    const { learningRate = 0.1, epochs = 1000, batch = 10 } = params;
    const Xarr = X?.toArray?.() ?? X;
    const Yarr = Y?.toArray?.() ?? Y;
    const thetaByIndex = createThetaMapIndex(model);
    const thetaValues = Object.keys(thetaByIndex)
        .reduce((acc, k) => {
            acc[k] = (2 * Math.random() - 1) * 0.01;
            return acc;
        }, {});
    const compiledModel = Symbolic.compile(model);
    const compiledDerivativeModel = Symbolic.compile(model.derivative(), { doSimplify: false });
    for (let epoch = 0; epoch < epochs; epoch++) {
        let lossSum = 0;
        for (let i = 0; i < (batch || 1); i++) {
            const index = Math.floor(Math.random() * Xarr.length);
            const input = buildInput(Xarr[index], model);
            const output = Yarr[index];
            const inputPlusWeights = { ...input, ...thetaValues };
            const diff = compiledModel(inputPlusWeights) - output;
            if (!isFinite(diff)) continue;
            lossSum += diff * diff;
            // Compute gradient and update thetaValues
            const grad = compiledDerivativeModel(inputPlusWeights);
            const gradEval = grad.map(v => v * diff);
            // Clip global gradient norm to prevent exp() overflow in activations
            const keys = Object.keys(thetaByIndex);
            const gradNorm = Math.sqrt(
                keys.reduce((s, k) => {
                    const v = gradEval[thetaByIndex[k]];
                    return s + (isFinite(v) ? v * v : 0);
                }, 0)
            );
            const clipFactor = gradNorm > 1 ? 1 / gradNorm : 1;
            keys.forEach((key) => {
                const gradValue = gradEval[thetaByIndex[key]];
                if (isFinite(gradValue)) {
                    thetaValues[key] -= learningRate * gradValue * clipFactor;
                }
            });
        }
        console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${lossSum / (batch || 1)}`);
    }
    return {compiledModel, theta: thetaValues};
}

function buildInput(input, model) {
    if (!Array.isArray(input)) input = [input];
    const argMap = {};
    let index = 0;
    model.vars.forEach((v) => {
        if (v.isParam) {
            argMap[v.name] = input[index];
            index++;
        }
    });
    return argMap;
}



export const DataScience = {
    fitData,
    buildInput,
}