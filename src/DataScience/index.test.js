import { expect, test } from "bun:test";
import { DataScience } from "./index.js";
import { NeuralNet } from "../NeuralNet/index.js";
import { Symbolic } from "../Symbolic/index.js";

function measureGradient(model, input, target, weights, options = {}) {
    const grad = {};
    let loss;
    DataScience.fitData([input], [target], model, {
        initialTheta: weights,
        ...options,
        epochs: 1,
        batch: 1,
        continuationFn: checkpoint => { loss = checkpoint.loss; },
        optimizer: {
            initOptimizer: () => {},
            update: ({ key, thetaValues, gradVal }) => {
                grad[key] = gradVal;
                return thetaValues[key];
            },
        },
    });
    return { loss, grad };
}

test.each([
    ["linear", NeuralNet.ACTIVATIONS.linear],
    ["sigmoid", NeuralNet.ACTIVATIONS.sigmoid],
    ["relu", NeuralNet.ACTIVATIONS.relu],
])("vector MSE gradients match finite differences for %s", (_, activation) => {
    const net = NeuralNet.builder().input(2).layer(2, activation)
        .layer(2, NeuralNet.ACTIVATIONS.sigmoid).build();
    const input = [0.4, 0.7];
    const target = [0.2, 0.9];
    const args = { ...DataScience.buildInput(input, net.model), ...net.weightsMap };
    const result = measureGradient(net.model, input, target, net.weightsMap);
    const variables = net.model.vars.filter(v => !v.isParam);
    const loss = () => Symbolic.compile(net.model)(args)
        .reduce((sum, value, i) => sum + (value - target[i]) ** 2 / target.length, 0);
    variables.forEach(variable => {
        const original = args[variable.name];
        args[variable.name] = original + 1e-5;
        const plus = loss();
        args[variable.name] = original - 1e-5;
        const minus = loss();
        args[variable.name] = original;
        expect(result.grad[variable.name]).toBeCloseTo((plus - minus) / 2e-5, 6);
    });
});

test("vector training reduces loss using the existing fit API", async () => {
    const net = NeuralNet.builder().input(2).layer(2, NeuralNet.ACTIVATIONS.linear)
        .layer(2, NeuralNet.ACTIVATIONS.sigmoid).build();
    const sample = Float32Array.of(0.2, 0.8);
    const loss = () => net.eval(sample).reduce((sum, value, i) => sum + (value - sample[i]) ** 2, 0);
    const initial = loss();
    const { theta } = await DataScience.fitDataAsync([sample], [sample], net.model, {
        initialTheta: net.weightsMap, epochs: 300, batch: 1, continuationEvery: 300,
        continuationFn: () => {},
        optimizer: DataScience.OPTIMIZERS.ADAMW({ learningRate: 0.03 }),
    });
    net.setWeights(theta);
    expect(loss()).toBeLessThan(initial * 0.01);
    await expect(DataScience.fitDataAsync([sample], [[1]], net.model, {
        epochs: 1,
    })).rejects.toThrow("Target dimensions");
});

test("typed inputs map high-dimensional coordinates by numeric index", () => {
    const net = NeuralNet.builder().input(12).layer(1, NeuralNet.ACTIVATIONS.linear).build();
    const weights = Object.fromEntries(Object.keys(net.weightsMap).map(key => [key, 0]));
    weights["W0_{0}^{10}"] = 1;
    net.setWeights(weights);
    expect(net.eval(Float32Array.from({ length: 12 }, (_, i) => i))).toBe(10);
});

test("non-indexed input parameters retain variable order", () => {
    const model = Symbolic.realVar("b", true).add(Symbolic.realVar("a", true));
    expect(DataScience.buildInput(Float32Array.of(4, 7), model)).toEqual({ a: 4, b: 7 });
});

test("vector MSE accumulates shared outputs and variables", () => {
    const weight = Symbolic.realVar("w");
    const otherWeight = Symbolic.realVar("w");
    const shared = weight.mul(otherWeight);
    const model = Symbolic.vec(shared, shared);
    const { loss, grad } = measureGradient(model, [], [1, 3], { w: 2 });
    expect(loss).toBe(5);
    expect(grad.w).toBe(16);
});

test("vector targets cannot shadow model variables", () => {
    const weight = Symbolic.realVar("__loss_target_0");
    const otherWeight = Symbolic.realVar("__loss_target__0");
    const model = Symbolic.vec(weight, otherWeight);
    const { loss, grad } = measureGradient(model, [], [1, 3], {
        __loss_target_0: 2,
        __loss_target__0: 2,
    });
    expect(loss).toBe(1);
    expect(grad.__loss_target_0).toBe(1);
    expect(grad.__loss_target__0).toBe(-1);
});

test("custom scalar losses avoid target name collisions", () => {
    const weight = Symbolic.realVar("__loss_target_0");
    const { loss, grad } = measureGradient(weight, [], 1, { __loss_target_0: 3 }, {
        loss: (prediction, target) => prediction.sub(target).mul(Symbolic.real(3)),
    });
    expect(loss).toBe(6);
    expect(grad.__loss_target_0).toBe(3);
});

test("scalar training retains squared-error gradients with one parameter", () => {
    const weight = Symbolic.realVar("w");
    const { loss, grad } = measureGradient(weight, [], 3, { w: 2 });
    expect(loss).toBe(1);
    expect(grad.w).toBe(-2);
});

test("single-component vector training uses mean squared error", () => {
    const weight = Symbolic.realVar("w");
    const { loss, grad } = measureGradient(Symbolic.vec(weight), [], [3], { w: 2 });
    expect(loss).toBe(1);
    expect(grad.w).toBe(-2);
});

test("custom scalar symbolic loss controls the loss and gradient", () => {
    const weight = Symbolic.realVar("w");
    const { loss, grad } = measureGradient(weight, [], 1, { w: 3 }, {
        loss: (prediction, target) => {
            const diff = prediction.sub(target);
            return diff.mul(diff).mul(diff).mul(diff);
        },
    });
    expect(loss).toBe(16);
    expect(grad.w).toBe(32);
});

test("custom vector symbolic loss can weight outputs differently", () => {
    const a = Symbolic.realVar("a");
    const b = Symbolic.realVar("b");
    const model = Symbolic.vec(a, b);
    const { loss, grad } = measureGradient(model, [], [1, 3], { a: 2, b: 5 }, {
        loss: (prediction, target) => {
            const diff = prediction.sub(target);
            return diff.components[0].mul(diff.components[0])
                .add(diff.components[1].mul(diff.components[1]).mul(Symbolic.real(3)));
        },
    });
    expect(loss).toBe(13);
    expect(grad).toEqual({ a: 2, b: 12 });
});

test("custom loss accepts the symbolic vector MSE formula", () => {
    const model = Symbolic.vec(Symbolic.realVar("a"), Symbolic.realVar("b"));
    const { loss, grad } = measureGradient(model, [], [1, 3], { a: 2, b: 5 }, {
        loss: (prediction, target) => {
            const diff = prediction.sub(target);
            return diff.dot(diff).div(Symbolic.real(prediction.dim));
        },
    });
    expect(loss).toBe(2.5);
    expect(grad).toEqual({ a: 1, b: 2 });
});

test("custom loss accepts a scalar class label for a vector model", () => {
    const model = Symbolic.vec(Symbolic.realVar("a"), Symbolic.realVar("b"));
    const { loss, grad } = measureGradient(model, [], 1, { a: 0, b: 0 }, {
        targetDim: null,
        loss: (prediction, target) => {
            const [a, b] = prediction.components;
            return Symbolic.log(Symbolic.exp(a).add(Symbolic.exp(b)))
                .sub(a.mul(Symbolic.real(1).sub(target)).add(b.mul(target)));
        },
    });
    expect(loss).toBeCloseTo(Math.log(2));
    expect(grad.a).toBeCloseTo(0.5);
    expect(grad.b).toBeCloseTo(-0.5);
});

test("custom loss supports a target vector with a different dimension", () => {
    const model = Symbolic.vec(Symbolic.realVar("a"), Symbolic.realVar("b"));
    const options = {
        targetDim: 1,
        loss: (prediction, target) => {
            const diff = prediction.components[1].sub(target.components[0]);
            return diff.mul(diff);
        },
    };
    const { loss, grad } = measureGradient(model, [], [2], { a: 1, b: 3 }, options);
    expect(loss).toBe(1);
    expect(grad).toEqual({ a: 0, b: 2 });
    expect(() => measureGradient(model, [], [2, 3], { a: 1, b: 3 }, options))
        .toThrow("Target dimensions");
});

test("targetDim is validated and must match for default MSE", () => {
    const model = Symbolic.vec(Symbolic.realVar("a"), Symbolic.realVar("b"));
    expect(() => measureGradient(model, [], 1, { a: 1, b: 2 }, { targetDim: 0 }))
        .toThrow("targetDim");
    expect(() => measureGradient(model, [], 1, { a: 1, b: 2 }, { targetDim: null }))
        .toThrow("Mean squared error");
});

test("custom loss supports parameters absent from the objective", () => {
    const model = Symbolic.vec(Symbolic.realVar("a"), Symbolic.realVar("b"));
    const { loss, grad } = measureGradient(model, [], [0, 0], { a: 2, b: 3 }, {
        loss: () => Symbolic.real(5),
    });
    expect(loss).toBe(5);
    expect(grad).toEqual({ a: 0, b: 0 });
});

test("async training uses the custom symbolic loss", async () => {
    const weight = Symbolic.realVar("w");
    const { theta } = await DataScience.fitDataAsync([[]], [1], weight, {
        initialTheta: { w: 0 },
        loss: (prediction, target) => {
            const diff = prediction.sub(target);
            return diff.mul(diff).mul(Symbolic.real(3));
        },
        epochs: 1,
        batch: 1,
        continuationFn: () => {},
        optimizer: DataScience.OPTIMIZERS.SGD({ learningRate: 0.1 }),
    });
    expect(theta.w).toBeCloseTo(0.6);
});

test("custom loss must be a scalar expression using model and target variables", () => {
    const weight = Symbolic.realVar("w");
    expect(() => measureGradient(weight, [], 1, { w: 2 }, { loss: () => Symbolic.vec(weight) }))
        .toThrow("scalar symbolic");
    expect(() => measureGradient(weight, [], 1, { w: 2 }, { loss: () => Symbolic.realVar("unknown") }))
        .toThrow("outside the model and target");
});

test("large vector losses do not exhaust the call stack", () => {
    const weight = Symbolic.realVar("w");
    const model = Symbolic.vec(...Array.from({ length: 6000 }, () => weight));
    const { loss, grad } = measureGradient(model, [], new Float32Array(6000), { w: 2 });
    expect(loss).toBeCloseTo(4, 10);
    expect(grad.w).toBeCloseTo(4, 10);
    const custom = measureGradient(model, [], new Float32Array(6000), { w: 2 }, {
        loss: (prediction, target) => {
            const diff = prediction.sub(target);
            return diff.dot(diff).div(Symbolic.real(prediction.dim));
        },
    });
    expect(custom.loss).toBeCloseTo(4, 10);
    expect(custom.grad.w).toBeCloseTo(4, 10);
});

test("scalar training rejects non-finite loss and gradients", () => {
    const weight = Symbolic.realVar("w");
    expect(() => measureGradient(weight, [], 1e308, { w: 0 })).toThrow("non-finite");
    const model = Symbolic.real(1).div(Symbolic.real(1).add(Symbolic.exp(weight)));
    expect(() => measureGradient(model, [], 1, { w: 1000 })).toThrow("non-finite");
});

test("vector training rejects non-finite targets", () => {
    const weight = Symbolic.realVar("w");
    expect(() => measureGradient(Symbolic.vec(weight, weight), [], [NaN, 1], { w: 2 }))
        .toThrow("non-finite");
});

test("vector training rejects non-finite gradients", () => {
    const weight = Symbolic.realVar("w");
    const model = Symbolic.vec(Symbolic.real(1).div(Symbolic.real(1).add(Symbolic.exp(weight))), weight);
    expect(() => measureGradient(model, [], [1, 1000], { w: 1000 }))
        .toThrow("non-finite");
});

test("vector training differentiates flattened polynomial outputs", () => {
    const weight = Symbolic.realVar("w");
    const model = Symbolic.vec(weight.mul(weight).simplify(), weight);
    const { loss, grad } = measureGradient(model, [], [1, 3], { w: 2 });
    expect(loss).toBe(5);
    expect(grad.w).toBe(11);
});

test("trained layers can be composed using the original NeuralNet API", () => {
    const full = NeuralNet.builder().input(2).layer(3, NeuralNet.ACTIVATIONS.linear)
        .layer(2, NeuralNet.ACTIVATIONS.sigmoid).build();
    const encoder = NeuralNet.builder().input(2).layer(3, NeuralNet.ACTIVATIONS.linear).build();
    const decoder = NeuralNet.builder().input(3).layer(2, NeuralNet.ACTIVATIONS.sigmoid).build();
    encoder.setWeights(full.weightsMap);
    decoder.setWeights(Object.fromEntries(Object.entries(full.weightsMap)
        .filter(([key]) => key.startsWith("W1_") || key.startsWith("b1_"))
        .map(([key, value]) => [key.replace(/^(W|b)1_/, "$10_"), value])));
    const sample = [0.2, 0.8];
    expect(decoder.eval(encoder.eval(sample))).toEqual(full.eval(sample));
});
