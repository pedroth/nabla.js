import { expect, test } from "bun:test";
import { Either, Left, Right } from ".";

test("either creation", () => {
    expect(Either.left(1).orLeft()).toBe(1);
    expect(Either.right(1).orRight()).toBe(1);
});

test("Left.of / Right.of", () => {
    expect(Left.of(42).orLeft()).toBe(42);
    expect(Right.of(42).orRight()).toBe(42);
});

test("map on Left", () => {
    expect(Left.of(1).map(x => x + 1).orLeft()).toBe(2);
});

test("map on Right", () => {
    expect(Right.of(1).map(x => x + 1).orRight()).toBe(2);
});

test("mapLeft", () => {
    expect(Left.of(1).mapLeft(x => x + 1).orLeft()).toBe(2);
    expect(Right.of(1).mapLeft(x => x + 1).orRight()).toBe(1);
});

test("mapRight", () => {
    expect(Right.of(1).mapRight(x => x + 1).orRight()).toBe(2);
    expect(Left.of(1).mapRight(x => x + 1).orLeft()).toBe(1);
});

test("isLeft / isRight", () => {
    expect(Left.of(1).isLeft()).toBe(true);
    expect(Left.of(1).isRight()).toBe(false);
    expect(Right.of(1).isLeft()).toBe(false);
    expect(Right.of(1).isRight()).toBe(true);
});

test("orLeft with default", () => {
    expect(Left.of(5).orLeft()).toBe(5);
    expect(Right.of(5).orLeft(() => 10)).toBe(10);
});

test("orRight with default", () => {
    expect(Right.of(5).orRight()).toBe(5);
    expect(Left.of(5).orRight(() => 10)).toBe(10);
});

test("toString", () => {
    expect(Left.of(1).toString()).toBe("Left(1)");
    expect(Right.of(1).toString()).toBe("Right(1)");
});

test("equals", () => {
    expect(Left.of(1).equals(Left.of(1))).toBe(true);
    expect(Left.of(1).equals(Left.of(2))).toBe(false);
    expect(Left.of(1).equals(Right.of(1))).toBe(false);
    expect(Right.of(1).equals(Right.of(1))).toBe(true);
    expect(Right.of(1).equals(Right.of(2))).toBe(false);
    expect(Right.of(1).equals(Left.of(1))).toBe(false);
});

test("isEmpty", () => {
    expect(Left.of(null).isEmpty()).toBe(true);
    expect(Left.of(undefined).isEmpty()).toBe(true);
    expect(Left.of(1).isEmpty()).toBe(false);
    expect(Right.of(null).isEmpty()).toBe(true);
    expect(Right.of(undefined).isEmpty()).toBe(true);
    expect(Right.of(1).isEmpty()).toBe(false);
});
