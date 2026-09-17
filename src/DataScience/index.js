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
    const {
        learningRate = 0.01,
        epochs = 1000,
        batch = 10,
        finiteDiff = false,
        finiteDiffMethod = "spsa",
        h = 1e-4,
        optimizer = "sgd",
        beta1 = 0.9,
        beta2 = 0.999,
        epsilon = 1e-8,
        weightDecay = 0,
    } = params;
    const Xarr = X?.toArray?.() ?? X;
    const Yarr = Y?.toArray?.() ?? Y;
    const finalBatch = Math.min(batch || 1, Xarr.length);
    const thetaByIndex = createThetaMapIndex(model);
    const thetaValues = Object.keys(thetaByIndex)
        .reduce((acc, k) => {
            acc[k] = (2 * Math.random() - 1) * 0.1;
            return acc;
        }, {});
    const compiledModel = Symbolic.compile(model);
    const thetaKeys = Object.keys(thetaByIndex);
    const firstMoment = {};
    const secondMoment = {};
    thetaKeys.forEach((key) => {
        firstMoment[key] = 0;
        secondMoment[key] = 0;
    });

    // symbolic gradient — compiled once, reused every step
    const compiledGrad = finiteDiff
        ? null
        : Symbolic.compile(Symbolic.backward(model));
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
                if (finiteDiffMethod === "spsa") {
                    const perturbations = [];
                    for (let keyIndex = 0; keyIndex < thetaKeys.length; keyIndex++) {
                        perturbations.push(Math.random() < 0.5 ? -1 : 1);
                        inputPlusWeights[thetaKeys[keyIndex]] += h * perturbations[keyIndex];
                    }
                    const plus = compiledModel(inputPlusWeights);
                    for (let keyIndex = 0; keyIndex < thetaKeys.length; keyIndex++) {
                        inputPlusWeights[thetaKeys[keyIndex]] -= 2 * h * perturbations[keyIndex];
                    }
                    const minus = compiledModel(inputPlusWeights);
                    for (let keyIndex = 0; keyIndex < thetaKeys.length; keyIndex++) {
                        const key = thetaKeys[keyIndex];
                        inputPlusWeights[key] += h * perturbations[keyIndex];
                        const gradVal = ((plus - minus) / (2 * h)) * perturbations[keyIndex] * 2 * diff;
                        if (isFinite(gradVal)) gradAccumulator[key] += gradVal;
                    }
                } else {
                    // Coordinate forward difference: one additional evaluation per parameter.
                    thetaKeys.forEach((key) => {
                        inputPlusWeights[key] += h;
                        const gradVal = ((compiledModel(inputPlusWeights) - val) / h) * 2 * diff;
                        inputPlusWeights[key] -= h;
                        if (isFinite(gradVal)) gradAccumulator[key] += gradVal;
                    });
                }
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
            let gradVal = gradAccumulator[key] / finalBatch;
            if (optimizer === "adamw") {
                firstMoment[key] = beta1 * firstMoment[key] + (1 - beta1) * gradVal;
                secondMoment[key] = beta2 * secondMoment[key] + (1 - beta2) * gradVal * gradVal;
                const correctedFirstMoment = firstMoment[key] / (1 - beta1 ** (epoch + 1));
                const correctedSecondMoment = secondMoment[key] / (1 - beta2 ** (epoch + 1));
                thetaValues[key] -= learningRate * (
                    correctedFirstMoment / (Math.sqrt(correctedSecondMoment) + epsilon) +
                    weightDecay * thetaValues[key]
                );
            } else {
                gradVal = Math.max(-1.0, Math.min(1.0, gradVal));
                thetaValues[key] -= learningRate * gradVal;
            }
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