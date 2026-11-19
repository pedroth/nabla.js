import { expect, spyOn, test } from "bun:test";
import { HKmeans } from "./index.js";
import { NMath } from "../NMath/index.js";
import { HKmeans as publicHKmeans } from "../index.js";

test("builds LODs bottom-up and computes the root from all points", () => {
    const data = [NMath.vec(0), NMath.vec(5.1), NMath.vec(14.9)];
    const random = spyOn(Math, "random")
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.5);
    try {
        const model = HKmeans.new(data, { rho: 0.75 }).fit();
        const levels = model.getLevels();
        expect(publicHKmeans).toBe(HKmeans);
        expect(levels.slice(0, 2).map(level => level.map(point => point.toArray()))).toEqual([
            [[0], [5.1], [14.9]], [[0], [10]]
        ]);
        expect(levels[2][0].components[0]).toBeCloseTo(20 / 3);
        expect(levels[2][0].type).toBe("vector");
        levels[0][0].components[0] = 100;
        expect(model.getLevels()[0][0].toArray()).toEqual([0]);
        expect(model.findNN(NMath.vec(4.9))).toBe(data[1]);
        expect(model.findKnn(NMath.vec(4.9), 3)).toEqual([data[1], data[0], data[2]]);
    } finally {
        random.mockRestore();
    }
});

test("exact nearest neighbors match brute force across levels, duplicates and ties", () => {
    const data = Array.from({ length: 60 }, (_, i) => NMath.vec(
        (i * 17 % 31) - 15,
        (i * 11 % 19) - 9
    ));
    data.push(NMath.vec.fromArray(data[0].toArray()), NMath.vec(0, 0), NMath.vec(0, 0));
    const queries = [[0, 0], [1.5, -2.25], [-50, 20], [100, 100], data[0].toArray()];

    for (const rho of [0.25, 0.5, 0.8]) {
        const model = HKmeans.new(data, { rho }).fit();
        for (const query of queries) {
            const expected = data.map((point, index) => ({
                point, index, distance: Math.hypot(
                    point.components[0] - query[0], point.components[1] - query[1]
                )
            })).sort((a, b) => a.distance - b.distance || a.index - b.index);
            for (const k of [1, 2, 8, data.length, data.length + 3]) {
                expect(model.findKnn(query, k)).toEqual(expected.slice(0, k).map(entry => entry.point));
            }
            expect(model.findNN(query)).toBe(expected[0].point);
        }
    }
});

test("handles single points, identical points, vector inputs and zero neighbors", () => {
    const vector = NMath.vec(3, 4);
    const single = HKmeans.new([vector]).fit();
    expect(single.getLevels()[0][0].toArray()).toEqual([3, 4]);
    expect(single.findNN(new Float64Array([0, 0]))).toBe(vector);
    expect(single.findKnn([0, 0], 0)).toEqual([]);
    expect(single.udf([0, 0], 5)).toBe(5);

    const data = [NMath.vec(1), NMath.vec(1), NMath.vec(1), NMath.vec(1)];
    const identical = HKmeans.new(data, { rho: 0.75 }).fit();
    expect(identical.getLevels()).toHaveLength(2);
    const neighbors = identical.findKnn([2], 3);
    expect(neighbors).toHaveLength(3);
    neighbors.forEach((point, index) => expect(point).toBe(data[index]));
});

test("folds nearest distances with union and smooth union", () => {
    const model = HKmeans.new([NMath.vec(0), NMath.vec(2), NMath.vec(6)]).fit();
    expect(HKmeans.CombinationFn.UNION).toBe(Math.min);
    expect(model.udf([1], 3)).toBe(1);
    expect(model.udf([1], 3, (a, b) => a + b)).toBe(7);
    const smooth = HKmeans.CombinationFn.SMOOTH_UNION;
    expect(model.udf([1], 2, smooth)).toBeCloseTo(1 - Math.log(2) / 32);
    expect(smooth(2, 3, 4)).toBeCloseTo(-Math.log(Math.exp(-8) + Math.exp(-12)) / 4);
    expect(smooth(1000, 1000)).toBeCloseTo(1000 - Math.log(2) / 32);
    expect(() => smooth(1, 2, 0)).toThrow();
});

test("validates data, options, queries and folds", () => {
    expect(() => HKmeans.new([])).toThrow();
    expect(() => HKmeans.new([[1]])).toThrow("NMath vectors");
    expect(() => HKmeans.new([new Float64Array([1])])).toThrow("NMath vectors");
    expect(() => HKmeans.new([NMath.vec(1), NMath.vec(1, 2)])).toThrow();
    expect(() => HKmeans.new([NMath.vec(NaN)])).toThrow();
    expect(() => HKmeans.new([NMath.vec(1)], { rho: 1 })).toThrow();
    expect(() => HKmeans.new([NMath.vec(1)], { rho: 0 })).toThrow();
    expect(() => HKmeans.new([NMath.vec(1)], { kmeansIter: -1 })).toThrow();
    const model = HKmeans.new([NMath.vec(1)]);
    expect(() => model.findNN([1])).toThrow("fit");
    expect(() => model.getLevels()).toThrow("fit");
    model.fit();
    expect(() => model.findKnn([1, 2], 1)).toThrow();
    expect(() => model.findKnn([1], -1)).toThrow();
    expect(() => model.udf([1], 0)).toThrow();
    expect(() => model.udf([1], 1, null)).toThrow();
});
