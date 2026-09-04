import { expect, test } from "bun:test";
import { Tree } from "./index.js";

test("new tree is empty", () => {
	const tree = new Tree();

	expect(tree.isEmpty()).toBe(true);
	expect(tree.size()).toBe(0);
	expect(tree.has(1)).toBe(false);
});

test("put stores values and tracks distinct keys", () => {
	const tree = new Tree((a, b) => a - b, () => 1);

	tree.put(2, "two").put(1, "one").put(3, "three");

	expect(tree.isEmpty()).toBe(false);
	expect(tree.size()).toBe(3);
	expect(tree.root.size).toBe(3);
	expect(tree.get(1).orElse(() => "missing")).toBe("one");
	expect(tree.get(2).orElse(() => "missing")).toBe("two");
	expect(tree.get(3).orElse(() => "missing")).toBe("three");
});

test("get returns None and has returns false for an absent key", () => {
	const tree = new Tree((a, b) => a - b, () => 1);
	tree.put(1, "one");

	expect(tree.has(2)).toBe(false);
	expect(tree.get(2).orElse(() => "missing")).toBe("missing");
});

test("put replaces the value for an existing key without increasing size", () => {
	const tree = new Tree((a, b) => a - b, () => 0);

	tree.put(2, "before").put(1, "one").put(2, "after");

	expect(tree.root.size).toBe(2);
	expect(tree.size()).toBe(2);
	expect(tree.get(2).orElse(() => "missing")).toBe("after");
});

test("a successful coin flip promotes the inserted key and splits the tree", () => {
	const tree = new Tree((a, b) => a - b, () => 0);

	tree.put(2, "two").put(1, "one").put(3, "three");

	expect(tree.root.key).toBe(3);
	expect(tree.root.size).toBe(3);
	expect(tree.has(1)).toBe(true);
	expect(tree.has(2)).toBe(true);
	expect(tree.has(3)).toBe(true);
});

test("Tree uses its comparison function for nonnumeric keys", () => {
	const tree = new Tree((left, right) => left.localeCompare(right), () => 1);

	tree.put("beta", 2).put("alpha", 1).put("gamma", 3);

	expect(tree.size()).toBe(3);
	expect(tree.has("alpha")).toBe(true);
	expect(tree.get("gamma").orElse(() => -1)).toBe(3);
});

test("getEntries returns key-value pairs in sorted key order", () => {
	const tree = new Tree((a, b) => a - b, () => 1);

	tree.put(2, "two").put(1, "one").put(3, "three");

	expect(tree.getEntries().toArray().map(pair => pair.toArray()))
		.toEqual([[1, "one"], [2, "two"], [3, "three"]]);
});


