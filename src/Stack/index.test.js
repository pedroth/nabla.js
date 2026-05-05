import { expect, test } from "bun:test";
import { Stack } from "./index.js";

test("new Stack is empty", () => {
    const s = new Stack();
    expect(s.isEmpty()).toBe(true);
    expect(s.size()).toBe(0);
});

test("push adds elements", () => {
    const s = new Stack();
    s.push(1).push(2).push(3);
    expect(s.isEmpty()).toBe(false);
    expect(s.size()).toBe(3);
});

test("pop removes and returns the top element", () => {
    const s = new Stack();
    s.push(1).push(2).push(3);
    expect(s.pop().orElse(() => null)).toBe(3);
    expect(s.size()).toBe(2);
    expect(s.pop().orElse(() => null)).toBe(2);
    expect(s.pop().orElse(() => null)).toBe(1);
    expect(s.size()).toBe(0);
});

test("pop on empty stack returns none", () => {
    const s = new Stack();
    expect(s.pop().isSome()).toBe(false);
});

test("peek returns top element without removing it", () => {
    const s = new Stack();
    s.push(1).push(2).push(3);
    expect(s.peek().orElse(() => null)).toBe(3);
    expect(s.size()).toBe(3);
});

test("peek on empty stack returns none", () => {
    const s = new Stack();
    expect(s.peek().isSome()).toBe(false);
});

test("size reflects current element count", () => {
    const s = new Stack();
    expect(s.size()).toBe(0);
    s.push("a");
    expect(s.size()).toBe(1);
    s.push("b");
    expect(s.size()).toBe(2);
    s.pop();
    expect(s.size()).toBe(1);
});
