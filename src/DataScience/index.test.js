import { expect, test } from "bun:test";
import { DataScience } from "./index.js";
import { Symbolic } from "../Symbolic/index.js";
import { NMath } from "../NMath/index.js";

function optimizer(initial, updates) {
    return {
        initTheta: keys => Object.fromEntries(keys.map(key => [key, initial[key]])),
        initOptimizer: () => {},
        update: ({ key, thetaValues, gradVal }) => {
            updates[key] = gradVal;
            return thetaValues[key] - 0.1 * gradVal;
        },
    };
}

test("default scalar squared error reports loss and updates a single parameter", () => {
    const x = Symbolic.realVar("x", true);
    const weight = Symbolic.realVar("w");
    const model = weight.mul(x);
    const updates = {};
    let checkpoint;
    const result = DataScience.fitData([2], [3], model, {
        epochs: 1,
        optimizer: optimizer({ w: 1 }, updates),
        continuationFn: value => checkpoint = value,
    });

    expect(checkpoint.loss).toBe(1);
    expect(updates.w).toBe(-4);
    expect(result.theta.w).toBeCloseTo(1.4);
    expect(result.compiledModel({ x: 2, w: result.theta.w })).toBeCloseTo(2.8);
});

test("custom symbolic loss differentiates the whole objective and maps unused weights", () => {
    const x = Symbolic.realVar("x", true);
    const a = Symbolic.realVar("a");
    const b = Symbolic.realVar("b");
    const model = Symbolic.vec(a.mul(x), b.mul(x));
    const updates = {};
    let checkpoint;
    DataScience.fitData([[2]], [[3, 10]], model, {
        epochs: 1,
        optimizer: optimizer({ a: 1, b: 4 }, updates),
        lossFn: (prediction, target) => {
            const error = prediction.components[0].sub(target.components[0]);
            return error.mul(error).mul(error).mul(error);
        },
        continuationFn: value => checkpoint = value,
    });

    expect(checkpoint.loss).toBe(1);
    expect(updates.a).toBe(-8);
    expect(updates.b).toBe(0);
});

test("default vector squared error handles numeric and NMath vector targets", () => {
    const a = Symbolic.realVar("a");
    const b = Symbolic.realVar("b");
    const model = Symbolic.vec(a, b);
    for (const target of [[3, 4], NMath.vec(3, 4)]) {
        const updates = {};
        let checkpoint;
        DataScience.fitData([0], [target], model, {
            epochs: 1,
            optimizer: optimizer({ a: 1, b: 2 }, updates),
            continuationFn: value => checkpoint = value,
        });
        expect(checkpoint.loss).toBe(8);
        expect(updates).toEqual({ a: -4, b: -4 });
    }
});

test("async fitting uses the custom loss and awaits checkpoints", async () => {
    const weight = Symbolic.realVar("w");
    const updates = {};
    const checkpoints = [];
    const result = await DataScience.fitDataAsync([0], [3], weight, {
        epochs: 1,
        optimizer: optimizer({ w: 1 }, updates),
        lossFn: (prediction, target) => Symbolic.real(3).mul(prediction.sub(target)),
        continuationFn: async value => checkpoints.push(value),
    });
    expect(checkpoints[0].loss).toBe(-6);
    expect(updates.w).toBe(3);
    expect(result.theta.w).toBeCloseTo(0.7);
});

test("optimizes a custom loss over multiple epochs", () => {
    const weight = Symbolic.realVar("w");
    const losses = [];
    const result = DataScience.fitData([0], [3], weight, {
        epochs: 100,
        continuationEvery: 1,
        optimizer: DataScience.OPTIMIZERS.SGD({ learningRate: 0.05 }),
        lossFn: (prediction, target) => {
            const error = prediction.sub(target);
            return error.mul(error).mul(Symbolic.real(2));
        },
        continuationFn: ({ loss }) => losses.push(loss),
    });
    expect(losses.at(-1)).toBeLessThan(1e-12);
    expect(result.theta.w).toBeCloseTo(3, 5);
});

test("target names cannot collide with model variables", () => {
    const weight = Symbolic.realVar("__nabla_target_0");
    const updates = {};
    DataScience.fitData([0], [3], weight, {
        epochs: 1,
        optimizer: optimizer({ __nabla_target_0: 1 }, updates),
        continuationFn: () => {},
    });
    expect(updates.__nabla_target_0).toBe(-4);
});

test("constant losses leave all model weights unchanged", () => {
    const weight = Symbolic.realVar("w");
    const updates = {};
    DataScience.fitData([0], [3], weight, {
        epochs: 1,
        optimizer: optimizer({ w: 1 }, updates),
        lossFn: () => Symbolic.real(5),
        continuationFn: () => {},
    });
    expect(updates.w).toBe(0);
});

test("fits a simplified symbolic model", () => {
    const x = Symbolic.realVar("x", true);
    const weight = Symbolic.realVar("w");
    const model = weight.mul(x).simplify();
    const updates = {};
    DataScience.fitData([2], [3], model, {
        epochs: 1,
        optimizer: optimizer({ w: 1 }, updates),
        continuationFn: () => {},
    });
    expect(updates.w).toBe(-4);
});

test("invalid loss expressions and target dimensions fail explicitly", () => {
    const model = Symbolic.vec(Symbolic.realVar("a"), Symbolic.realVar("b"));
    const options = { epochs: 1, continuationFn: () => {} };
    expect(() => DataScience.fitData([0], [[1]], model, options)).toThrow("target vector of dimension 2");
    expect(() => DataScience.fitData([0], [[1, 2]], model, {
        ...options,
        lossFn: prediction => prediction,
    })).toThrow("scalar symbolic expression");
    expect(() => DataScience.fitData([0], [[1, 2]], model, {
        ...options,
        lossFn: () => Symbolic.realVar("unknown"),
    })).toThrow("variables outside the model and target");
});

test("non-finite custom losses and gradients fail explicitly", () => {
    const weight = Symbolic.realVar("w");
    const options = { epochs: 1, optimizer: optimizer({ w: 0 }, {}), continuationFn: () => {} };
    expect(() => DataScience.fitData([0], [1], weight, {
        ...options, lossFn: prediction => Symbolic.real(1).div(prediction),
    })).toThrow("Loss must be finite");
    expect(() => DataScience.fitData([0], [1], weight, {
        ...options, lossFn: prediction => Symbolic.exp(Symbolic.log(prediction).mul(Symbolic.real(0.5))),
    })).toThrow("Gradient for w must be finite");
});
