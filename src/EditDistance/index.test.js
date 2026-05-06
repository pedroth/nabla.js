import { expect, test } from "bun:test";
import { editDistance, editDistanceRec, alignWords } from "./index.js";

// editDistance

test("editDistance: identical strings", () => {
    const [dist] = editDistance("hello", "hello");
    expect(dist).toBe(0);
});

test("editDistance: empty strings", () => {
    const [d1] = editDistance("", "abc");
    expect(d1).toBe(3);
    const [d2] = editDistance("abc", "");
    expect(d2).toBe(3);
    const [d3] = editDistance("", "");
    expect(d3).toBe(0);
});

test("editDistance: single substitution", () => {
    const [dist] = editDistance("cat", "bat");
    expect(dist).toBe(1);
});

test("editDistance: single insertion", () => {
    const [dist] = editDistance("car", "card");
    expect(dist).toBe(1);
});

test("editDistance: single deletion", () => {
    const [dist] = editDistance("card", "car");
    expect(dist).toBe(1);
});

test("editDistance: classic kitten/sitting", () => {
    const [dist] = editDistance("kitten", "sitting");
    expect(dist).toBe(3);
});

test("editDistance: returns matrix", () => {
    const [, matrix] = editDistance("ab", "abc");
    expect(matrix).toBeArray();
    expect(matrix.length).toBe(3); // n+1 rows
    expect(matrix[0].length).toBe(4); // m+1 cols
});

// editDistanceRec

test("editDistanceRec: identical strings", () => {
    expect(editDistanceRec("hello", "hello")).toBe(0);
});

test("editDistanceRec: empty strings", () => {
    expect(editDistanceRec("", "abc")).toBe(3);
    expect(editDistanceRec("abc", "")).toBe(3);
    expect(editDistanceRec("", "")).toBe(0);
});

test("editDistanceRec: single substitution", () => {
    expect(editDistanceRec("cat", "bat")).toBe(1);
});

test("editDistanceRec: single insertion", () => {
    expect(editDistanceRec("car", "card")).toBe(1);
});

test("editDistanceRec: single deletion", () => {
    expect(editDistanceRec("card", "car")).toBe(1);
});

test("editDistanceRec: matches dp result", () => {
    const pairs = [
        ["kitten", "sitting"],
        ["sunday", "saturday"],
        ["abc", "yabd"],
        ["", "x"],
    ];
    for (const [a, b] of pairs) {
        const [dp] = editDistance(a, b);
        expect(editDistanceRec(a, b)).toBe(dp);
    }
});

// alignWords

test("alignWords: identical strings", () => {
    const [w1, w2] = alignWords("abc", "abc");
    expect(w1).toBe("abc");
    expect(w2).toBe("abc");
    expect(w1.length).toBe(w2.length);
});

test("alignWords: one insertion", () => {
    const [w1, w2] = alignWords("car", "card");
    expect(w1.length).toBe(w2.length);
    expect(w1.replace(/-/g, "")).toBe("car");
    expect(w2.replace(/-/g, "")).toBe("card");
});

test("alignWords: one deletion", () => {
    const [w1, w2] = alignWords("card", "car");
    expect(w1.length).toBe(w2.length);
    expect(w1.replace(/-/g, "")).toBe("card");
    expect(w2.replace(/-/g, "")).toBe("car");
});

test("alignWords: output lengths match", () => {
    const [w1, w2] = alignWords("kitten", "sitting");
    expect(w1.length).toBe(w2.length);
});
