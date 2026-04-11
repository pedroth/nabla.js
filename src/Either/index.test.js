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

test("mapLeft", () => {
    expect(Left.of(1).mapLeft(x => x + 1).orLeft()).toBe(2);
    expect(Right.of(1).mapLeft(x => x + 1).orRight()).toBe(1);
});

test("mapRight", () => {
    expect(Right.of(1).mapRight(x => x + 1).orRight()).toBe(2);
    expect(Left.of(1).mapRight(x => x + 1).orLeft()).toBe(1);
});

test("flatMapLeft", () => {
    expect(Left.of(1).flatMapLeft(x => Left.of(x + 1)).orLeft()).toBe(2);
    expect(Right.of(1).flatMapLeft(x => Left.of(x + 1)).orRight()).toBe(1);
});

test("flatMapRight", () => {
    expect(Right.of(1).flatMapRight(x => Right.of(x + 1)).orRight()).toBe(2);
    expect(Left.of(1).flatMapRight(x => Right.of(x + 1)).orLeft()).toBe(1);
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
