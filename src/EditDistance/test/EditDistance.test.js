import EditDistance from "../main/EditDistance";

test("test edit distance", () => {
  expect(EditDistance.distance("distance", "distance")).toBe(0);
  expect(EditDistance.distance("book", "back")).toBe(2);
  expect(EditDistance.distance("batata", "banana")).toBe(2);
});
