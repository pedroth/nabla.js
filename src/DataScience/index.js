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

function meanSquaredError(prediction, target) {
    const diff = prediction.sub(target);
    if (prediction.type !== Symbolic.TYPES.vector) return diff.mul(diff);
    return diff.dot(diff).div(Symbolic.real(prediction.dim));
}

/**
 * `loss(prediction, target)` returns a scalar symbolic expression; both arguments
 * have the model's shape by default. The default loss is mean squared error.
 * Scalar example: (prediction, target) => prediction.sub(target).mul(prediction.sub(target))
 * Vector example: (prediction, target) => {
 *     const diff = prediction.sub(target);
 *     return diff.dot(diff).div(Symbolic.real(prediction.dim));
 * }
 * `targetDim` selects a vector target dimension, or null for a scalar target.
 * For example, use `targetDim: null` with a custom loss for scalar class labels.
 * `initialTheta` optionally supplies the model's initial weights.
 */
function createFitState(X, Y, model, params = {}) {
    const {
        batch = 10,
        optimizer = OPTIMIZERS.ADAMW(),
        initialTheta,
        loss = meanSquaredError,
        targetDim: requestedTargetDim,
    } = params;
    const Xarr = X?.toArray?.() ?? X;
    const Yarr = Y?.toArray?.() ?? Y;
    const finalBatch = Math.min(batch || 1, Xarr.length);
    const thetaByIndex = createThetaMapIndex(model);
    const thetaKeys = Object.keys(thetaByIndex);
    const thetaValues = initialTheta === undefined
        ? optimizer.initTheta(thetaKeys)
        : { ...initialTheta };

    if (initialTheta !== undefined && thetaKeys.some(key => !Number.isFinite(thetaValues[key]))) {
        throw new Error("Initial weights must include finite values for every model parameter");
    }
    if (typeof loss !== "function") {
        throw new Error("Loss must be a function");
    }

    const compiledModel = Symbolic.compile(model);
    const isVectorModel = model.type === Symbolic.TYPES.vector;
    if (isVectorModel && model.dim === 0) {
        throw new Error("Vector model must have at least one output");
    }
    const defaultTargetDim = isVectorModel ? model.dim : null;
    const targetDim = requestedTargetDim === undefined ? defaultTargetDim : requestedTargetDim;
    if (targetDim !== null && (!Number.isInteger(targetDim) || targetDim <= 0)) {
        throw new Error("targetDim must be null or a positive integer");
    }
    if (loss === meanSquaredError && targetDim !== defaultTargetDim) {
        throw new Error("Mean squared error requires target dimensions matching the model output");
    }

    let targetPrefix = "__loss_target_";
    while (model.vars.some(v => v.name.startsWith(targetPrefix))) {
        targetPrefix += "_";
    }
    const targetVars = Array.from(
        { length: targetDim ?? 1 },
        (_, i) => Symbolic.realVar(`${targetPrefix}${i}`, true)
    );
    const target = targetDim === null ? targetVars[0] : Symbolic.vec(...targetVars);
    const objective = loss(model, target);
    const nonScalarTypes = [Symbolic.TYPES.vector, Symbolic.TYPES.covector, Symbolic.TYPES.complex];
    if (!objective?.vars || !objective.children || nonScalarTypes.includes(objective.type)) {
        throw new Error("Loss must return a scalar symbolic expression");
    }

    const allowedNames = new Set([...model.vars, ...targetVars].map(v => v.name));
    if (objective.vars.some(v => !allowedNames.has(v.name))) {
        throw new Error("Loss cannot introduce variables outside the model and target");
    }
    const gradientByIndex = createThetaMapIndex(objective);

    optimizer.initOptimizer(thetaKeys);

    return {
        Xarr,
        Yarr,
        compiledGrad: Symbolic.compile(Symbolic.backward(objective)),
        compiledLoss: Symbolic.compile(objective),
        compiledModel,
        targetPrefix,
        targetDim,
        gradientByIndex,
        finalBatch,
        model,
        optimizer,
        thetaKeys,
        thetaValues,
    };
}

function runFitEpoch(state, epoch) {
    const {
        Xarr,
        Yarr,
        compiledGrad,
        compiledLoss,
        compiledModel,
        finalBatch,
        model,
        optimizer,
        gradientByIndex,
        thetaKeys,
        thetaValues,
        targetPrefix,
        targetDim,
    } = state;
    let lossSum = 0;

    const gradAccumulator = {};
    thetaKeys.forEach(key => gradAccumulator[key] = 0);

    for (let i = 0; i < finalBatch; i++) {
        const index = Math.floor(Math.random() * Xarr.length);
        const input = buildInput(Xarr[index], model);
        const output = Yarr[index];
        const inputPlusWeights = { ...input, ...thetaValues };

        if (targetDim !== null) {
            const target = output?.components ?? output;
            if ((!Array.isArray(target) && !ArrayBuffer.isView(target)) || target.length !== targetDim) {
                throw new Error("Target dimensions must match targetDim");
            }
            target.forEach((value, i) => { inputPlusWeights[`${targetPrefix}${i}`] = value; });
        } else {
            inputPlusWeights[`${targetPrefix}0`] = output;
        }
        const loss = compiledLoss(inputPlusWeights);
        if (!Number.isFinite(loss)) {
            throw new Error("Model produced a non-finite loss or gradient");
        }
        lossSum += loss;
        const result = compiledGrad(inputPlusWeights);
        const grad = Array.isArray(result) ? result : [result];
        if (grad.some(value => !Number.isFinite(value))) {
            throw new Error("Model produced a non-finite loss or gradient");
        }
        thetaKeys.forEach((key) => {
            const gradVal = key in gradientByIndex ? grad[gradientByIndex[key]] : 0;
            gradAccumulator[key] += gradVal;
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
    if (input?.components) {
        input = input.components.map(component => component.value ?? component);
    }
    if (ArrayBuffer.isView(input)) input = Array.from(input);
    if (!Array.isArray(input)) input = [input];
    const argMap = {};
    const params = model.vars.filter(v => v.isParam);
    const indexed = params.length === input.length &&
        params.every(v => /^x_\d+$/.test(v.name) && Number(v.name.slice(2)) < input.length);
    params.forEach((v, index) => {
        argMap[v.name] = input[indexed ? Number(v.name.slice(2)) : index];
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