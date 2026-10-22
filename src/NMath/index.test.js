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
