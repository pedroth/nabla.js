import { expect, test } from "bun:test";
import { Try } from ".";

test("Try.success / Try.fail", () => {
    expect(Try.success(1).isSuccess()).toBe(true);
    expect(Try.fail("err").isSuccess()).toBe(false);
});

test("Try.success.map", () => {
    expect(Try.success(1).map(x => x + 1).orCatch()).toBe(2);
});

test("Try.fail.map is no-op", () => {
    const fail = Try.fail("err");
    expect(fail.map(x => x + 1)).toBe(fail);
});

test("Try.success.flatMap", () => {
    expect(
        Try.success(1)
            .flatMap(x => Try.success(x + 1))
            .orCatch()
    ).toBe(2);
    expect(
        Try.success(1)
            .flatMap(() => Try.fail("err"))
            .isSuccess()
    ).toBe(false);
});

test("Try.fail.flatMap is no-op", () => {
    const fail = Try.fail("err");
    expect(fail.flatMap(x => Try.success(x))).toBe(fail);
});

test("Try.success.failMap is no-op", () => {
    const success = Try.success(1);
    expect(success.failMap(() => Try.fail("other"))).toBe(success);
});

test("Try.fail.failMap", () => {
    expect(
        Try.fail("err").failMap(e => Try.success(e + "!")).orCatch()
    ).toBe("err!");
});

test("orCatch on Try.success returns value", () => {
    expect(Try.success(10).orCatch(() => 0)).toBe(10);
});

test("orCatch on Try.fail calls handler", () => {
    expect(Try.fail("err").orCatch(e => e + "!")).toBe("err!");
});
