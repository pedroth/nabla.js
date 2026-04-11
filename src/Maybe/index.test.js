import { expect, test } from "bun:test";
import { Maybe, None, Some } from ".";

test("maybe creation", () => {
    expect(Maybe.of(1).orElse()).toBe(1);
    expect(Maybe.of().orElse(() => 2)).toBe(2);
});

test("map", () => {
    expect(Some.of(0).map(x => x + 1).orElse(() => 2)).toBe(1);
    expect(None.of().map(x => x + 1).orElse(() => 2)).toBe(2);
})

test("flatMap", () => {
    expect(
        Some.of(0)
            .flatMap(x => Some.of(x + 1))
            .orElse(() => 2)
    )
        .toBe(1);
    expect(
        Some.of(0)
            .flatMap(x => Some.of(x + 1))
            .flatMap(() => None.of())
            .orElse(() => 2)
    )
        .toBe(2);
})