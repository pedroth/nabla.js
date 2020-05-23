const StringDistance = {};

StringDistance.edit = function (word1, word2) {
  // distance matrix
  const ed = [];
  const n = word1.length;
  const m = word2.length;
  const getIndex = (i, j) => i + (n + 1) * j;
  const getI = k => k % (n + 1);
  const getJ = k => Math.floor(k / (n + 1));
  const nplusmplus = (n + 1) * (m + 1);
  for (let k = 0; k < nplusmplus; k++) {
    const i = getI(k);
    const j = getJ(k);
    if (i == 0 && j == 0) ed[getIndex(i, j)] = 0;
    else if (i == 0) ed[getIndex(i, j)] = j;
    else if (j == 0) ed[getIndex(i, j)] = i;
    else if (word1[i - 1] === word2[j - 1])
      ed[getIndex(i, j)] = ed[getIndex(i - 1, j - 1)];
    else
      ed[getIndex(i, j)] =
        1 +
        Math.min(
          Math.min(ed[getIndex(i, j - 1)], ed[getIndex(i - 1, j)]),
          ed[getIndex(i - 1, j - 1)]
        );
  }
  return ed[nplusmplus - 1];
};

/**
 * Longest common subsequence distance
 */
StringDistance.longestCommonSub = function (word1, word2) {
  // distance matrix
  const ed = [];
  const n = word1.length;
  const m = word2.length;
  const getIndex = (i, j) => i + (n + 1) * j;
  const getI = k => k % (n + 1);
  const getJ = k => Math.floor(k / (n + 1));
  const nplusmplus = (n + 1) * (m + 1);
  for (let k = 0; k < nplusmplus; k++) {
    const i = getI(k);
    const j = getJ(k);
    if (i == 0 && j == 0) ed[getIndex(i, j)] = 0;
    else if (i == 0) ed[getIndex(i, j)] = 0;
    else if (j == 0) ed[getIndex(i, j)] = 0;
    else if (word1[i - 1] === word2[j - 1])
      ed[getIndex(i, j)] = ed[getIndex(i - 1, j - 1)];
    else
      ed[getIndex(i, j)] =
        1 +
        Math.min(
          Math.min(ed[getIndex(i, j - 1)], ed[getIndex(i - 1, j)]),
          ed[getIndex(i - 1, j - 1)]
        );
  }
  return ed[nplusmplus - 1];
};

export default StringDistance;
