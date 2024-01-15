import Arrays from "../main/ArrayUtils";

test("array equality", () => {
  const a1 = [1, { a: 1 }, 3];
  const a2 = [1, { a: 2 }, 3];
  expect(Arrays.arrayEquals(a1, a2)).toBe(false);
  expect(Arrays.arrayEquals(a1, a1)).toBe(true);
});

test("array permute", () => {
  const a1 = [0, 1, 2, 3, 4, 5];
  const permuted = [1, 3, 4, 5, 0, 2];
  expect(Arrays.permute(a1, [4, 0, 5, 1, 2, 3])).toStrictEqual(permuted);
});

test("array swap", () => {
  const a1 = [0, 1, 2, 3, 4, 5];
  const swapped = [4, 1, 2, 3, 0, 5];
  expect(Arrays.swap(a1, 0, 4)).toStrictEqual(swapped);
});

test("find array dim", () => {
  const a1 = [
    [
      [1, 2, 3],
      [4, 5, 6]
    ],
    [
      [7, 8, 9],
      [10, 11, 12]
    ]
  ];
  expect(Arrays.findArrayDim(a1)).toStrictEqual([3, 2, 2]);
});

test("unpack js array", () => {
  const a1 = [
    [
      [1, 2, 3],
      [4, 5, 6]
    ],
    [
      [7, 8, 9],
      [10, 11, 12]
    ]
  ];
  const expected = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  expect(Arrays.unpackArray(a1)).toStrictEqual(expected);
});

test("array range", () => {
  expect(Arrays.range0(10, 2)).toStrictEqual([0, 2, 4, 6, 8]);
  expect(Arrays.range0(10)).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("array binary operation", () => {
  const v = Arrays.range0(10);
  const expected = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18];
  expect(Arrays.binaryOp(v, v, (x, y) => x + y)).toStrictEqual(expected);
});

test("group by", () => {
  const array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const dict = Arrays.groupBy(array, x => x % 3);
  expect(dict).toStrictEqual({ 0: [3, 6, 9], 1: [1, 4, 7], 2: [2, 5, 8] });
});
