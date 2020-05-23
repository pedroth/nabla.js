import StringDistance from "../main/StringDistance";

test("test edit distance", () => {
  expect(StringDistance.edit("distance", "distance")).toBe(0);
  expect(StringDistance.edit("book", "back")).toBe(2);
  expect(StringDistance.edit("batata", "banana")).toBe(2);
});

test("test lcs distance", () => {
  expect(StringDistance.longestCommonSub("distance", "distance")).toBe(0);
  expect(StringDistance.longestCommonSub("book", "back")).toBe(2);
  expect(StringDistance.longestCommonSub("batata", "banana")).toBe(2);
});
