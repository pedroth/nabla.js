import { expect, test } from "bun:test";
import { List } from './index.js';

test("List operations", () => {
    const list = List.of(1, 2, 3);

    test("map applies function to all elements", () => {
        const result = list.map(x => x * 2);
        expect(result.toArray()).toEqual([2, 4, 6]);
    });

    test("fold reduces list to a single value", () => {
        const result = list.fold(0, (acc, x) => acc + x);
        expect(result).toBe(6);
    });

    test("filter keeps elements that satisfy predicate", () => {
        const result = list.filter(x => x % 2 !== 0);
        expect(result.toArray()).toEqual([1, 3]);
    });

    test("concat combines two lists", () => {
        const list2 = List.of(4, 5);
        const result = list.concat(list2);
        expect(result.toArray()).toEqual([1, 2, 3, 4, 5]);
    });

    test("push adds element to the end of the list", () => {
        const result = list.push(4);
        expect(result.toArray()).toEqual([1, 2, 3, 4]);
    });

    test("pop removes and returns the last element", () => {
        const newList = List.of(1, 2, 3);
        const popped = newList.pop();
        expect(popped).toBe(3);
        expect(newList.toArray()).toEqual([1, 2]);
    });

    test("isEmpty returns true for empty list", () => {
        expect(List.of().isEmpty()).toBe(true);
        expect(list.isEmpty()).toBe(false);
    });

    test("head returns the first element", () => {
        expect(list.head()).toBe(1);
    });

    test("tail returns the rest of the list", () => {
        expect(list.tail().toArray()).toEqual([2, 3]);
    });

    test("length returns the number of elements", () => {
        expect(list.length()).toBe(3);
    });

    test("toArray converts list to array", () => {
        expect(list.toArray()).toEqual([1, 2, 3]);
    });

    test("List.of creates a list from arguments", () => {
        const newList = List.of(1, 2, 3);
        expect(newList.toArray()).toEqual([1, 2, 3]);
    });

    test("equals compares two lists for equality", () => {
        const list1 = List.of(1, 2, 3);
        const list2 = List.of(1, 2, 3);
        const list3 = List.of(3, 2, 1);
        
        expect(list1.equals(list2)).toBe(true);
        expect(list1.equals(list3)).toBe(false);
        expect(list1.equals(List.of(1, 2))).toBe(false);
    });

    test("List.fromArray creates a list from an array", () => {
        const arr = [1, 2, 3];
        const newList = List.fromArray(arr);
        expect(newList.toArray()).toEqual(arr);
    });
});