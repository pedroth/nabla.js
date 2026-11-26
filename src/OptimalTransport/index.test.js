import { expect, test } from "bun:test";
import { OptimalTransport } from "./index.js";

test("fits a plan with the requested marginals", () => {
  const ot = OptimalTransport.new(
    { points: [[0], [1]], weights: [0.25, 0.75] },
    { points: [[0], [1], [2]], weights: [0.5, 0.25, 0.25] },
    { entropy: 0.05 }
  ).fit();
  const { plan } = ot;
  const rows = [0, 1].map(i => [0, 1, 2].reduce((s, j) => s + plan.get(i, j), 0));
  const cols = [0, 1, 2].map(j => plan.get(0, j) + plan.get(1, j));
  rows.forEach((r, i) => expect(r).toBeCloseTo([0.25, 0.75][i], 5));
  cols.forEach((c, j) => expect(c).toBeCloseTo([0.5, 0.25, 0.25][j], 5));
});

test("maps points to their matched targets and interpolates linearly", () => {
  const ot = OptimalTransport.new(
    { points: [[0, 0], [10, 10]] },
    { points: [[11, 10], [1, 0]] },
    { entropy: 0.001 }
  ).fit();
  expect(ot.map(0).toArray()[0]).toBeCloseTo(1, 3);
  expect(ot.map(1).toArray()[0]).toBeCloseTo(11, 3);
  const half = ot.interpolate(0.5);
  expect(half[0].toArray()[0]).toBeCloseTo(0.5, 3);
  expect(ot.interpolate(5)[0].toArray()[0]).toBeCloseTo(1, 3);
});

test("moves values from another space and validates inputs", () => {
  const ot = OptimalTransport.new(
    { points: [[0]] },
    { points: [[1], [3]] },
    { values: [[10, 0], [30, 0]] }
  ).fit();
  expect(ot.map(0).toArray()).toEqual([20, 0]);
  expect(() => OptimalTransport.new({ points: [[0]], weights: [0.5] }, { points: [[1]] })).toThrow();
  expect(() => OptimalTransport.new({ points: [[0]] }, { points: [[1]] }).map(0)).toThrow();
});

test("interpolate can be restricted to some source indices", () => {
  const ot = OptimalTransport.new({ points: [[0], [10]] }, { points: [[1], [11]] }, { entropy: 0.001 }).fit();
  const [moved] = ot.interpolate(1, { indices: [1] });
  expect(moved.toArray()[0]).toBeCloseTo(11, 3);
});
