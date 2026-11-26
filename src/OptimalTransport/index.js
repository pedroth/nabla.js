import { NMath } from "../NMath/index.js";

const { vec, mat } = NMath;

//========================================================================================
/*                                                                                      *
 *                                   Optimal Transport                                  *
 *                                                                                      */
//========================================================================================

const OptimalTransport = {};

/**
 * Entropic optimal transport (Sinkhorn) between two weighted point clouds.
 * source, target: { points: Array<vec | number[]>, weights?: number[] }
 *   weights must be non-negative and sum to 1; they default to uniform.
 * options:
 *   entropy: regularization, relative to the largest squared distance (scale free), default 0.01
 *   maxIterations, tolerance: Sinkhorn stopping criteria on the source marginal error (L1)
 *   values: payload carried by the target points (default: target.points). It allows computing
 *           the plan in one space (e.g. PCA latent) and moving points in another (e.g. pixels).
 */
OptimalTransport.new = function (source, target, options = {}) {
    const { entropy = 0.01, maxIterations = 500, tolerance = 1e-6 } = options;
    if (!(entropy > 0)) throw new Error("entropy must be positive");
    const from = toPoints(source.points, "source");
    const to = toPoints(target.points, "target");
    const n = from.length;
    const m = to.length;
    if (from[0].dim !== to[0].dim) throw new Error("source and target points must have the same dimension");
    const a = toWeights(source.weights, n, "source");
    const b = toWeights(target.weights, m, "target");
    const defaultValues = options.values ? toPoints(options.values, "values") : to;
    if (defaultValues.length !== m) throw new Error("values must have one entry per target point");

    const ans = { plan: undefined, iterations: 0 };

    // Squared Euclidean cost |x_i - y_j|^2 = |x_i|^2 + |y_j|^2 - 2 x_i . y_j
    const squaredCost = () => {
        const cross = mat.ofVectors(from).dot(mat.ofVectors(to));
        const sx = from.map(p => p.squareLength());
        const sy = to.map(p => p.squareLength());
        return mat(
            cross.data.map((c, k) => Math.max(0, sx[Math.floor(k / m)] + sy[k % m] - 2 * c)),
            [n, m]
        );
    };

    ans.fit = () => {
        const cost = squaredCost();
        const maxCost = cost.data.reduce((s, x) => Math.max(s, x), 0) || 1;
        const kernel = cost.map(x => Math.exp(-x / (maxCost * entropy)));
        const av = vec.fromArray(a);
        const bv = vec.fromArray(b);
        const floor = x => Math.max(x, 1e-300);
        let u = vec.fromArray(new Array(n).fill(1));
        let v = vec.fromArray(new Array(m).fill(1));
        let iterations = 0;
        while (iterations < maxIterations) {
            u = av.div(kernel.prodVec(v).map(floor));
            v = bv.div(kernel.dotVec(u).map(floor));
            iterations++;
            // The target marginal is exact after the v update; check the source one.
            const error = kernel.prodVec(v).mul(u).sub(av).fold(0, (s, x) => s + Math.abs(x));
            if (error < tolerance) break;
        }
        ans.plan = mat(kernel.map((k, i, j) => u.components[i] * k * v.components[j]).data, [n, m]);
        ans.cost = () => ans.plan.data.reduce((s, p, k) => s + p * cost.data[k], 0);
        ans.iterations = iterations;
        return ans;
    };

    // Barycentric projection of source point i: sum_j P_ij y_j / a_i. Returns a vec.
    ans.map = (i, values = defaultValues) => {
        if (!ans.plan) throw new Error("OptimalTransport must be fitted first");
        if (!Number.isInteger(i) || i < 0 || i >= n) throw new Error("source index out of range");
        const ys = values === defaultValues ? values : toPoints(values, "values");
        if (ys.length !== m) throw new Error("values must have one entry per target point");
        let acc = vec.zero(ys[0].dim);
        let mass = 0;
        for (let j = 0; j < m; j++) {
            const p = ans.plan.data[i * m + j];
            acc = acc.add(ys[j].scale(p));
            mass += p;
        }
        return acc.scale(1 / Math.max(mass, 1e-300));
    };

    // Displacement interpolation: (1 - t) x_i + t map(i) for every source point, t clamped to [0, 1].
    // `start` replaces the lerp origin (same space as `values`); `indices` restricts the output to some source points.
    ans.interpolate = (t, { values = defaultValues, start = from, indices } = {}) => {
        t = Math.max(0, Math.min(1, t));
        const origin = start === from ? from : toPoints(start, "start");
        if (origin.length !== n) throw new Error("start must have one entry per source point");
        const ys = values === defaultValues ? values : toPoints(values, "values");
        return (indices ?? origin.map((_, i) => i)).map(i => origin[i].scale(1 - t).add(ans.map(i, ys).scale(t)));
    };

    return ans;
};

function toPoints(points, name) {
    if (!Array.isArray(points) || points.length === 0) throw new Error(`${name} points must be a non-empty array`);
    const ans = points.map(p => {
        if (p && p.type === "vector") return p;
        if (Array.isArray(p) || ArrayBuffer.isView(p)) return vec.fromArray(Array.from(p));
        throw new Error(`${name} points must be arrays or NMath vectors`);
    });
    if (ans.some(p => p.dim !== ans[0].dim || p.dim === 0)) {
        throw new Error(`${name} points must have the same non-zero dimension`);
    }
    return ans;
}

function toWeights(weights, size, name) {
    if (weights === undefined) return new Array(size).fill(1 / size);
    if (weights.length !== size) throw new Error(`${name} weights must have one entry per point`);
    const w = Array.from(weights);
    if (w.some(x => !(x >= 0))) throw new Error(`${name} weights must be non-negative`);
    if (Math.abs(w.reduce((s, x) => s + x, 0) - 1) > 1e-6) throw new Error(`${name} weights must sum to 1`);
    return w;
}

export { OptimalTransport };
