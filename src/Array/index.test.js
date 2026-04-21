import { expect, test } from "bun:test";
import { Array } from './index.js';
import { Tuple } from "../Tuple/index.js";

test("Array.of", () => {
    expect(Array.of(1, 2, 3).toArray()).toEqual([1, 2, 3]);
    expect(Array.of().isEmpty()).toBe(true);
});

test("Array.fromArray", () => {
    expect(Array.fromArray([1, 2, 3]).toArray()).toEqual([1, 2, 3]);
});

test("Array.range", () => {
    expect(Array.range(0, 5).toArray()).toEqual([0, 1, 2, 3, 4]);
    expect(Array.range(3, 3).isEmpty()).toBe(true);
});

test("isEmpty", () => {
    expect(Array.of().isEmpty()).toBe(true);
    expect(Array.of(1).isEmpty()).toBe(false);
});

test("size", () => {
    expect(Array.of().size()).toBe(0);
    expect(Array.of(1, 2, 3).size()).toBe(3);
});

test("get", () => {
    const a = Array.of(10, 20, 30);
    expect(a.get(0).orElse(() => null)).toBe(10);
    expect(a.get(1).orElse(() => null)).toBe(20);
    expect(a.get(2).orElse(() => null)).toBe(30);
    expect(a.get(-1).orElse(() => null)).toBe(10);
    expect(Array.of().get(0).isSome()).toBe(false);
});

test("set", () => {
    const a = Array.of(1, 2, 3);
    a.set(1, 99);
    expect(a.toArray()).toEqual([1, 99, 3]);
});

test("push", () => {
    const a = Array.of(1, 2);
    a.push(3);
    expect(a.toArray()).toEqual([1, 2, 3]);
    expect(a.size()).toBe(3);
});

test("push triggers resize", () => {
    const a = Array.of();
    for (let i = 0; i < 20; i++) a.push(i);
    expect(a.size()).toBe(20);
    expect(a.get(19).orElse(() => null)).toBe(19);
});

test("pop", () => {
    const a = Array.of(1, 2, 3);
    expect(a.pop().orElse(() => null)).toBe(3);
    expect(a.size()).toBe(2);
    expect(a.pop().orElse(() => null)).toBe(2);
    expect(a.size()).toBe(1);
    expect(Array.of().pop().isSome()).toBe(false);
});

test("del", () => {
    const a = Array.of(1, 2, 3, 4);
    a.del(0);
    expect(a.size()).toBe(3);
    expect(a.toArray()).toEqual([undefined, 2, 3]);

    const b = Array.of(1, 2, 3, 4);
    b.del(3);
    expect(b.size()).toBe(3);
    expect(b.toArray()).toEqual([1, 2, 3]);
});

test("map", () => {
    expect(Array.of(1, 2, 3).map(x => x * x).toArray()).toEqual([1, 4, 9]);
    expect(Array.of().map(x => x * x).isEmpty()).toBe(true);
});

test("filter", () => {
    expect(
        Array.of(1, 2, 3, 4, 5).filter(x => x % 2 === 1).toArray()
    ).toEqual([1, 3, 5]);
});

test("flatMap", () => {
    expect(
        Array.of(1, 2, 3)
            .flatMap(x => Array.of(x, x * 10))
            .toArray()
    ).toEqual([1, 10, 2, 20, 3, 30]);
});

test("fold", () => {
    expect(Array.of(1, 2, 3).fold(0, (acc, x) => acc + x)).toBe(6);
    expect(Array.of().fold(0, (acc, x) => acc + x)).toBe(0);
});

test("union", () => {
    expect(
        Array.of(1, 2).union(Array.of(3, 4)).toArray()
    ).toEqual([1, 2, 3, 4]);
    expect(Array.of().union(Array.of(1)).toArray()).toEqual([1]);
    expect(Array.of(1).union(Array.of()).toArray()).toEqual([1]);
});

test("zip", () => {
    const zipped = Array.of("a", "b", "c").zip(Array.of(1, 2, 3));
    expect(zipped.size()).toBe(3);
});

test("prod", () => {
    const a = Array.of(0, 1);
    const expected = Array.of(
        Tuple.of(0, 0), Tuple.of(0, 1),
        Tuple.of(1, 0), Tuple.of(1, 1)
    );
    expect(a.prod(a).equals(expected)).toBe(true);
    expect(Array.of().prod(a).isEmpty()).toBe(true);
});

test("equals", () => {
    expect(Array.of(1, 2, 3).equals(Array.of(1, 2, 3))).toBe(true);
    expect(Array.of(1, 2).equals(Array.of(1, 3))).toBe(false);
    expect(Array.of(1).equals(Array.of(1, 2))).toBe(false);
});

test("toString", () => {
    expect(Array.of(1, 2, 3).toString()).toBe("[1, 2, 3]");
    expect(Array.of().toString()).toBe("[]");
});
