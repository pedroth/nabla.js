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
