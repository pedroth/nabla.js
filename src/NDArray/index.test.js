import {NDArray} from "./index.js";
import { expect, test } from "bun:test";


test("test getter", () => {
  const denseNDArray = new NDArray([3, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(denseNDArray.get([0, 0])).toBe(1);
  expect(denseNDArray.get([1, 2])).toBe(6);
  expect(denseNDArray.get([0, 2])).toBe(3);
  expect(denseNDArray.get([2, 1])).toBe(8);
  expect(denseNDArray.get([1, 1])).toBe(5);

  const denseNDArray1 = NDArray.of(denseNDArray, [9, 1]);
  expect(denseNDArray1.get([0, 0])).toBe(1);
  expect(denseNDArray1.get([4, 0])).toBe(5);
  expect(denseNDArray1.get([8, 0])).toBe(9);

  const denseNDArray2 = NDArray.of(denseNDArray, [9]);
  expect(denseNDArray2.get([0])).toBe(1);
  expect(denseNDArray2.get([4])).toBe(5);
  expect(denseNDArray2.get([8])).toBe(9);

  expect(denseNDArray.get("1,2")).toBe(6.0);
  expect(denseNDArray.get("1,1")).toBe(5.0);

  expect(NDArray.of([[1, 2], [3, 4], [5, 6]]).get([0, 1])).toBe(2);
  expect(NDArray.of([[1, 2], [3, 4], [5, 6]]).get([2, 1])).toBe(6);
  expect(
    NDArray.of([
      [[1, 2], [3, 4], [5, 6]],
      [[7, 8], [9, 10], [11, 12]],
      [[13, 14], [15, 16], [17, 18]]
    ]).get([2, 2, 1])
  ).toBe(18);
  expect(
    NDArray.of([
      [[1, 2], [3, 4], [5, 6]],
      [[7, 8], [9, 10], [11, 12]],
      [[13, 14], [15, 16], [17, 18]]
    ]).get("1,1,1")
  ).toBe(10);
  expect(
    NDArray.of([
      [[1, 2], [3, 4], [5, 6]],
      [[7, 8], [9, 10], [11, 12]],
      [[13, 14], [15, 16], [17, 18]]
    ]).get("0,1,0")
  ).toBe(3);
});

test("test setter", () => {
  const table = new NDArray([3, 3, 3]);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        table.set([i, j, k], i + 3 * j + 9 * k);
      }
    }
  }
  console.log(`table : ${table.toString()}`);

  expect(table.get("1,:,:").get([0, 0])).toBe(1);
  expect(table.get("1,:,:").get([1, 1])).toBe(13);
  expect(table.get("1,:,:").get([2, 2])).toBe(25);
  expect(table.get("1,:,:").get([2, 1])).toBe(16);

  const secondTable = table.get("0 : 1, 1 : 2, : ");
  console.log(`secondTable : ${secondTable.toString()}`);

  expect(secondTable.get([1, 1, 0])).toBe(7);
  expect(secondTable.get([1, 1, 1])).toBe(16);
  expect(secondTable.get([1, 1, 2])).toBe(25);

  const thirdTable = new NDArray([3, 3]);
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3; i++) {
      thirdTable.set([i, j], 100);
    }
  }

  table.set("1,:,:", thirdTable);

  expect(table.get([1, 0, 0])).toBe(100);
  expect(table.get([1, 1, 1])).toBe(100);
  expect(table.get([1, 1, 2])).toBe(100);
  expect(table.get([1, 2, 2])).toBe(100);
  expect(table.get([0, 2, 2])).toBe(24);

  const denseNDArray = table.get("1:,0:,:1");

  console.log(table.toArray());
  console.log(table.toString());

  expect(denseNDArray.dim[0]).toBe(2);
  expect(denseNDArray.dim[1]).toBe(3);
  expect(denseNDArray.dim[2]).toBe(2);
  expect(denseNDArray.get([0, 0, 1])).toBe(100);
  expect(denseNDArray.get([1, 1, 0])).toBe(5);
  expect(denseNDArray.get([1, 2, 1])).toBe(17);
});

test("test dense creation", () => {
  const d1 = new NDArray([3, 2], [1, 2, 3, 4, 5, 6]);
  const d2 = NDArray.of([[1, 2], [3, 4], [5, 6]]);
  expect(d1.equals(d2)).toBe(true);
  expect(d1.equals(NDArray.of(d1.toArray()))).toBe(true);
});

test("test map array", () => {
  const array = new NDArray([3, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const arraySq = new NDArray([3, 3], [1, 4, 9, 16, 25, 36, 49, 64, 81]);
  expect(array.map(x => x * x).equals(arraySq)).toBe(true);
});

test("test fold", () => {
  const n = 10;
  const sum = (n * (n - 1)) / 2.0;
  const array = new NDArray([3, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(array.fold(0.0, (x, y) => x + y)).toBe(sum);
});

test("test for each", () => {
  const n = 10;
  const sum = (n * (n - 1)) / 2.0;
  const array = new NDArray([3, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  let acc = 0;
  array.forEach(x => (acc += x));
  expect(acc).toBe(sum);
});

test("test reshape", () => {
  const dense = NDArray.of([[1, 2, 3], [4, 5, 6]]);
  const denseReshape = NDArray.of([[1, 2], [3, 4], [5, 6]]);
  expect(dense.reshape([3, 2]).equals(denseReshape)).toBe(true);
});

test("test broadcast", () => {
  const mult = (x, y) => x * y;
  let dense = NDArray.of([
    [[1, 2], [3, 4]],
    [[5, 6], [7, 8]],
    [[9, 10], [11, 12]]
  ]);
  let out = dense.binaryOp(NDArray.of([1, 2, 3]).reshape([3, 1, 1]), mult);

  let denseExpected = NDArray.of([
    [[1, 2], [3, 4]],
    [[10, 12], [14, 16]],
    [[27, 30], [33, 36]]
  ]);

  expect(out.shape()).toStrictEqual([3, 2, 2]);
  expect(denseExpected.equals(out)).toBe(true);

  dense = NDArray.of([1, 1, 1]);
  out = dense.binaryOp(NDArray.of([1, 2, 3], [3, 1]), mult);
  denseExpected = NDArray.of([[1, 1, 1], [2, 2, 2], [3, 3, 3]]);
  expect(out.equals(denseExpected)).toBe(true);

  out = dense.binaryOp(1, (x, y) => x + y);
  expect(out.equals(NDArray.of([2, 2, 2]))).toBe(true);
});

test("test map with index", () => {
  const array = new NDArray([3, 3], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const arrayExpected = new NDArray(
    [3, 3],
    [0, 0, 0, 0, 5, 12, 0, 16, 36]
  );
  expect(
    array
      .mapWithIndex((x, index) => x * index.reduce((x, y) => x * y, 1))
      .equals(arrayExpected)
  ).toBe(true);
  array.transformWithIndex((x, index) => x * index.reduce((x, y) => x * y, 1));
  expect(array.equals(arrayExpected)).toBe(true);
});

test("test index out of bound", () => {
  try {
    NDArray.of([1, 2, 3]).get(3);
    expect(false).toBe(true);
  } catch (e) {
    expect(true).toBe(true);
  }
});

test("test get low index size", () => {
  expect(NDArray.of([[1, 2], [3, 4]]).get(1)).toBe(3);
});

test("test zip: 1d arrays", () => {
  const a = NDArray.of([1, 2, 3]);
  const b = NDArray.of([4, 5, 6]);
  const zipped = a.zip(b);
  expect(zipped.shape()).toStrictEqual([3]);
  expect(zipped.get([0]).left()).toBe(1);
  expect(zipped.get([0]).right()).toBe(4);
  expect(zipped.get([1]).left()).toBe(2);
  expect(zipped.get([1]).right()).toBe(5);
  expect(zipped.get([2]).left()).toBe(3);
  expect(zipped.get([2]).right()).toBe(6);
});

test("test zip: 2d arrays", () => {
  const a = NDArray.of([[1, 2], [3, 4]]);
  const b = NDArray.of([[5, 6], [7, 8]]);
  const zipped = a.zip(b);
  expect(zipped.shape()).toStrictEqual([2, 2]);
  expect(zipped.get([0, 0]).left()).toBe(1);
  expect(zipped.get([0, 0]).right()).toBe(5);
  expect(zipped.get([1, 1]).left()).toBe(4);
  expect(zipped.get([1, 1]).right()).toBe(8);
});

test("test zip: throws on shape mismatch", () => {
  expect(() => NDArray.of([1, 2]).zip(NDArray.of([1, 2, 3]))).toThrow();
});

test("test zip: throws on dimension mismatch", () => {
  expect(() => NDArray.of([1, 2]).zip(NDArray.of([[1, 2], [3, 4]]))).toThrow();
});

test("test prod: identity matrix", () => {
  const I = NDArray.of([[1, 0], [0, 1]]);
  const A = NDArray.of([[1, 2], [3, 4]]);
  expect(I.prod(A).equals(A)).toBe(true);
  expect(A.prod(I).equals(A)).toBe(true);
});

test("test prod: 2x2 matrix multiplication", () => {
  const A = NDArray.of([[1, 2], [3, 4]]);
  const B = NDArray.of([[5, 6], [7, 8]]);
  const C = A.prod(B);
  expect(C.shape()).toStrictEqual([2, 2]);
  // C[i,j] = sum_l A[i,l] * B[l,j]
  expect(C.get([0, 0])).toBe(19); // 1*5 + 2*7
  expect(C.get([1, 0])).toBe(43); // 3*5 + 4*7
  expect(C.get([0, 1])).toBe(22); // 1*6 + 2*8
  expect(C.get([1, 1])).toBe(50); // 3*6 + 4*8
});

test("test prod: non-square matrices [3,2] x [2,3]", () => {
  const A = NDArray.of([[1, 2], [3, 4], [5, 6]]); // dim [3,2]
  const B = NDArray.of([[1, 2, 3], [4, 5, 6]]);   // dim [2,3]
  const C = A.prod(B);
  expect(C.shape()).toStrictEqual([3, 3]);
  expect(C.get([0, 0])).toBe(9); // 1*1 + 2*4
  expect(C.get([0, 1])).toBe(12); // 1*2 + 2*5
  expect(C.get([0, 2])).toBe(15); // 1*3 + 2*6
  expect(C.get([1, 0])).toBe(19); // 3*1 + 4*4
  expect(C.get([1, 1])).toBe(26); // 3*2 + 4*5
  expect(C.get([1, 2])).toBe(33); // 3*3 + 4*6
  expect(C.get([2, 0])).toBe(29); // 5*1 + 6*4
  expect(C.get([2, 1])).toBe(40); // 5*2 + 6*5
  expect(C.get([2, 2])).toBe(51); // 5*3 + 6*6
});

test("test prod: dot product (1D)", () => {
  const a = NDArray.of([1, 2, 3]);
  const b = NDArray.of([4, 5, 6]);
  expect(a.prod(b)).toBe(32); // 1*4 + 2*5 + 3*6
});

test("test prod: custom binary operator", () => {
  const A = NDArray.of([[1, 0], [0, 1]]);
  const B = NDArray.of([[2, 3], [4, 5]]);
  // row-major: B[0,0]=2, B[0,1]=3, B[1,0]=4, B[1,1]=5
  // C[i,j] = sum_l max(A[i,l], B[l,j])
  const C = A.prod(B, 0, (e, x, y) => e + Math.max(x, y));
  expect(C.shape()).toStrictEqual([2, 2]);
  expect(C.get([0, 0])).toBe(Math.max(1, 2) + Math.max(0, 4)); // max(A[0,0],B[0,0])+max(A[0,1],B[1,0]) = 2+4
  expect(C.get([1, 1])).toBe(Math.max(0, 3) + Math.max(1, 5)); // max(A[1,0],B[0,1])+max(A[1,1],B[1,1]) = 3+5
});

test("test prod: 3x3x3 tensor times 3 vector", () => {
  // T[i,j,l] = i+j+l+1 — stored row-major: outermost axis = i, middle = j, innermost = l
  const T = NDArray.of([
    [[1, 2, 3], [2, 3, 4], [3, 4, 5]],  // i=0
    [[2, 3, 4], [3, 4, 5], [4, 5, 6]],  // i=1
    [[3, 4, 5], [4, 5, 6], [5, 6, 7]],  // i=2
  ]);
  // V[l] = l+1
  const V = NDArray.of([1, 2, 3]);
  expect(T.shape()).toStrictEqual([3, 3, 3]);
  expect(V.shape()).toStrictEqual([3]);

  const C = T.prod(V);
  // outDim = [3,3]
  // C[i,j] = sum_l T[i,j,l]*(l+1) = sum_l (i+j+l+1)*(l+1)
  //        = 6*(i+j) + 14
  expect(C.shape()).toStrictEqual([3, 3]);
  expect(C.get([0, 0])).toBe(14);   // 6*0 + 14
  expect(C.get([1, 0])).toBe(20);   // 6*1 + 14
  expect(C.get([0, 1])).toBe(20);   // 6*1 + 14
  expect(C.get([2, 2])).toBe(38);   // 6*4 + 14
});

test("test prod: throws on incompatible shapes", () => {
  expect(() => NDArray.of([1, 2]).prod(NDArray.of([1, 2, 3]))).toThrow();
});
