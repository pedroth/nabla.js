import { expect, test } from "bun:test";
import { maybe, some, none } from "./index.js"

test("maybe creation", () => {
    expect(maybe(1).orElse()).toBe(1);
    expect(maybe().orElse(() => 2)).toBe(2);
});

test("map", () => {
    expect(some(0).map(x => x + 1).orElse(() => 2)).toBe(1);
    expect(none().map(x => x + 1).orElse(() => 2)).toBe(2);
})

test("flatMap", () => {
    expect(
        some(0)
            .flatMap(x => some(x + 1))
            .orElse(() => 2)
    )
        .toBe(1);
    expect(
        some(0)
            .flatMap(x => some(x + 1))
            .flatMap(() => none())
            .orElse(() => 2)
    )
        .toBe(2);
})