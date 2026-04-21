import { expect, test } from "bun:test";
import { PQueue } from ".";

test("new priority queue is empty", () => {
    const queue = new PQueue();
    expect(queue.size()).toBe(0);
    expect(queue.peek()).toBe(undefined);
    expect(queue.pop()).toBe(undefined);
});

test("push maintains min-heap ordering", () => {
    const queue = new PQueue();
    queue.push(4).push(1).push(3).push(2);

    expect(queue.size()).toBe(4);
    expect(queue.peek()).toBe(1);
});

test("pop returns items in ascending order by default", () => {
    const queue = new PQueue();
    queue.push(4).push(1).push(3).push(2);

    expect(queue.pop()).toBe(1);
    expect(queue.pop()).toBe(2);
    expect(queue.pop()).toBe(3);
    expect(queue.pop()).toBe(4);
    expect(queue.pop()).toBe(undefined);
});

test("custom comparator can create a max priority queue", () => {
    const queue = new PQueue((a, b) => b - a);
    queue.push(4).push(1).push(3).push(2);

    expect(queue.peek()).toBe(4);
    expect(queue.pop()).toBe(4);
    expect(queue.pop()).toBe(3);
    expect(queue.pop()).toBe(2);
    expect(queue.pop()).toBe(1);
});

test("ofArray builds a queue from an array", () => {
    const queue = PQueue.ofArray([5, 2, 4, 1, 3]);

    expect(queue.size()).toBe(5);
    expect(queue.pop()).toBe(1);
    expect(queue.pop()).toBe(2);
    expect(queue.pop()).toBe(3);
    expect(queue.pop()).toBe(4);
    expect(queue.pop()).toBe(5);
});