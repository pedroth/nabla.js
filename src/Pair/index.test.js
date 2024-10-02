import { expect, test } from "bun:test";
import Pair from './index.js';

test("Pair operations", () => {
  test('map applies function to both elements', () => {
    const pair = new Pair(2, 3);
    const result = pair.map(x => x * 2);
    expect(result.left()).toBe(4);
    expect(result.right()).toBe(6);
  });

  test('fold applies function to both elements', () => {
    const pair = new Pair(2, 3);
    const result = pair.fold(0, (acc, x) => acc + x);
    expect(result).toBe(5);
  });

  test('filter keeps pair if both elements satisfy predicate', () => {
    const pair1 = new Pair(2, 4);
    const pair2 = new Pair(1, 3);
    expect(pair1.filter(x => x % 2 === 0).equals(pair1)).toBe(true);
    expect(pair2.filter(x => x % 2 === 0).isEmpty()).toBe(true);
  });

  test('isEmpty returns true for empty pair', () => {
    expect(new Pair().isEmpty()).toBe(true);
    expect(new Pair(1, null).isEmpty()).toBe(false);
    expect(new Pair(undefined, 2).isEmpty()).toBe(false);
    expect(new Pair(1, 2).isEmpty()).toBe(false);
  });

  test('left returns the first element', () => {
    const pair = new Pair('a', 'b');
    expect(pair.left()).toBe('a');
  });

  test('right returns the second element', () => {
    const pair = new Pair('a', 'b');
    expect(pair.right()).toBe('b');
  });

  test('zip combines two pairs', () => {
    const pair1 = new Pair(1, 2);
    const pair2 = new Pair(3, 4);
    const result = pair1.zip(pair2);
    expect(result.left().left()).toBe(1);
    expect(result.left().right()).toBe(3);
    expect(result.right().left()).toBe(2);
    expect(result.right().right()).toBe(4);
  });

  test('equals returns true for pairs with the same elements', () => {
    const pair1 = new Pair(1, 'a');
    const pair2 = new Pair(1, 'a');
    const pair3 = new Pair(2, 'b');

    expect(pair1.equals(pair2)).toBe(true);
    expect(pair1.equals(pair3)).toBe(false);
    expect(pair2.equals(pair3)).toBe(false);
  });

  test('equals returns false for pairs with different elements', () => {
    const pair1 = new Pair(1, 'a');
    const pair2 = new Pair('a', 1);
    const pair3 = new Pair(1, 'b');

    expect(pair1.equals(pair2)).toBe(false);
    expect(pair1.equals(pair3)).toBe(false);
    expect(pair2.equals(pair3)).toBe(false);
  });
});
