import { expect, test } from "bun:test";
import { Maybe } from ".";

test("Maybe.of", () => {
    expect(Maybe.of(1).orElse()).toBe(1);
    expect(Maybe.of(null).isSome()).toBe(false);
    expect(Maybe.of(undefined).isSome()).toBe(false);
});

test("Maybe.some", () => {
    expect(Maybe.some(42).orElse()).toBe(42);
    expect(Maybe.some(42).isSome()).toBe(true);
});

test("Maybe.none", () => {
    expect(Maybe.none().isSome()).toBe(false);
    expect(Maybe.none().orElse(() => 99)).toBe(99);
});

test("map on Some", () => {
    expect(Maybe.some(2).map(x => x * 3).orElse()).toBe(6);
});

test("map on None", () => {
    expect(Maybe.none().map(x => x * 3).isSome()).toBe(false);
});

test("filter", () => {
    expect(Maybe.some(4).filter(x => x > 2).orElse()).toBe(4);
    expect(Maybe.some(1).filter(x => x > 2).isSome()).toBe(false);
    expect(Maybe.none().filter(x => x > 2).isSome()).toBe(false);
});

test("orElse", () => {
    expect(Maybe.some(5).orElse(() => 10)).toBe(5);
    expect(Maybe.none().orElse(() => 10)).toBe(10);
});

test("forEach", () => {
    const values = [];
    Maybe.some(7).forEach(x => values.push(x));
    Maybe.none().forEach(x => values.push(x));
    expect(values).toEqual([7]);
});

test("flatMap", () => {
    expect(
        Maybe.some(1)
            .flatMap(x => Maybe.some(x + 1))
            .orElse(() => 0)
    ).toBe(2);
    expect(
        Maybe.some(1)
            .flatMap(() => Maybe.none())
            .isSome()
    ).toBe(false);
    expect(
        Maybe.none()
            .flatMap(x => Maybe.some(x + 1))
            .isSome()
    ).toBe(false);
});

test("isSome", () => {
    expect(Maybe.some(1).isSome()).toBe(true);
    expect(Maybe.none().isSome()).toBe(false);
});