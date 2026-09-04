import { expect, test } from "bun:test";
import { NArray } from './index.js';
import { Tuple } from "../Tuple/index.js";
import { Pair } from "../Pair/index.js";

test("NArray.of", () => {
    expect(NArray.of(1, 2, 3).toArray()).toEqual([1, 2, 3]);
    expect(NArray.of().isEmpty()).toBe(true);
});

test("NArray.fromArray", () => {
    expect(NArray.fromArray([1, 2, 3]).toArray()).toEqual([1, 2, 3]);
});

test("NArray.range", () => {
    expect(NArray.range(0, 5).toArray()).toEqual([0, 1, 2, 3, 4]);
    expect(NArray.range(3, 3).isEmpty()).toBe(true);
});

test("isEmpty", () => {
    expect(NArray.of().isEmpty()).toBe(true);
    expect(NArray.of(1).isEmpty()).toBe(false);
});

test("size", () => {
    expect(NArray.of().size()).toBe(0);
    expect(NArray.of(1, 2, 3).size()).toBe(3);
});

test("get", () => {
    const a = NArray.of(10, 20, 30);
    expect(a.get(0).orElse(() => null)).toBe(10);
    expect(a.get(1).orElse(() => null)).toBe(20);
    expect(a.get(2).orElse(() => null)).toBe(30);
    expect(a.get(-1).orElse(() => null)).toBe(10);
    expect(NArray.of().get(0).isSome()).toBe(false);
});

test("set", () => {
    const a = NArray.of(1, 2, 3);
    a.set(1, 99);
    expect(a.toArray()).toEqual([1, 99, 3]);
});

test("push", () => {
    const a = NArray.of(1, 2);
    a.push(3);
    expect(a.toArray()).toEqual([1, 2, 3]);
    expect(a.size()).toBe(3);
});

test("push triggers resize", () => {
    const a = NArray.of();
    for (let i = 0; i < 20; i++) a.push(i);
    expect(a.size()).toBe(20);
    expect(a.get(19).orElse(() => null)).toBe(19);
});

test("pop", () => {
    const a = NArray.of(1, 2, 3);
    expect(a.pop().orElse(() => null)).toBe(3);
    expect(a.size()).toBe(2);
    expect(a.pop().orElse(() => null)).toBe(2);
    expect(a.size()).toBe(1);
    expect(NArray.of().pop().isSome()).toBe(false);
});

test("del", () => {
    const a = NArray.of(1, 2, 3, 4);
    a.del(0);
    expect(a.size()).toBe(3);
    expect(a.toArray()).toEqual([2, 3, 4]);

    const b = NArray.of(1, 2, 3, 4);
    b.del(1);
    expect(b.size()).toBe(3);
    expect(b.toArray()).toEqual([1, 3, 4]);

    const c = NArray.of(1, 2, 3, 4);
    c.del(10);
    expect(c.size()).toBe(4);
    expect(c.toArray()).toEqual([1, 2, 3, 4]);
});

test("sort", () => {
    const a = NArray.of(3, 1, 4, 2);
    expect(a.sort().toArray()).toEqual([1, 2, 3, 4]);

    const b = NArray.of(3, 1, 4, 2);
    expect(b.sort((x, y) => y - x).toArray()).toEqual([4, 3, 2, 1]);
});

test("map", () => {
    expect(NArray.of(1, 2, 3).map(x => x * x).toArray()).toEqual([1, 4, 9]);
    expect(NArray.of().map(x => x * x).isEmpty()).toBe(true);
});

test("filter", () => {
    expect(
        NArray.of(1, 2, 3, 4, 5).filter(x => x % 2 === 1).toArray()
    ).toEqual([1, 3, 5]);
});

test("flatMap", () => {
    expect(
        NArray.of(1, 2, 3)
            .flatMap(x => NArray.of(x, x * 10))
            .toArray()
    ).toEqual([1, 10, 2, 20, 3, 30]);
});

test("fold", () => {
    expect(NArray.of(1, 2, 3).fold(0, (acc, x) => acc + x)).toBe(6);
    expect(NArray.of().fold(0, (acc, x) => acc + x)).toBe(0);
});

test("union", () => {
    expect(
        NArray.of(1, 2).union(NArray.of(3, 4)).toArray()
    ).toEqual([1, 2, 3, 4]);
    expect(NArray.of().union(NArray.of(1)).toArray()).toEqual([1]);
    expect(NArray.of(1).union(NArray.of()).toArray()).toEqual([1]);
});

test("zip", () => {
    const zipped = NArray.of("a", "b", "c").zip(NArray.of(1, 2, 3));
    expect(zipped.size()).toBe(3);
    expect(zipped.toArray()).toEqual([
        Pair.of("a", 1),
        Pair.of("b", 2),
        Pair.of("c", 3)
    ]);

});

test("prod", () => {
    const a = NArray.of(0, 1);
    const expected = NArray.of(
        Tuple.of(0, 0), Tuple.of(0, 1),
        Tuple.of(1, 0), Tuple.of(1, 1)
    );
    expect(a.prod(a).equals(expected)).toBe(true);
    expect(NArray.of().prod(a).isEmpty()).toBe(true);
});

test("equals", () => {
    expect(NArray.of(1, 2, 3).equals(NArray.of(1, 2, 3))).toBe(true);
    expect(NArray.of(1, 2).equals(NArray.of(1, 3))).toBe(false);
    expect(NArray.of(1).equals(NArray.of(1, 2))).toBe(false);
});

test("forEach", () => {
    const result = [];
    NArray.of(1, 2, 3).forEach((x, i) => result.push([i, x]));
    expect(result).toEqual([[0, 1], [1, 2], [2, 3]]);
    NArray.of().forEach(() => { throw new Error("should not be called"); });
});

test("some", () => {
    expect(NArray.of(1, 2, 3).some(x => x > 2)).toBe(true);
    expect(NArray.of(1, 2, 3).some(x => x > 10)).toBe(false);
    expect(NArray.of().some(() => true)).toBe(false);
});

test("reverse", () => {
    expect(NArray.of(1, 2, 3).reverse().toArray()).toEqual([3, 2, 1]);
    expect(NArray.of(1).reverse().toArray()).toEqual([1]);
    expect(NArray.of().reverse().isEmpty()).toBe(true);
});

test("iterator", () => {
    const it = NArray.of(10, 20, 30).iterator();
    expect(it.next().orElse()).toBe(10);
    expect(it.next().orElse()).toBe(20);
    expect(it.next().orElse()).toBe(30);
    expect(it.next().isSome()).toBe(false);
});

test("toString", () => {
    expect(NArray.of(1, 2, 3).toString()).toBe("[1, 2, 3]");
    expect(NArray.of().toString()).toBe("[]");
});

test("swap", () => {
    const a = NArray.of(1, 2, 3);
    a.swap(0, 2);
    expect(a.toArray()).toEqual([3, 2, 1]);
    a.swap(0, 5); // out-of-bounds: no-op
    expect(a.toArray()).toEqual([3, 2, 1]);
    a.swap(1, 1); // same index: no-op
    expect(a.toArray()).toEqual([3, 2, 1]);
});

test("shuffle", () => {
    const a = NArray.of(1, 2, 3, 4, 5);
    const b = a.shuffle();
    expect(b.size()).toBe(5);
    expect(b.sort().toArray()).toEqual([1, 2, 3, 4, 5]);
    expect(a.toArray()).toEqual([1, 2, 3, 4, 5]); // original unchanged
});

test("permute", () => {
    // element at index i is placed at position permutation[i]
    const a = NArray.of("a", "b", "c");
    expect(a.permute([2, 0, 1]).toArray()).toEqual(["b", "c", "a"]);
});

test("groupBy", () => {
    const a = NArray.of(1, 2, 3, 4, 5, 6);
    const groups = a.groupBy(x => x % 2 === 0 ? "even" : "odd");
    expect(groups.get("even").orElse().toArray()).toEqual([2, 4, 6]);
    expect(groups.get("odd").orElse().toArray()).toEqual([1, 3, 5]);
});
