const ArrayUtils = {};

/**
 *  Test if linear arrays are equal
 * @param {*} a1
 * @param {*} a2
 */
ArrayUtils.arrayEquals = function (a1, a2) {
  if (!(a1 instanceof Array)) return false;
  if (!(a2 instanceof Array)) return false;
  if (a1.length != a2.length) return false;
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] !== a2[i]) return false;
  }
  return true;
};

/**
 * Return a new array permutation
 * @param {*} array
 * @param {*} permutation is an array with length <= array.length that has the new indexes
 */
ArrayUtils.permute = function (array, permutation) {
  const copy = array.slice();
  const len = Math.min(array.length, permutation.length);
  for (let i = 0; i < len; i++) {
    copy[permutation[i]] = array[i];
  }
  return copy;
};

/**
 * Fisher-Yates shuffle algorithm
 */
ArrayUtils.shuffle = function (array) {
  const ans = [...array];
  for (let i = array.length - 1; i > 0; i--) {
    // random number between 0 and i
    const r = Math.floor(Math.random() * (i + 1));
    //swap in place
    const temp = ans[i];
    ans[i] = ans[r];
    ans[r] = temp;
  }
  return ans;
};

/**
 * return swap array indexes
 */
ArrayUtils.swap = function (array, i, j) {
  const copy = [...array];
  const t = copy[i];
  copy[i] = copy[j];
  copy[j] = t;
  return copy;
};

ArrayUtils.findArrayDim = function (array) {
  if (array instanceof Array) {
    return ArrayUtils.findArrayDim(array[0]).concat([array.length]);
  }
  return [];
};

ArrayUtils.unpackArray = function (array) {
  if (!(array instanceof Array)) return [array];
  let joinIdentity = [];
  for (let i = 0; i < array.length; i++) {
    joinIdentity = joinIdentity.concat(ArrayUtils.unpackArray(array[i]));
  }
  return joinIdentity;
};

ArrayUtils.range = (min = 0) => (max, step = 1) => {
  const ans = [];
  if (min >= max) return ans;
  for (let i = min; i < max; i += step) ans.push(i);
  return ans;
};

ArrayUtils.range0 = ArrayUtils.range();

ArrayUtils.binaryOp = function (array1, array2, binaryOp) {
  const smaller =
    array1.length < array2.length ? array1.slice() : array2.slice();
  for (let i = 0; i < smaller.length; i++)
    smaller[i] = binaryOp(array1[i], array2[i]);
  return smaller;
};

/**
 *
 * @param {*} array
 * @param {*} groupFunction : function x => group class;
 *
 * Usage example:
 *
 * groupBy([1,2,3,4,5,6,7,8,9], x => x % 3) // {0: [3,6,9], 1:[1,4,7], 2:[2,5,8]}
 */
ArrayUtils.groupBy = (array, groupFunction) => {
  const ans = {};
  array.forEach(x => {
    const key = groupFunction(x);
    if (!ans[key]) ans[key] = [];
    ans[key].push(x);
  });
  return ans;
};

export default ArrayUtils;
