const EditDistance = {};

EditDistance.distanceFactory = (subsCost = 1, delCost = 1, addCost = 1) => (
  word1,
  word2,
  printDistance = matrix => {}
) => {
  // distance matrix
  const n = word1.length;
  const m = word2.length;
  const ed = array2d(n + 1, m + 1);
  for (let i = 0; i < n + 1; i++) ed[i][0] = i * delCost;
  for (let j = 0; j < m + 1; j++) ed[0][j] = j * addCost;
  for (let i = 1; i < n + 1; i++) {
    for (let j = 1; j < m + 1; j++) {
      const isCharEqual = word1[i - 1] === word2[j - 1];
      const deletion = ed[i - 1][j] + delCost;
      const insert = ed[i][j - 1] + addCost;
      const substitution = ed[i - 1][j - 1] + (isCharEqual ? 0 : subsCost);
      ed[i][j] = min(deletion, insert, substitution);
    }
  }
  printDistance(ed, word1, word2);
  return ed[n][m];
};

EditDistance.distance = EditDistance.distanceFactory();

EditDistance.printDistanceMatrix = (ed, word1, word2) => {
  let stringBuffer = [];
  ed.forEach((r, i) => {
    let buffer = [];
    r.forEach((v, j) => buffer.push(`${v}`));
    stringBuffer.push(buffer.join(" "));
  });
  console.log(`w1: ${word1}, w2: ${word2}\n`, stringBuffer.join("\n"));
};
const array2d = (n, m) => Array.from(Array(n), () => new Array(m));
const min = (...array) =>
  array.reduce((e, v) => Math.min(e, v), Number.MAX_VALUE);

export default EditDistance;
