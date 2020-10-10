import Vector from "../main/Vector";

test("test creation", () => {
  const u = new Vector(1, 1, 1);
  const v = Vector.of(1, 1, 1);
  const w = Vector.fromArray([1, 1, 1]);
  expect(u.toArray()).toStrictEqual([1, 1, 1]);
  expect(v.toArray()).toStrictEqual([1, 1, 1]);
  expect(w.toArray()).toStrictEqual([1, 1, 1]);
});
test("test map", () => {
  const u = Vector.of(1, 1, 1).map(x => 2 * x);
  expect(u.toArray()).toStrictEqual([2, 2, 2]);
});
test("test fold", () => {
  const sum = Vector.of(1, 1, 1).reduce((e, x) => e + x, 0);
  expect(sum).toStrictEqual(3);
});
test("test operation", () => {
  const u = Vector.of(1, 1, 1);
  const v = u.op(u, (a, b) => a + b);
  expect(v.toArray()).toStrictEqual([2, 2, 2]);
});
test("test add", () => {
  const u = Vector.of(1, 2);
  const v = Vector.of(1, 1);
  expect(u.add(v).toArray()).toStrictEqual([2, 3]);
});
test("test sub", () => {
  const u = Vector.of(1, 2);
  const v = Vector.of(1, 1);
  expect(u.sub(v).toArray()).toStrictEqual([0, 1]);
});
test("test mul", () => {
  const u = Vector.of(1, 2);
  const v = Vector.of(1, 1);
  expect(u.mul(v).toArray()).toStrictEqual([1, 2]);
});
test("test div", () => {
  const u = Vector.of(1, 2);
  const v = Vector.of(2, 1);
  expect(u.div(v).toArray()).toStrictEqual([0.5, 2]);
});
test("test scale", () => {
  const u = Vector.of(1, 1);
  expect(u.scale(3).toArray()).toStrictEqual([3, 3]);
});
test("test length", () => {
  const u = Vector.of(1, 1);
  expect(u.length()).toBeCloseTo(Math.sqrt(2));
});
test("test normalization", () => {
  const u = Vector.of(1, 1);
  expect(u.normalize().length()).toBeCloseTo(1);
});
test("test equals", () => {
  const u = Vector.of(1, 1, 1, 1);
  expect(u.equals(u)).toBe(true);
});
