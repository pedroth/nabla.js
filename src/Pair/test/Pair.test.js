import Pair from "../main/Pair";

test("test creation", () => {
  const u = new Pair(1, 2);
  const v = Pair.of(1, 2);
  const w = Pair.fromArray([1, 2, 3]);
  expect(u.toArray()).toStrictEqual([1, 2]);
  expect(v.toArray()).toStrictEqual([1, 2]);
  expect(w.toArray()).toStrictEqual([1, 2]);
});
test("test getter", () => {
  const u = Pair.cons(1, 2);
  expect(u.left()).toBe(1);
  expect(u.key()).toBe(1);
  expect(u.first()).toBe(1);
  expect(u.right()).toBe(2);
  expect(u.val()).toBe(2);
  expect(u.second()).toBe(2);
});
test("test map", () => {
  const u = Pair.cons(1, 2).map(x => 2 * x);
  expect(u.toArray()).toStrictEqual([2, 4]);
});
test("test fold", () => {
  const u = Pair.of(1, 2);
  const sum = u.reduce((a, b) => a + b, 0);
  expect(sum).toBe(sum);
});
test("test operation", () => {
  const u = Pair.of(1, 2);
  const v = Pair.of(1, 1);
  const result = u.op(v, (a, b) => a + b);
  expect(result.toArray()).toStrictEqual([2, 3]);
});

test("test isEmpty", () => {
  const u = new Pair();
  expect(u.isEmpty()).toStrictEqual(true);
});

test("test copy", () => {
  const u = new Pair(1, "2");
  expect(u.toArray()).toStrictEqual([1, "2"]);
});
