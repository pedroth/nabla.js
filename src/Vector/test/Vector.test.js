import Vector, { BUILD_VEC } from "../main/Vector";

test("test creation", () => {
  const expectedArray = testArray(1, 1, 1);
  const u = new Vector([1, 1, 1]);
  const v = Vector.of(1, 1, 1);
  const w = Vector.fromArray(expectedArray);
  expect(u.toArray()).toStrictEqual(expectedArray);
  expect(v.toArray()).toStrictEqual(expectedArray);
  expect(w.toArray()).toStrictEqual(expectedArray);
});
test("test size", () => {
  const v = Vector.of(1, 2, 3);
  expect(v.n).toBe(3);
  expect(v.size()).toBe(3);
  expect(v.shape()).toStrictEqual([3]);
});
test("test map", () => {
  const u = Vector.of(1, 1, 1).map(x => 2 * x);
  expect(u.toArray()).toStrictEqual(testArray(2, 2, 2));
});
test("test fold", () => {
  const sum = Vector.of(1, 1, 1).reduce((e, x) => e + x, 0);
  expect(sum).toStrictEqual(3);
  const sum2 = Vector.of(1, 1, 1).fold((e, x) => e + x, 0);
  expect(sum2).toStrictEqual(3);
});
test("test operation", () => {
  const u = Vector.of(1, 1, 1);
  const v = u.op(u, (a, b) => a + b);
  expect(v.toArray()).toStrictEqual(testArray(2, 2, 2));
});
test("test add", () => {
  const u = Vector.of(1, 2);
  const v = Vector.of(1, 1);
  expect(u.add(v).toArray()).toStrictEqual(testArray(2, 3));
});
test("test sub", () => {
  const u = Vector.of(1, 2);
  const v = Vector.of(1, 1);
  expect(u.sub(v).toArray()).toStrictEqual(testArray(0, 1));
});
test("test mul", () => {
  const u = Vector.of(1, 2);
  const v = Vector.of(1, 1);
  expect(u.mul(v).toArray()).toStrictEqual(testArray(1, 2));
});
test("test div", () => {
  const u = Vector.of(1, 2);
  const v = Vector.of(2, 1);
  expect(u.div(v).toArray()).toStrictEqual(testArray(0.5, 2));
});
test("test scale", () => {
  const u = Vector.of(1, 1);
  expect(u.scale(3).toArray()).toStrictEqual(testArray(3, 3));
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
test("test take", () => {
  const u = Vector.of(1, 2, 3, 4);
  expect(u.take(3).toArray()).toStrictEqual(testArray(1, 2, 3));
});
test("test e(n)", () => {
  const v = Vector.of(1, 2, 3);
  const e = Vector.e(3);
  expect(v.dot(e(0))).toBe(1);
  expect(v.dot(e(1))).toBe(2);
  expect(v.dot(e(2))).toBe(3);
});

test("get i", () => {
  expect(Vector.e(10)(7).get(7)).toBe(1);
  expect(Vector.e(10)(7).get(8)).toBe(0);
});

test("copy", () => {
  expect(Vector.of(1, 2, 3).copy().toArray()).toStrictEqual(testArray(1, 2, 3));
});

test("performance test", () => {
  const n = 1000000;
  const dot = (u, v) => {
    let acc = 0;
    for (let i = 0; i < u.length; i++) {
      acc += u[i] * v[i];
    }
    return acc;
  };
  const u = Vector.e(n)(0);
  const v = Vector.e(n)(1);
  const vecT = perf(() => u.dot(v));
  const w = BUILD_VEC(n);
  w[0] = 1;
  const s = BUILD_VEC(n);
  s[1] = 1;
  const forT = perf(() => dot(w, s));
  expect(vecT < forT).toBe(true);
});

const testArray = (...array) => {
  const ans = new Float64Array(array.length);
  for (let i = 0; i < array.length; i++) {
    ans[i] = array[i];
  }
  return ans;
};

const perf = f => {
  const t = performance.now();
  f();
  return performance.now() - t;
};
