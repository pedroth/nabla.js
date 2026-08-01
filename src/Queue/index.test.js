import { expect, test } from "bun:test";
import { Queue } from ".";

test("new queue is empty", () => {
    const q = new Queue();
    expect(q.isEmpty()).toBe(true);
    expect(q.size()).toBe(0);
});

test("enqueue increases size", () => {
    const q = new Queue();
    q.enqueue(1);
    expect(q.isEmpty()).toBe(false);
    expect(q.size()).toBe(1);
    q.enqueue(2);
    expect(q.size()).toBe(2);
});

test("dequeue returns elements in FIFO order", () => {
    const q = new Queue();
    q.enqueue("a");
    q.enqueue("b");
    q.enqueue("c");
    expect(q.dequeue().orElse()).toBe("a");
    expect(q.dequeue().orElse()).toBe("b");
    expect(q.dequeue().orElse()).toBe("c");
});

test("dequeue on empty queue returns None", () => {
    const q = new Queue();
    const result = q.dequeue();
    expect(result.orElse(() => "empty")).toBe("empty");
});

test("enqueue after full dequeue works", () => {
    const q = new Queue();
    q.enqueue(1);
    q.dequeue();
    expect(q.isEmpty()).toBe(true);
    q.enqueue(2);
    expect(q.size()).toBe(1);
    expect(q.dequeue().orElse()).toBe(2);
});

test("peek returns head without removing it", () => {
    const q = new Queue();
    expect(q.peek().orElse(() => "empty")).toBe("empty");
    q.enqueue(1);
    q.enqueue(2);
    expect(q.peek().orElse()).toBe(1);
    expect(q.size()).toBe(2);
});
