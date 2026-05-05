import { expect, test } from "bun:test";
import { HashMap } from "./index.js";

test("new HashMap is empty", () => {
    const map = new HashMap();
    expect(map.isEmpty()).toBe(true);
    expect(map.size()).toBe(0);
});

test("put stores values by key", () => {
    const map = new HashMap();
    map.put("key1", "value1");
    map.put("key2", "value2");
    map.put("key3", "value3");
    expect(map.has("key1")).toBe(true);
    expect(map.get("key1").orElse(() => null)).toBe("value1");
    expect(map.get("key2").orElse(() => null)).toBe("value2");
    expect(map.get("key3").orElse(() => null)).toBe("value3");
});

test("del removes a stored key", () => {
    const map = new HashMap();
    map.put("key1", "value1");
    map.put("key2", "value2");
    map.del("key1");
    expect(map.has("key1")).toBe(false);
    expect(map.has("key2")).toBe(true);
});


test("size reflects the number of stored keys", () => {
    const map = new HashMap();
    expect(map.size()).toBe(0);
    map.put("key1", "value1");
    expect(map.size()).toBe(1);
    map.put("key2", "value2");
    expect(map.size()).toBe(2);
    map.del("key1");
    expect(map.size()).toBe(1);
});

test("performance with many keys", () => {
    const map = new HashMap();
    for (let i = 0; i < 1000; i++) {
        map.put(`key${i}`, `value${i}`);
    }
    for (let i = 0; i < 1000; i++) {
        expect(map.get(`key${i}`).orElse(() => null)).toBe(`value${i}`);
    }
});

test("handles collisions", () => {
    const hashFun = (s) => 0; // Force all keys to collide
    const map = new HashMap(hashFun);
    map.put("key1", "value1");
    map.put("key2", "value2");
    map.put("key3", "value3");
    expect(map.get("key1").orElse(() => null)).toBe("value1");
    expect(map.get("key2").orElse(() => null)).toBe("value2");
    expect(map.get("key3").orElse(() => null)).toBe("value3");
});

test("getEntries returns all key-value pairs", () => {
    const map = new HashMap();
    map.put("a", 1);
    map.put("b", 2);
    map.put("c", 3);
    const entries = map.getEntries();
    const plain = entries.toArray().map(p => [p.left(), p.right()]).sort((a, b) => a[0].localeCompare(b[0]));
    expect(plain).toEqual([["a", 1], ["b", 2], ["c", 3]]);
});

test("getEntries is empty for empty map", () => {
    const map = new HashMap();
    expect(map.getEntries().isEmpty()).toBe(true);
});