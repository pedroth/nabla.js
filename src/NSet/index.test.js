import { expect, test } from "bun:test";
import { NSet } from './index.js';
import { Tuple } from "../Tuple/index.js";

test("Set creation and equality", () => {
    const setA = NSet.of(1, 2, 3);
    const setB = NSet.of(3, 2, 2, 1, 1, 1);
    expect(setA.equals(setB)).toBe(true);
    expect(NSet.of(2, 1).equals(setA)).toBe(false);
});


test("Set of sets", () => {
    const setA = new NSet()
        .add(NSet.of(1, 2, 3))
        .add(NSet.of("a", "b", "c"))
        .add(NSet.of(true, false));
    const setB = new NSet()
        .add(NSet.of(1, 2, 3))
        .add(NSet.of(true, false));
    expect(setB.isSubSet(setA)).toBe(true);
    expect(setA.equals(setA)).toBe(true);
    expect(setA.equals(setB)).toBe(false);
})

test("is empty", () => {
    expect(new NSet().isEmpty()).toBe(true);
    expect(NSet.of("a", "b").isEmpty()).toBe(false);
});

test("size", () => {
    expect(new NSet().size()).toBe(0);
    expect(NSet.of("a", "b").size()).toBe(2);
});

test("union", () => {
    const union = NSet.of("a", "b").union(NSet.of("a", "c", "d"));
    const expectedUnion = NSet.of("a", "b", "c", "d");
    expect(union.equals(expectedUnion)).toBe(true);
});

test("intersection", () => {
    let intersection = NSet.of("a", "b", "c").intersection(NSet.of("a", "c", "d"));
    let expectedIntersection = NSet.of("c", "a");
    expect(intersection.equals(expectedIntersection)).toBe(true);
    intersection = NSet.of(2, 4, 6).intersection(NSet.of(1, 3, 5));
    expect(intersection.isEmpty()).toBe(true);
});

test("map", () => {
    expect(
        NSet
            .range(0, 10)
            .map(x => x * x)
            .toArray()
    ).toEqual(
        [...Array(10)]
            .map((x, i) => i)
            .map(x => x * x)
    )
})

test("filter", () => {
    expect(
        NSet
            .range(0, 10)
            .filter(x => x % 2 === 0)
            .toArray()
    )
        .toEqual(
            [...Array(10)]
                .map((x, i) => i)
                .filter(x => x % 2 === 0)
        )
})

test("cartesian product", () => {
    const expectedBinary = NSet.of(Tuple.of(0, 0), Tuple.of(0, 1), Tuple.of(1, 0), Tuple.of(1, 1));
    const expectedTernary = NSet.of(
        Tuple.of(0, 0, 0),
        Tuple.of(0, 0, 1),
        Tuple.of(0, 1, 0),
        Tuple.of(0, 1, 1),
        Tuple.of(1, 0, 0),
        Tuple.of(1, 0, 1),
        Tuple.of(1, 1, 0),
        Tuple.of(1, 1, 1),
    )
    const s = NSet.of(0, 1);
    expect(s.prod(s).equals(expectedBinary)).toBe(true);
    expect(s.prod(s).prod(s).equals(expectedTernary)).toBe(true);
})

test("is subset", () => {
    expect(NSet.of().isSubSet(NSet.of("a", "b", "c"))).toBe(true);
    expect(NSet.of("a", "b").isSubSet(NSet.of("a", "b", "c"))).toBe(true);
    expect(NSet.of("a", "d").isSubSet(NSet.of("a", "b", "c"))).toBe(false);
});


test("power set", () => {
    const expectedSet = NSet.of(
        new NSet(),
        NSet.of("a"),
        NSet.of("b"),
        NSet.of("c"),
        NSet.of("a", "b"),
        NSet.of("a", "c"),
        NSet.of("b", "c"),
        NSet.of("a", "b", "c")
    );
    expect(NSet.powerSet(NSet.of("a", "b", "c")).equals(expectedSet)).toBe(true)
})