import { Symbolic } from "../Symbolic/index.js";

function squaredError(prediction, target) {
    const difference = prediction.sub(target);
    return difference.type === Symbolic.TYPES.vector
        ? difference.dot(difference)
        : difference.mul(difference);
}

function createTarget(model) {
    console.log("Creating target for model:", model);
    const names = new Set(model.vars.map(variable => variable.name));
    const dimension = model.type === Symbolic.TYPES.vector ? model.dim : 1;
    const components = [];
    for (let index = 0; index < dimension; index++) {
        let name = `__nabla_target_${index}`;
        while (names.has(name)) name += "_";
        names.add(name);
        components.push(Symbolic.realVar(name, true));
    }
    return model.type === Symbolic.TYPES.vector ? Symbolic.vec(...components) : components[0];
}

function buildTarget(output, target) {
    if (target.type !== Symbolic.TYPES.vector) {
        if (typeof output !== "number") throw new Error("Expected a numeric scalar target");
        return { [target.name]: output };
    }
    const values = output?.components ?? output?.toArray?.() ?? output;
    if (!Array.isArray(values) || values.length !== target.dim) {
        throw new Error(`Expected a target vector of dimension ${target.dim}`);
    }
    return Object.fromEntries(target.components.map((component, index) => {
        const value = values[index]?.value ?? values[index];
        if (typeof value !== "number") throw new Error("Expected numeric target vector components");
        return [component.name, value];
    }));
}

// X: array of input vectors, Y: array of output vectors
function createFitState(X, Y, model, params = {}) {
    const {
        batch = 10,
        optimizer = OPTIMIZERS.ADAMW(),
        lossFn = squaredError,
    } = params;
    const Xarr = X?.toArray?.() ?? X;
    const Yarr = Y?.toArray?.() ?? Y;
    const finalBatch = Math.min(batch || 1, Xarr.length);
    const thetaKeys = model.vars.filter(v => !v.isParam).map(v => v.name);
    const thetaValues = optimizer.initTheta(thetaKeys);
    const compiledModel = Symbolic.compile(model);
    const target = createTarget(model);
    if (typeof lossFn !== "function") throw new Error("lossFn must be a function");
    const loss = lossFn(model, target);
    if (!loss || !Array.isArray(loss.vars) || !Array.isArray(loss.children) ||
        [Symbolic.TYPES.vector, Symbolic.TYPES.covector, Symbolic.TYPES.complex].includes(loss.type)) {
        throw new Error("lossFn must return a scalar symbolic expression");
    }
    const allowedNames = new Set([...model.vars, ...target.vars].map(variable => variable.name));
    if (loss.vars.some(variable => !allowedNames.has(variable.name))) {
        throw new Error("lossFn contains variables outside the model and target");
    }
    const gradientKeys = loss.vars.filter(v => !v.isParam).map(v => v.name);
    const gradientIndex = new Map(gradientKeys.map((key, index) => [key, index]));

    optimizer.initOptimizer(thetaKeys);

    return {
        Xarr,
        Yarr,
        compiledGrad: Symbolic.compile(Symbolic.backward(loss)),
        compiledLoss: Symbolic.compile(loss),
        compiledModel,
        finalBatch,
        gradientIndex,
        gradientSize: gradientKeys.length,
        model,
        optimizer,
        target,
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
        gradientIndex,
        gradientSize,
        model,
        optimizer,
        target,
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
        const args = { ...input, ...thetaValues, ...buildTarget(output, target) };
        const loss = compiledLoss(args);
        if (!Number.isFinite(loss)) throw new Error("Loss must be finite");
        lossSum += loss;

        const grad = compiledGrad(args);
        thetaKeys.forEach((key) => {
            const index = gradientIndex.get(key);
            const gradVal = index === undefined ? 0 : gradientSize === 1 ? grad : grad[index];
            if (!Number.isFinite(gradVal)) throw new Error(`Gradient for ${key} must be finite`);
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