import EditDistance from "../main/EditDistance";

test("test edit distance", () => {
  const { distance } = EditDistance;
  expect(distance("distance", "distance")).toBe(0);
  expect(distance("book", "back")).toBe(2);
  expect(distance("batata", "banana")).toBe(2);
});
