import { expect, test } from "bun:test";
import { Tuple } from './index.js';

test('Tuple.of', () => {
    expect(Tuple.of(2, 3, "a").toArray()).toEqual([2, 3, "a"]);
});

test('Tuple.fromArray', () => {
    expect(Tuple.fromArray([1, 2, 3]).toArray()).toEqual([1, 2, 3]);
});

test('isEmpty', () => {
    expect(Tuple.of().isEmpty()).toBe(true);
    expect(Tuple.of(1, 2).isEmpty()).toBe(false);
});

test('size', () => {
    expect(Tuple.of().size()).toBe(0);
    expect(Tuple.of(1, 2, 3).size()).toBe(3);
});

test('get', () => {
    const tuple = Tuple.of("a", "b", "c");
    expect(tuple.get(0).orElse(() => null)).toBe("a");
    expect(tuple.get(1).orElse(() => null)).toBe("b");
    expect(tuple.get(2).orElse(() => null)).toBe("c");
    expect(tuple.get(5).isSome()).toBe(false);
});

test('add', () => {
    expect(Tuple.of(1, 2).add(3).toArray()).toEqual([1, 2, 3]);
    expect(Tuple.of().add(1).toArray()).toEqual([1]);
});

test('map', () => {
    expect(Tuple.of(1, 2, 3).map(x => x * x).toArray()).toEqual([1, 4, 9]);
    expect(Tuple.of().map(x => x * x).isEmpty()).toBe(true);
});

test('filter', () => {
    expect(
        Tuple.of(1, 2, 3, 4, 5, 6, 7, 8, 9)
            .filter(x => x % 2 === 1)
            .equals(Tuple.of(1, 3, 5, 7, 9))
    ).toBe(true);
});

test('fold', () => {
    expect(Tuple.of(1, 2, 3).fold(0, (e, x) => e + x)).toBe(6);
    expect(Tuple.of().fold(0, (e, x) => e + x)).toBe(0);
});

test('forEach', () => {
    const items = [];
    const result = Tuple.of(1, 2, 3).forEach(x => items.push(x));
    expect(items).toEqual([1, 2, 3]);
    expect(result.toArray()).toEqual([1, 2, 3]);
});

test('equals', () => {
    expect(Tuple.of(1, 2, 3).equals(Tuple.of(1, 2, 3))).toBe(true);
    expect(Tuple.of("a", "b").equals(Tuple.of("a", "c"))).toBe(false);
    expect(Tuple.of(1, 2).equals(Tuple.of(1, 2, 3))).toBe(false);
    expect(Tuple.of().equals(Tuple.of())).toBe(true);
    expect(Tuple.of(1).equals("not a tuple")).toBe(false);
});

test('union', () => {
    expect(
        Tuple.of(false, true).union(Tuple.of(1, 2, 3)).toArray()
    ).toEqual([false, true, 1, 2, 3]);
    expect(Tuple.of().union(Tuple.of(1)).toArray()).toEqual([1]);
    expect(Tuple.of(1).union(Tuple.of()).toArray()).toEqual([1]);
});

test('zip', () => {
    expect(
        Tuple.of("a", "b", "c")
            .zip(Tuple.of(1, 2, 3))
            .map(x => x.left() + x.right())
            .toArray()
    ).toEqual(["a1", "b2", "c3"]);
});

test('toString', () => {
    expect(Tuple.of(1, 2, 3).toString()).toBe("(1,2,3)");
    expect(Tuple.of().toString()).toBe("()");
});

