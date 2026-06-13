import { expect, test } from "bun:test";
import { editDistance, alignWords } from "./index.js";

// editDistance

test("editDistance: identical strings", () => {
    expect(editDistance("hello", "hello")).toBe(0);
});

test("editDistance: empty strings", () => {
    expect(editDistance("", "abc")).toBe(3);
    expect(editDistance("abc", "")).toBe(3);
    expect(editDistance("", "")).toBe(0);
});

test("editDistance: single substitution", () => {
    expect(editDistance("cat", "bat")).toBe(1);
});

test("editDistance: single insertion", () => {
    expect(editDistance("car", "card")).toBe(1);
});

test("editDistance: single deletion", () => {
    expect(editDistance("card", "car")).toBe(1);
});

test("editDistance: classic kitten/sitting", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
});

// alignWords

const PAIRS = [
    ["cat", "bat"],
    ["kitten", "sitting"],
    ["sunday", "saturday"],
    ["abc", "yabd"],
    ["", "hello"],
    ["hello", ""],
    ["abc", "abc"],
];

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

test("alignWords: cost matches editDistance", () => {
    for (const [a, b] of PAIRS) {
        const expected = editDistance(a, b);
        const [w1, w2] = alignWords(a, b);
        let cost = 0;
        for (let i = 0; i < w1.length; i++) {
            if (w1[i] === "-" || w2[i] === "-") cost++;
            else if (w1[i] !== w2[i]) cost++;
        }
        expect(cost).toBe(expected);
    }
});

test("alignWords: aligned output lengths always match", () => {
    for (const [a, b] of PAIRS) {
        const [w1, w2] = alignWords(a, b);
        expect(w1.length).toBe(w2.length);
    }
});

test("alignWords: original characters are preserved", () => {
    for (const [a, b] of PAIRS) {
        const [w1, w2] = alignWords(a, b);
        expect(w1.replace(/-/g, "")).toBe(a);
        expect(w2.replace(/-/g, "")).toBe(b);
    }
});
