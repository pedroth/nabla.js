import List from "../main/List";

test("test creation", () => {
  const l1 = new List(1, new List(2, new List(3, new List())));
  const l2 = List.of(1, 2, 3);
  const l3 = List.fromArray([1, 2, 3]);
  expect(l1.toArray()).toStrictEqual([1, 2, 3]);
  expect(l2.toArray()).toStrictEqual([1, 2, 3]);
  expect(l3.toArray()).toStrictEqual([1, 2, 3]);
});
