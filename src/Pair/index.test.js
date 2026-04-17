import { expect, test } from "bun:test";
import { Pair } from './index.js';

test('Pair creation', () => {
  const pair = new Pair(2, 3);
  expect(pair.toArray()).toEqual([2, 3]);
  expect(pair.left()).toBe(2);
  expect(pair.right()).toBe(3);
});

test('Pair.of', () => {
  const pair = Pair.of(10, 20);
  expect(pair.left()).toBe(10);
  expect(pair.right()).toBe(20);
});

test('Pair map', () => {
  const pair = new Pair(2, 3);
  const result = pair.map(x => x * x);
  expect(result.equals(Pair.of(4, 9))).toBe(true);
});

test('Pair mapLeft', () => {
  const result = Pair.of(2, 3).mapLeft(x => x * 10);
  expect(result.equals(Pair.of(20, 3))).toBe(true);
});

test('Pair mapRight', () => {
  const result = Pair.of(2, 3).mapRight(x => x * 10);
  expect(result.equals(Pair.of(2, 30))).toBe(true);
});

test('Pair fold', () => {
  const pair = new Pair(2, 3);
  const result = pair.fold((a, b) => a + b);
  expect(result).toBe(5);
});

test('isEmpty', () => {
  expect(new Pair().isEmpty()).toBe(true);
  expect(new Pair(1, null).isEmpty()).toBe(false);
  expect(new Pair(undefined, 2).isEmpty()).toBe(false);
  expect(new Pair(1, 2).isEmpty()).toBe(false);
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
