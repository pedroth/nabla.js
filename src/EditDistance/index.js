const array2d = (n, m) => Array.from(Array(n), () => new Array(m));
const min = (...array) => array.reduce((e, v) => Math.min(e, v), Number.MAX_VALUE);

function editDistanceAux(word1, word2) {
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

export function editDistance(word1, word2) {
    return editDistanceAux(word1, word2)[0];
}

export function alignWords(word1, word2) {
    const n = word1.length;
    const m = word2.length;
    const [, ed] = editDistanceAux(word1, word2);
    let i = n;
    let j = m;
    let w1 = [];
    let w2 = [];
    while (i > 0 || j > 0) {
        const charEqualCost = word1[i - 1] === word2[j - 1] ? 0 : 1;
        if (i > 0 && j > 0 && ed[i][j] === ed[i - 1][j - 1] + charEqualCost) {
            // substitution or no-op
            w1 = [word1[i - 1], ...w1];
            w2 = [word2[j - 1], ...w2];
            i--;
            j--;
        } else if (i > 0 && ed[i][j] === ed[i - 1][j] + 1) {
            // deletion
            w1 = [word1[i - 1], ...w1];
            w2 = ["-", ...w2];
            i--;
        } else {
            // insertion
            w1 = ["-", ...w1];
            w2 = [word2[j - 1], ...w2];
            j--;
        }
    }
    return [w1.join(""), w2.join("")];
}