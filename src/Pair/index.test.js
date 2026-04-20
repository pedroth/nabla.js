import { expect, test } from "bun:test";
import { Pair } from './index.js';

test('Pair creation', () => {
  const pair = Pair.of(2, 3);
  expect(pair.left()).toBe(2);
  expect(pair.right()).toBe(3);
});

test('map', () => {
  const result = Pair.of(2, 3).map(x => x * x);
  expect(result.equals(Pair.of(4, 9))).toBe(true);
});

test('mapLeft', () => {
  const result = Pair.of(2, 3).mapLeft(x => x * 10);
  expect(result.equals(Pair.of(20, 3))).toBe(true);
});

test('mapRight', () => {
  const result = Pair.of(2, 3).mapRight(x => x * 10);
  expect(result.equals(Pair.of(2, 30))).toBe(true);
});

test('fold', () => {
  expect(Pair.of(2, 3).fold(0, (a, b) => a + b)).toBe(5);
  expect(Pair.of(undefined, undefined).fold(0, (a, b) => a + b)).toBe(0);
});

test('isEmpty', () => {
  expect(Pair.of(undefined, undefined).isEmpty()).toBe(true);
  expect(Pair.of(null, null).isEmpty()).toBe(true);
  expect(Pair.of(1, null).isEmpty()).toBe(false);
  expect(Pair.of(undefined, 2).isEmpty()).toBe(false);
  expect(Pair.of(1, 2).isEmpty()).toBe(false);
});

test('equals', () => {
  expect(Pair.of(1, 2).equals(Pair.of(1, 2))).toBe(true);
  expect(Pair.of(1, 2).equals(Pair.of(1, 3))).toBe(false);
  expect(Pair.of(1, 2).equals(Pair.of(2, 2))).toBe(false);
  expect(Pair.of(1, 2).equals("not a pair")).toBe(false);
});

test('toString', () => {
  expect(Pair.of(1, 2).toString()).toBe("(1, 2)");
  expect(Pair.of("a", "b").toString()).toBe("(a, b)");
});

test('toArray', () => {
  expect(Pair.of(1, 2).toArray()).toEqual([1, 2]);
});
