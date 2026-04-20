import { expect, test } from "bun:test";
import { Either } from ".";

test("either creation", () => {
    expect(Either.left(1).orLeft()).toBe(1);
    expect(Either.right(1).orRight()).toBe(1);
});

test("map on Left", () => {
    expect(Either.left(1).map(x => x + 1).orLeft()).toBe(2);
});

test("map on Right", () => {
    expect(Either.right(1).map(x => x + 1).orRight()).toBe(2);
});

test("mapLeft", () => {
    expect(Either.left(1).mapLeft(x => x + 1).orLeft()).toBe(2);
    expect(Either.right(1).mapLeft(x => x + 1).orRight()).toBe(1);
});

test("mapRight", () => {
    expect(Either.right(1).mapRight(x => x + 1).orRight()).toBe(2);
    expect(Either.left(1).mapRight(x => x + 1).orLeft()).toBe(1);
});

test("isLeft / isRight", () => {
    expect(Either.left(1).isLeft()).toBe(true);
    expect(Either.left(1).isRight()).toBe(false);
    expect(Either.right(1).isLeft()).toBe(false);
    expect(Either.right(1).isRight()).toBe(true);
});

test("orLeft with default", () => {
    expect(Either.left(5).orLeft()).toBe(5);
    expect(Either.right(5).orLeft(() => 10)).toBe(10);
});

test("orRight with default", () => {
    expect(Either.right(5).orRight()).toBe(5);
    expect(Either.left(5).orRight(() => 10)).toBe(10);
});

test("toString", () => {
    expect(Either.left(1).toString()).toBe("Left(1)");
    expect(Either.right(1).toString()).toBe("Right(1)");
});

test("equals", () => {
    expect(Either.left(1).equals(Either.left(1))).toBe(true);
    expect(Either.left(1).equals(Either.left(2))).toBe(false);
    expect(Either.left(1).equals(Either.right(1))).toBe(false);
    expect(Either.right(1).equals(Either.right(1))).toBe(true);
    expect(Either.right(1).equals(Either.right(2))).toBe(false);
    expect(Either.right(1).equals(Either.left(1))).toBe(false);
});

test("isEmpty", () => {
    expect(Either.left(null).isEmpty()).toBe(true);
    expect(Either.left(undefined).isEmpty()).toBe(true);
    expect(Either.left(1).isEmpty()).toBe(false);
    expect(Either.right(null).isEmpty()).toBe(true);
    expect(Either.right(undefined).isEmpty()).toBe(true);
    expect(Either.right(1).isEmpty()).toBe(false);
});
