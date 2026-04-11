import { expect, test } from "bun:test";
import { Try, Success, Fail } from ".";

test("Try.success / Try.fail", () => {
    expect(Try.success(1).isSuccess()).toBe(true);
    expect(Try.fail("err").isSuccess()).toBe(false);
});

test("Success.map", () => {
    expect(Success.of(1).map(x => x + 1).orCatch()).toBe(2);
});

test("Fail.map is no-op", () => {
    const fail = Fail.of("err");
    expect(fail.map(x => x + 1)).toBe(fail);
});

test("Success.flatMap", () => {
    expect(
        Success.of(1)
            .flatMap(x => Success.of(x + 1))
            .orCatch()
    ).toBe(2);
    expect(
        Success.of(1)
            .flatMap(() => Fail.of("err"))
            .isSuccess()
    ).toBe(false);
});

test("Fail.flatMap is no-op", () => {
    const fail = Fail.of("err");
    expect(fail.flatMap(x => Success.of(x))).toBe(fail);
});

test("Success.failMap is no-op", () => {
    const success = Success.of(1);
    expect(success.failMap(() => Fail.of("other"))).toBe(success);
});

test("Fail.failMap", () => {
    expect(
        Fail.of("err").failMap(e => Success.of(e + "!")).orCatch()
    ).toBe("err!");
});

test("orCatch on Success returns value", () => {
    expect(Success.of(10).orCatch(() => 0)).toBe(10);
});

test("orCatch on Fail calls handler", () => {
    expect(Fail.of("err").orCatch(e => e + "!")).toBe("err!");
});
