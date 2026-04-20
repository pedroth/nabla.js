import { expect, test } from "bun:test";
import { List } from './index.js';
import { Tuple } from "../Tuple/index.js";

test("List.of", () => {
    expect(List.of(1, 2, 3).toArray()).toEqual([1, 2, 3]);
    expect(List.of().isEmpty()).toBe(true);
});

test("isEmpty", () => {
    expect(List.of().isEmpty()).toBe(true);
    expect(List.of(1).isEmpty()).toBe(false);
});

test("size", () => {
    expect(List.of().size()).toBe(0);
    expect(List.of(1, 2, 3).size()).toBe(3);
});

test("get", () => {
    const l = List.of(1, 2, 3);
    expect(l.get(0).orElse(() => null)).toBe(1);
    expect(l.get(1).orElse(() => null)).toBe(2);
    expect(l.get(2).orElse(() => null)).toBe(3);
    expect(l.get(-1).orElse(() => null)).toBe(1);
    expect(l.get(10).isSome()).toBe(false);
});

test("set", () => {
    const l = List.of(1, 2, 3);
    l.set(1, 99);
    expect(l.toArray()).toEqual([1, 99, 3]);
    l.set(0, 10);
    expect(l.toArray()).toEqual([10, 99, 3]);
});

test("push", () => {
    const l = List.of(1, 2);
    l.push(3);
    expect(l.toArray()).toEqual([1, 2, 3]);
    const empty = List.of();
    empty.push(1);
    expect(empty.toArray()).toEqual([1]);
});

test("pop", () => {
    const l = List.of(1, 2, 3);
    expect(l.pop().orElse(() => null)).toBe(3);
    expect(l.toArray()).toEqual([1, 2]);
    expect(l.pop().orElse(() => null)).toBe(2);
    expect(l.pop().orElse(() => null)).toBe(1);
    expect(l.pop().isSome()).toBe(false);
});

test("map", () => {
    expect(List.of(1, 2, 3).map(x => x * x).toArray()).toEqual([1, 4, 9]);
    expect(List.of().map(x => x * x).isEmpty()).toBe(true);
});

test("filter", () => {
    expect(
        List.of(1, 2, 3, 4, 5, 6, 7, 8, 9)
            .filter(x => x % 2 === 1)
            .toArray()
    ).toEqual([1, 3, 5, 7, 9]);
});

test("flatMap", () => {
    expect(
        List.of(1, 2, 3)
            .flatMap(x => List.of(x, x * 10))
            .toArray()
    ).toEqual([1, 10, 2, 20, 3, 30]);
});

test("fold", () => {
    expect(List.of(1, 2, 3).fold(0, (e, x) => e + x)).toBe(6);
    expect(List.of().fold(0, (e, x) => e + x)).toBe(0);
});

test("union", () => {
    expect(
        List.of(1, 2, 3).union(List.of(4, 5, 6)).toArray()
    ).toEqual([1, 2, 3, 4, 5, 6]);
    expect(List.of().union(List.of(1)).toArray()).toEqual([1]);
    expect(List.of(1).union(List.of()).toArray()).toEqual([1]);
});

test("zip", () => {
    expect(
        List.of("a", "b", "c")
            .zip(List.of(1, 2, 3))
            .map(p => p.left() + p.right())
            .toArray()
    ).toEqual(["a1", "b2", "c3"]);
    expect(List.of().zip(List.of(1)).isEmpty()).toBe(true);
});

test("prod", () => {
    const l = List.of(0, 1);
    const expectedBinary = List.of(
        Tuple.of(0, 0), Tuple.of(0, 1),
        Tuple.of(1, 0), Tuple.of(1, 1)
    );
    const expectedTernary = List.of(
        Tuple.of(0, 0, 0), Tuple.of(0, 0, 1),
        Tuple.of(0, 1, 0), Tuple.of(0, 1, 1),
        Tuple.of(1, 0, 0), Tuple.of(1, 0, 1),
        Tuple.of(1, 1, 0), Tuple.of(1, 1, 1),
    );
    expect(l.prod(l).equals(expectedBinary)).toBe(true);
    expect(l.prod(l).prod(l).equals(expectedTernary)).toBe(true);
});

test("toString", () => {
    expect(List.of(1, 2, 3).toString()).toBe("[1,2,3]");
    expect(List.of().toString()).toBe("[]");
});