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
    const { learningRate = 0.01, epochs = 1000, batch = 10, finiteDiff = false, h = 1e-4 } = params;
    const Xarr = X?.toArray?.() ?? X;
    const Yarr = Y?.toArray?.() ?? Y;
    const finalBatch = Math.min(batch || 1, Xarr.length);
    const thetaByIndex = createThetaMapIndex(model);
    const thetaValues = Object.keys(thetaByIndex)
        .reduce((acc, k) => {
            acc[k] = (2 * Math.random() - 1) * 0.1;
            return acc;
        }, {});
    const compiledModel = Symbolic.compile(model, { doSimplify: true });
    console.log("Compiled model:", compiledModel);
    const thetaKeys = Object.keys(thetaByIndex);

    // symbolic gradient — compiled once, reused every step
    const compiledGrad = finiteDiff
        ? null
        : Symbolic.compile(model.derivative());
    console.log("Compiled gradient:", compiledGrad);
    for (let epoch = 0; epoch < epochs; epoch++) {
        let lossSum = 0;

        const gradAccumulator = {};
        thetaKeys.forEach(k => gradAccumulator[k] = 0);

        for (let i = 0; i < finalBatch; i++) {
            const index = Math.floor(Math.random() * Xarr.length);
            const input = buildInput(Xarr[index], model);
            const output = Yarr[index];
            const inputPlusWeights = { ...input, ...thetaValues };

            const val = compiledModel(inputPlusWeights);
            const diff = val - output;

            if (!isFinite(diff)) continue;
            lossSum += diff * diff;

            if (finiteDiff) {
                // finite-difference gradient: (f(θ+h) - f(θ)) / h * 2(y-ŷ)
                thetaKeys.forEach((key) => {
                    inputPlusWeights[key] += h;
                    const gradVal = ((compiledModel(inputPlusWeights) - val) / h) * 2 * diff;
                    inputPlusWeights[key] -= h; // reset input
                    if (isFinite(gradVal)) gradAccumulator[key] += gradVal;
                });
            } else {
                const grad = compiledGrad(inputPlusWeights);
                thetaKeys.forEach((key) => {
                    const gradVal = grad[thetaByIndex[key]] * 2 * diff;
                    if (isFinite(gradVal)) gradAccumulator[key] += gradVal;
                });
            }
        }

        // Apply parameter update once after batch completion
        Object.keys(thetaByIndex).forEach((key) => {
            // Clamp gradient before subtracting
            let gradVal = gradAccumulator[key] / finalBatch;
            gradVal = Math.max(-1.0, Math.min(1.0, gradVal)); // Gradient Clipping
            thetaValues[key] -= learningRate * gradVal;
        });

        if (epoch % 100 === 0) {
            console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${lossSum / finalBatch}`);
        }
    }
    return { compiledModel, theta: thetaValues };
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