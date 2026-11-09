import { expect, test } from "bun:test";
import { KernelRegression } from "../index.js";
import { Symbolic } from "../Symbolic/index.js";

test("uses the supplied Gaussian and regularization defaults", () => {
    const model = KernelRegression.new([[0, 0]], [2]).fit();
    expect(model.predict([0, 0])).toBeCloseTo(2 / 1.05, 8);
    expect(model.predict([0.18, 0])).toBeCloseTo(2 / 1.05 * Math.exp(-0.5), 8);
});

test("fits Gaussian kernel ridge regression in any number of dimensions", () => {
    const model = KernelRegression.new([[0, 0, 0], [1, 2, 3]], [1, -1], {
        sigma: 1,
        lambda: 0.05,
        tolerance: 1e-10,
    });
    expect(() => model.predict([0, 0, 0])).toThrow("fitted");
    expect(model.fit()).toBe(model);
    const cross = Math.exp(-7);
    const coefficient = 1 / (1.05 - cross);
    expect(model.predict([0, 0, 0])).toBeCloseTo(coefficient * (1 - cross), 8);
    expect(model.gen([1, 2, 3])).toBeCloseTo(-coefficient * (1 - cross), 8);
    expect(model.predict([0.5, 1, 1.5])).toBeCloseTo(0, 8);
});

test("uses a supplied kernel and preserves the training data", () => {
    const X = [[1], [2]];
    const Y = [2, 4];
    const model = KernelRegression.new(X, Y, {
        kernelFn: (a, b) => a[0] * b[0],
        lambda: 1,
        tolerance: 1e-10,
    });
    X[0][0] = 100;
    Y[0] = 100;
    model.fit();
    expect(model.predict([3])).toBeCloseTo(5, 8);
    expect(model.fit().predict([3])).toBeCloseTo(5, 8);
});

test("checks solver convergence", () => {
    const model = KernelRegression.new([[0], [1]], [1, 2], {
        maxIterations: 1,
        tolerance: 0,
        residualTolerance: 1e-12,
    });
    expect(() => model.fit()).toThrow("did not converge");
    expect(() => model.predict([0])).toThrow("fitted");
});

test("a failed refit retains the previous fitted model", () => {
    let fail = false;
    const model = KernelRegression.new([[0]], [1], {
        kernelFn: () => fail ? NaN : 1,
    }).fit();
    fail = true;
    expect(() => model.fit()).toThrow("did not converge");
    fail = false;
    expect(model.predict([0])).toBeCloseTo(1 / 1.05, 8);
});

test("symbolic Gaussian predictions match numeric predictions and capture fitted coefficients", () => {
    const model = KernelRegression.new([[0, 0, 0], [0.2, 0.1, -0.1]], [1, -1]);
    expect(() => model.predictSym()).toThrow("fitted");
    model.fit();
    const expression = model.predictSym();
    expect(expression.vars.map(variable => [variable.name, variable.isParam])).toEqual([
        ["x_0", true], ["x_1", true], ["x_2", true],
    ]);
    const predict = Symbolic.compile(expression);
    for (const point of [[0, 0, 0], [0.2, 0.1, -0.1], [0.3, -0.2, 0.1]]) {
        expect(predict({ x_0: point[0], x_1: point[1], x_2: point[2] }))
            .toBeCloseTo(model.predict(point), 10);
    }
    const snapshot = predict({ x_0: 0, x_1: 0, x_2: 0 });
    model.alpha().components[0] += 1;
    expect(predict({ x_0: 0, x_1: 0, x_2: 0 })).toBe(snapshot);
    expect(model.predict([0, 0, 0])).not.toBeCloseTo(snapshot, 5);
});

test("custom Gaussian width applies to numeric and symbolic predictions", () => {
    const model = KernelRegression.new([[0]], [1], { sigma: 0.5 }).fit();
    const prediction = model.predict([0.5]);
    expect(prediction).toBeCloseTo(Math.exp(-0.5) / 1.05, 10);
    expect(Symbolic.compile(model.predictSym())({ x_0: 0.5 })).toBeCloseTo(prediction, 10);
});

test("symbolic prediction requires and uses a custom symbolic kernel", () => {
    const kernelFn = (a, b) => 1 + a[0] * b[0];
    const model = KernelRegression.new([[1], [2]], [2, 4], { kernelFn, lambda: 1 }).fit();
    expect(() => model.predictSym()).toThrow("symbolic kernel");
    const symbolicModel = KernelRegression.new([[1], [2]], [2, 4], {
        kernelFn,
        kernelSym: (point, coordinates) => Symbolic.real(1).add(Symbolic.real(point[0]).mul(coordinates[0])),
        lambda: 1,
    }).fit();
    const predict = Symbolic.compile(symbolicModel.predictSym());
    expect(predict({ x_0: 3 })).toBeCloseTo(symbolicModel.predict([3]), 10);
});
