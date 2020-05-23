import EditDistance from "../main/EditDistance";

test("test edit distance", () => {
  const { distance, printDistanceMatrix } = EditDistance;
  const dist = (w1, w2) => distance(w1, w2, printDistanceMatrix);
  expect(dist("distance", "distance")).toBe(0);
  expect(dist("book", "back")).toBe(2);
  expect(dist("batata", "banana")).toBe(2);
  expect(dist("kitten", "sitting")).toBe(3);
});

test("test edit distance factory", () => {
  const { distanceFactory } = EditDistance;
  const distance = distanceFactory(3);
  expect(distance("distance", "distance")).toBe(0);
  expect(distance("book", "back")).toBe(4);
  expect(distance("batata", "banana")).toBe(4);
  expect(distance("kitten", "sitting")).toBe(5);
});
