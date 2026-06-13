import { HashMap } from "../HashMap/index.js";

const array2d = (n, m) => Array.from(Array(n), () => new Array(m));
const min = (...array) => array.reduce((e, v) => Math.min(e, v), Number.MAX_VALUE);

export function editDistance(word1, word2) {
    const n = word1.length;
    const m = word2.length;
    // distance matrix
    const ed = array2d(n + 1, m + 1); // include empty string
    for (let i = 0; i < n + 1; i++) ed[i][0] = i; // distance to empty string from word1
    for (let j = 0; j < m + 1; j++) ed[0][j] = j; // distance to empty string from word2
    for (let i = 1; i < n + 1; i++) {
        for (let j = 1; j < m + 1; j++) {
            const isCharEqual = word1[i - 1] === word2[j - 1];
            const deletion = ed[i - 1][j] + 1;
            const insert = ed[i][j - 1] + 1;
            const substitution = ed[i - 1][j - 1] + (isCharEqual ? 0 : 1);
            ed[i][j] = min(deletion, insert, substitution);
        }
    }
    return [ed[n][m], ed];
}

export function editDistanceRec(word1, word2) {
    const memo = new HashMap();
    function rec(i, j) {
        if (i === 0) return j;
        if (j === 0) return i;
        const key = `${i},${j}`;
        if (memo.has(key)) return memo.get(key).orElse(() => 0); // default value won't be used since we check has() first
        const isCharEqual = word1[word1.length - i] === word2[word2.length - j];
        const result = min(
            rec(i - 1, j) + 1, // deletion
            rec(i, j - 1) + 1, // insertion
            rec(i - 1, j - 1) + (isCharEqual ? 0 : 1) // substitution
        );
        memo.put(key, result);
        return result;
    }
    return rec(word1.length, word2.length);
}

export function alignWords2(s1, s2) {
    const memo = new HashMap();

    function align(s1, s2) {

        const key = `${s1.length},${s2.length}`;
    
        if (memo.has(key)) return memo.get(key).orElse(() => 0);
    
        if (s1.length === 0 && s2.length === 0) return { cost: 0, a1: [], a2: [] };
        if (s1.length === 0) return { cost: s2.length, a1: s2.map(_ => "_"), a2: s2 };
        if (s2.length === 0) return { cost: s1.length, a1: s1, a2: s1.map(_ => "_") };
    
        const [h1, ...t1] = s1;
        const [h2, ...t2] = s2;
    
        const resA = align(t1, t2);
        const costA = (h1 == h2 ? 0 : 1) + resA.cost;
    
        const resB = align(t1, s2);
        const costB = 1 + resB.cost;
    
        const resC = align(s1, t2);
        const costC = 1 + resC.cost;
    
        let best;
        const minCost = Math.min(costA, costB, costC);
    
        if (minCost === costA) {
            best = { cost: costA, a1: [h1, ...resA.a1], a2: [h2, ...resA.a2] };
        } else if (minCost === costB) {
            best = { cost: costB, a1: [h1, ...resB.a1], a2: ["_", ...resB.a2] };
        } else {
            best = { cost: costC, a1: ["_", ...resC.a1], a2: [h2, ...resC.a2] };
        }
    
        memo.put(key, best);
        return best;
    }
    return align(s1, s2);
}

export function alignWords(word1, word2) {
    const n = word1.length;
    const m = word2.length;
    const [, ed] = editDistance(word1, word2);
    let i = n;
    let j = m;
    let w1 = "";
    let w2 = "";
    while (i > 0 || j > 0) {
        const charEqualCost = word1[i - 1] === word2[j - 1] ? 0 : 1;
        if (i > 0 && j > 0 && ed[i][j] === ed[i - 1][j - 1] + charEqualCost) {
            // substitution or no-op
            w1 = word1[i - 1] + w1;
            w2 = word2[j - 1] + w2;
            i--;
            j--;
        } else if (i > 0 && ed[i][j] === ed[i - 1][j] + 1) {
            // deletion
            w1 = word1[i - 1] + w1;
            w2 = "-" + w2;
            i--;
        } else {
            // insertion
            w1 = "-" + w1;
            w2 = word2[j - 1] + w2;
            j--;
        }
    }
    return [w1, w2];
}