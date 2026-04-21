import { expect, test } from "bun:test";
import { Stream } from ".";

test("empty stream", () => {
    const s = new Stream();
    expect(s.isEmpty()).toBe(true);
    expect(s.tail().isEmpty()).toBe(true);
});

test("Stream.of", () => {
    expect(Stream.of(1, 2, 3).toArray()).toEqual([1, 2, 3]);
});

test("Stream.fromArray", () => {
    expect(Stream.fromArray([4, 5, 6]).toArray()).toEqual([4, 5, 6]);
    expect(Stream.fromArray([]).isEmpty()).toBe(true);
});

test("Stream.range with bounds", () => {
    expect(Stream.range(0, 5).toArray()).toEqual([0, 1, 2, 3, 4]);
    expect(Stream.range(3, 3).isEmpty()).toBe(true);
});

test("head and tail", () => {
    const s = Stream.of(10, 20, 30);
    expect(s.head()).toBe(10);
    expect(s.tail().head()).toBe(20);
    expect(s.tail().tail().head()).toBe(30);
});

test("map", () => {
    expect(
        Stream.range(1, 6).map(x => x * x).toArray()
    ).toEqual([1, 4, 9, 16, 25]);
    expect(new Stream().map(x => x + 1).isEmpty()).toBe(true);
});

test("filter", () => {
    // filter on infinite stream with take
    expect(
        Stream.range(0).filter(x => x % 2 === 0).take(5).toArray()
    ).toEqual([0, 2, 4, 6, 8]);
});

test("fold", () => {
    expect(Stream.range(1, 6).fold(0, (acc, x) => acc + x)).toBe(15);
    expect(new Stream().fold(42, (acc, x) => acc + x)).toBe(42);
});

test("take", () => {
    expect(Stream.range(0, 100).take(5).toArray()).toEqual([0, 1, 2, 3, 4]);
    expect(Stream.range(0).take(3).toArray()).toEqual([0, 1, 2]);
});

test("toArray", () => {
    expect(Stream.of(1, 2, 3).toArray()).toEqual([1, 2, 3]);
    expect(new Stream().toArray()).toEqual([]);
});

test("union", () => {
    const a = Stream.of(1, 2);
    const b = Stream.of(3, 4);
    expect(a.union(b).toArray()).toEqual([1, 2, 3, 4]);
    expect(new Stream().union(b).toArray()).toEqual([3, 4]);
});

test("flatMap", () => {
    expect(
        Stream.of(1, 2, 3)
            .flatMap(x => Stream.of(x, x * 10))
            .toArray()
    ).toEqual([1, 10, 2, 20, 3, 30]);
    expect(new Stream().flatMap(x => Stream.of(x)).isEmpty()).toBe(true);
});

test("zip", () => {
    expect(
        Stream.of("a", "b", "c")
            .zip(Stream.of(1, 2))
            .map(pair => pair.left() + pair.right())
            .toArray()
    ).toEqual(["a1", "b2"]);
});

test("equals", () => {
    expect(Stream.of(1, 2, 3).equals(Stream.of(1, 2, 3))).toBe(true);
    expect(Stream.of(1, 2, 3).equals(Stream.of(1, 2))).toBe(false);
    expect(Stream.of(1, 2, 3).equals(Stream.of(1, 2, 4))).toBe(false);
});

test("primes", () => {
    expect(Stream.primes().take(6).toArray()).toEqual([2, 3, 5, 7, 11, 13]);
});

test("map + filter + fold composition", () => {
    // use take to avoid filter exhausting a finite stream
    const result = Stream.range(1)
        .map(x => x * x)
        .filter(x => x % 2 !== 0)
        .take(3)
        .fold(0, (acc, x) => acc + x);
    expect(result).toBe(1 + 9 + 25);
});

test("prime twins", () => {
    const primes = Stream.primes();
    function isTwin(p1, p2) {
        return p2 - p1 === 2;
    }
    function primeTwins() {
        return primes.zip(primes.tail()).filter((pair) => isTwin(pair.left(), pair.right())).map(pair => [pair.left(), pair.right()]);
    }
    expect(primeTwins().take(6).toArray()).toEqual([
        [3, 5],
        [5, 7],
        [11, 13],
        [17, 19],
        [29, 31],
        [41, 43],
    ]);
});
