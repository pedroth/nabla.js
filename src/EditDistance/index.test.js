import { expect, test } from "bun:test";
import { editDistance, editDistanceRec, alignWords, alignWords2 } from "./index.js";

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

// alignWords vs alignWords2 — correctness

const PAIRS = [
    ["cat", "bat"],
    ["kitten", "sitting"],
    ["sunday", "saturday"],
    ["abc", "yabd"],
    ["", "hello"],
    ["hello", ""],
    ["abc", "abc"],
];

test("alignWords vs alignWords2: both produce cost matching editDistance", () => {
    for (const [a, b] of PAIRS) {
        const [expected] = editDistance(a, b);

        // alignWords cost = number of mismatches + gaps
        const [w1, w2] = alignWords(a, b);
        let cost1 = 0;
        for (let i = 0; i < w1.length; i++) {
            if (w1[i] === "-" || w2[i] === "-") cost1++;
            else if (w1[i] !== w2[i]) cost1++;
        }
        expect(cost1).toBe(expected);

        // alignWords2 cost is returned directly
        const { cost: cost2 } = alignWords2(a.split(""), b.split(""));
        expect(cost2).toBe(expected);
    }
});

test("alignWords vs alignWords2: aligned lengths match", () => {
    for (const [a, b] of PAIRS) {
        const [w1, w2] = alignWords(a, b);
        expect(w1.length).toBe(w2.length);

        const { a1, a2 } = alignWords2(a.split(""), b.split(""));
        expect(a1.length).toBe(a2.length);
    }
});

// alignWords vs alignWords2 — performance
test("alignWords vs alignWords2: performance on long strings", () => {
    const long1 = "abcdefghijklmnopqrstuvwxyz".repeat(4); // 104 chars
    const long2 = "zyxwvutsrqponmlkjihgfedcba".repeat(4);

    const t1 = performance.now();
    alignWords(long1, long2);
    const elapsed1 = performance.now() - t1;

    const t2 = performance.now();
    alignWords2(long1.split(""), long2.split(""));
    const elapsed2 = performance.now() - t2;

    console.log(`alignWords:  ${elapsed1.toFixed(2)}ms`);
    console.log(`alignWords2: ${elapsed2.toFixed(2)}ms`);

    // sanity: both must finish in reasonable time
    expect(elapsed1).toBeLessThan(5000);
    expect(elapsed2).toBeLessThan(5000);
});
