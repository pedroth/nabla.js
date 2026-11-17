import { expect, spyOn, test } from "bun:test";
import { Kmeans } from "./index.js";
import { NMath } from "../NMath/index.js";

test("fits numeric array data and predicts the nearest cluster", () => {
  const model = Kmeans.new([[0], [2], [4]], 1, { maxIterations: 1 });

  expect(model.fit()).toBe(model);
  expect(Object.values(model).every(value => typeof value === "function")).toBe(true);
  expect(model.loss()).toBe(8);
  expect(model.predictIndex(NMath.vec(3))).toBe(0);
  expect(model.predict(NMath.vec(3)).toArray()).toEqual([1]);
});

test("accepts NMath vectors and safely updates empty clusters", () => {
  const model = Kmeans.new([NMath.vec(1, 2), NMath.vec(3, 4)], 3, {
    maxIterations: 2,
  });

  expect(model.fit()).toBe(model);
  expect(Number.isFinite(model.loss())).toBe(true);
  expect(model.predict(NMath.vec(3, 4)).toArray()).toHaveLength(3);
});

test("selects the lowest-loss initialization before updating", () => {
  const random = spyOn(Math, "random")
    .mockReturnValueOnce(0).mockReturnValueOnce(0)
    .mockReturnValueOnce(0).mockReturnValueOnce(0.5)
    .mockReturnValueOnce(0).mockReturnValueOnce(0.25);
  try {
    const model = Kmeans.new([[0], [1], [10], [11]], 2, {
      maxIterations: 0,
      initIterations: 3,
    }).fit();
    expect(model.loss()).toBe(2);
    expect(model.predictIndex([0])).toBe(0);
    expect(model.predictIndex([10])).toBe(1);
    expect(random).toHaveBeenCalledTimes(6);
  } finally {
    random.mockRestore();
  }
});

test("init and update are chainable and operate on the bound data", () => {
  const model = Kmeans.new([[0], [2], [4]], 1);
  expect(model.init()).toBe(model);
  expect(model.update()).toBe(model);
  expect(model.loss()).toBe(8);
});

test("rejects empty or inconsistent input data", () => {
  expect(() => Kmeans.new([], 1)).toThrow("non-empty array");
  expect(() => Kmeans.new([[1], [1, 2]], 1)).toThrow("same non-zero dimension");
});
