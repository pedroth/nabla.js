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
function createFitState(X, Y, model, params = {}) {
    const {
        batch = 10,
        optimizer = OPTIMIZERS.ADAMW(),
    } = params;
    const Xarr = X?.toArray?.() ?? X;
    const Yarr = Y?.toArray?.() ?? Y;
    const finalBatch = Math.min(batch || 1, Xarr.length);
    const thetaByIndex = createThetaMapIndex(model);
    const thetaKeys = Object.keys(thetaByIndex);
    const thetaValues = optimizer.initTheta(thetaKeys);
    const compiledModel = Symbolic.compile(model);

    optimizer.initOptimizer(thetaKeys);

    return {
        Xarr,
        Yarr,
        compiledGrad: Symbolic.compile(Symbolic.backward(model)),
        compiledModel,
        finalBatch,
        model,
        optimizer,
        thetaByIndex,
        thetaKeys,
        thetaValues,
    };
}

function runFitEpoch(state, epoch) {
    const {
        Xarr,
        Yarr,
        compiledGrad,
        compiledModel,
        finalBatch,
        model,
        optimizer,
        thetaByIndex,
        thetaKeys,
        thetaValues,
    } = state;
    let lossSum = 0;

    const gradAccumulator = {};
    thetaKeys.forEach(key => gradAccumulator[key] = 0);

    for (let i = 0; i < finalBatch; i++) {
        const index = Math.floor(Math.random() * Xarr.length);
        const input = buildInput(Xarr[index], model);
        const output = Yarr[index];
        const inputPlusWeights = { ...input, ...thetaValues };

        const val = compiledModel(inputPlusWeights);
        const diff = val - output;

        if (!isFinite(diff)) continue;
        lossSum += diff * diff;

        const grad = compiledGrad(inputPlusWeights);
        thetaKeys.forEach((key) => {
            const gradVal = grad[thetaByIndex[key]] * 2 * diff; // gradient of the loss (squared error) with respect to the parameter
            if (isFinite(gradVal)) gradAccumulator[key] += gradVal;
        });
    }

    thetaKeys.forEach((key) => {
        const gradVal = gradAccumulator[key] / finalBatch;
        thetaValues[key] = optimizer.update({ key, thetaValues, gradVal, epoch });
    });

    return {
        compiledModel,
        epoch,
        loss: lossSum / finalBatch,
        theta: { ...thetaValues },
    };
}

function fitData(X, Y, model, params = {}) {
    const { epochs = 2000, continuationEvery = 100 } = params;
    const state = createFitState(X, Y, model, params);
    const continuationFn = params.continuationFn ?? defaultContinuationFn(epochs);
    for (let epoch = 0; epoch < epochs; epoch++) {
        const checkpoint = runFitEpoch(state, epoch);
        if (epoch % continuationEvery === 0) continuationFn(checkpoint);
    }
    return { compiledModel: state.compiledModel, theta: state.thetaValues };
}

async function fitDataAsync(X, Y, model, params = {}) {
    const { epochs = 2000, continuationEvery = 100 } = params;
    const state = createFitState(X, Y, model, params);
    const continuationFn = params.continuationFn ?? defaultContinuationFn(epochs);
    for (let epoch = 0; epoch < epochs; epoch++) {
        const checkpoint = runFitEpoch(state, epoch);
        if (epoch % continuationEvery === 0) {
            await continuationFn(checkpoint);
            await nextFrame();
        }
    }
    return { compiledModel: state.compiledModel, theta: state.thetaValues };
}

function nextFrame() {
    return new Promise(resolve => {
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(resolve);
        } else {
            setTimeout(resolve, 0);
        }
    });
}

function defaultContinuationFn(epochs) {
    return ({ epoch, loss }) => console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${loss}`);
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


function sgd(params = {}) {
    const { learningRate = 0.01, decay = 0 } = params;
    return {
        initTheta: (thetaKeys) => {
            const thetaValues = {};
            thetaKeys.forEach((key) => {
                thetaValues[key] = (2 * Math.random() - 1) * 0.1;
            });
            return thetaValues;
        },
        initOptimizer: (thetaKeys) => {
            // No-op for SGD, but included for consistency with other optimizers
        },
        update: ({ thetaValues, gradVal, key, epoch }) => {
            const lr = learningRate / (1 + decay * epoch);
            return thetaValues[key] - lr * gradVal;
        }
    };
}

function adamw(params = {}) {
    const { beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, weightDecay = 0.01, learningRate = 0.001 } = params;
    const firstMoment = {};
    const secondMoment = {};
    return {
        initTheta: (thetaKeys) => {
            const thetaValues = {};
            thetaKeys.forEach((key) => {
                thetaValues[key] = (2 * Math.random() - 1) * 0.1;
            });
            return thetaValues;
        },
        initOptimizer: (thetaKeys) => {
            thetaKeys.forEach((key) => {
                firstMoment[key] = 0;
                secondMoment[key] = 0;
            });
        },
        update: ({ thetaValues, gradVal, key, epoch }) => {
            firstMoment[key] = beta1 * firstMoment[key] + (1 - beta1) * gradVal;
            secondMoment[key] = beta2 * secondMoment[key] + (1 - beta2) * gradVal * gradVal;
            const correctedFirstMoment = firstMoment[key] / (1 - beta1 ** (epoch + 1));
            const correctedSecondMoment = secondMoment[key] / (1 - beta2 ** (epoch + 1));
            return thetaValues[key] - learningRate * (
                correctedFirstMoment / (Math.sqrt(correctedSecondMoment) + epsilon) +
                weightDecay * thetaValues[key]
            );
        }
    };
}



const OPTIMIZERS = {
    SGD: (params) => sgd(params),
    ADAMW: (params) => adamw(params),
}

export const DataScience = {
    fitData,
    fitDataAsync,
    buildInput,
    OPTIMIZERS,
}