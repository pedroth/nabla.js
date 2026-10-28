import { expect, test } from "bun:test";
import { NMath } from "./index.js";

test("sparse matrix-vector product returns a vector", () => {
    const matrix = NMath.smat.builder(2, 3)
        .set(0, 0, 1)
        .set(0, 2, 2)
        .set(1, 1, 3)
        .build();

    const result = matrix.prodVec(NMath.vec(2, 3, 4));

    expect(result.type).toBe(NMath.TYPES.vector);
    expect(result.toArray()).toEqual([10, 9]);
});

test("sparse matrix dot computes the transpose product", () => {
    const matrix = NMath.smat.builder(2, 3)
        .set(0, 0, 1)
        .set(0, 1, 2)
        .set(1, 1, 3)
        .set(1, 2, 4)
        .build();

    expect(matrix.dotVec(NMath.vec(2, 3)).toArray()).toEqual([2, 13, 12]);
    expect(matrix.dot(NMath.smat.builder(2, 2)
        .set(0, 0, 1)
        .set(0, 1, 2)
        .set(1, 0, 3)
        .set(1, 1, 4)
        .build()).toString()).toBe("[[1, 2], [11, 16], [12, 16]]");
});

test("dense matrix dot computes the transpose product", () => {
    const matrix = NMath.mat([1, 2, 3, 4, 5, 6], [2, 3]);

    expect(matrix.dot(NMath.vec(2, 3)).toArray()).toEqual([14, 19, 24]);
    expect(matrix.dot(NMath.mat([1, 2, 3, 4], [2, 2])).data).toEqual([
        13, 18,
        17, 24,
        21, 30,
    ]);
});

test("minimum eigenvalue descent converges with projected Adam", () => {
    const matrix = NMath.smat.builder(2, 2)
        .set(0, 0, 1)
        .set(1, 1, 4)
        .build();

    const result = matrix.eigen({
        maxFirst: false,
        k: 1,
        tolerance: 1e-8,
    });

    expect(result.eigenvalues[0]).toBeCloseTo(1, 6);
    expect(result.eigenvectors[0].length()).toBeCloseTo(1, 12);
});

test("solve minimizes a square least-squares system", () => {
    const matrix = NMath.mat([4, 1, 1, 3], [2, 2]);
    const result = matrix.solve(NMath.vec(1, 2));

    expect(result.components[0]).toBeCloseTo(1 / 11, 6);
    expect(result.components[1]).toBeCloseTo(7 / 11, 6);
});

test("solve uses the transpose product for rectangular matrices", () => {
    const matrix = NMath.mat([1, 0, 0, 1, 1, 1], [3, 2]);
    const result = matrix.solve(NMath.vec(1, 2, 3));

    expect(result.components[0]).toBeCloseTo(1, 6);
    expect(result.components[1]).toBeCloseTo(2, 6);
});

test("sparse solve uses the transpose product for rectangular matrices", () => {
    const matrix = NMath.smat.builder(3, 2)
        .set(0, 0, 1)
        .set(1, 1, 1)
        .set(2, 0, 1)
        .set(2, 1, 1)
        .build();
    const result = matrix.solve(NMath.vec(1, 2, 3));

    expect(result.components[0]).toBeCloseTo(1, 6);
    expect(result.components[1]).toBeCloseTo(2, 6);
});
