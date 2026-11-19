import { Kmeans } from "../Kmeans/index.js";
import { NMath } from "../NMath/index.js";
import { PQueue } from "../PQueue/index.js";

const HKmeans = {};

HKmeans.CombinationFn = {
    UNION: Math.min,
    SMOOTH_UNION: (a, b, k = 32) => {
        if (!Number.isFinite(k) || k <= 0) {
            throw new Error("k must be a positive finite number");
        }
        const min = Math.min(a, b);
        if (!Number.isFinite(min)) return min;
        return min - Math.log1p(Math.exp(-k * Math.abs(a - b))) / k;
    }
};

HKmeans.new = function(data, options = {}) {
    const { rho = 0.5, kmeansIter = 10 } = options;
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("data must be a non-empty array");
    }
    if (!Number.isFinite(rho) || rho <= 0 || rho >= 1) {
        throw new Error("rho must be between 0 and 1");
    }
    if (!Number.isInteger(kmeansIter) || kmeansIter < 0) {
        throw new Error("kmeansIter must be a non-negative integer");
    }

    const originals = data.slice();
    if (originals.some(point => !point || point.type !== "vector")) {
        throw new Error("data points must be NMath vectors");
    }
    const points = originals.map(toVector);
    const dim = points[0].dim;
    if (dim === 0 || points.some(point => point.dim !== dim)) {
        throw new Error("data vectors must have the same non-zero dimension");
    }

    let root;
    let levels;
    const ans = {};

    ans.fit = () => {
        let level = points.map((center, index) => ({
            center, radius: 0, children: [], index
        }));
        const fittedLevels = [level];

        while (level.length > 1) {
            const k = Math.max(1, Math.floor(rho * level.length));
            if (k === 1) {
                level = [makeNode(level, mean(points))];
            } else {
                const model = Kmeans.new(level.map(node => node.center), k, {
                    maxIterations: kmeansIter
                }).fit();
                const groups = Array.from({ length: k }, () => []);
                for (const node of level) {
                    groups[model.predictIndex(node.center)].push(node);
                }
                const nonempty = groups.filter(group => group.length > 0);
                level = nonempty.length === 1
                    ? [makeNode(level, mean(points))]
                    : nonempty.map(group => makeNode(group, mean(group.map(node => node.center))));
            }
            fittedLevels.push(level);
        }
        root = level[0];
        levels = fittedLevels;
        return ans;
    };

    ans.getLevels = () => {
        requireFit();
        return levels.map(level => level.map(node => NMath.vec.fromArray(node.center.components.slice())));
    };

    function requireFit() {
        if (!root) throw new Error("fit must be called before querying");
    }

    function search(point, k) {
        requireFit();
        const query = toVector(point);
        if (query.dim !== dim) throw new Error(`expected a vector of dimension ${dim}`);
        if (!Number.isInteger(k) || k < 0) {
            throw new Error("k must be a non-negative integer");
        }
        k = Math.min(k, points.length);
        if (k === 0) return [];

        const pending = new PQueue((a, b) => a.bound - b.bound);
        const nearest = new PQueue((a, b) => b.distance - a.distance || b.index - a.index);
        pending.push({ node: root, bound: lowerBound(query, root) });

        while (pending.size() > 0) {
            const { node, bound } = pending.pop();
            if (nearest.size() === k && canPrune(bound, nearest.peek().distance)) break;

            if (node.children.length === 0) {
                const candidate = { index: node.index, distance: distance(query, node.center) };
                if (nearest.size() < k) {
                    nearest.push(candidate);
                } else {
                    const worst = nearest.peek();
                    if (candidate.distance < worst.distance ||
                        (candidate.distance === worst.distance && candidate.index < worst.index)) {
                        nearest.pop();
                        nearest.push(candidate);
                    }
                }
            } else {
                for (const child of node.children) {
                    const childBound = lowerBound(query, child);
                    if (nearest.size() < k || !canPrune(childBound, nearest.peek().distance)) {
                        pending.push({ node: child, bound: childBound });
                    }
                }
            }
        }
        const result = [];
        while (nearest.size() > 0) result.push(nearest.pop());
        return result.reverse();
    }

    ans.findNN = point => originals[search(point, 1)[0].index];
    ans.findKnn = (point, k) => search(point, k).map(candidate => originals[candidate.index]);
    ans.udf = (point, k, mergeFn = HKmeans.CombinationFn.UNION) => {
        if (!Number.isInteger(k) || k <= 0) {
            throw new Error("k must be a positive integer");
        }
        if (typeof mergeFn !== "function") throw new Error("mergeFn must be a function");
        const neighbors = search(point, k);
        let result = neighbors[0].distance;
        for (let i = 1; i < neighbors.length; i++) {
            result = mergeFn(result, neighbors[i].distance);
        }
        return result;
    };
    return ans;
};

function toVector(value) {
    const components = value && value.type === "vector" ? value.components : value;
    if (!Array.isArray(components) && !ArrayBuffer.isView(components)) {
        throw new Error("data points must be arrays or NMath vectors");
    }
    const result = Array.from(components);
    if (result.some(component => !Number.isFinite(component))) {
        throw new Error("vector components must be finite numbers");
    }
    return NMath.vec.fromArray(result);
}

function mean(points) {
    let center = NMath.vec.zero(points[0].dim);
    for (const point of points) {
        center = center.add(point.scale(1 / points.length));
    }
    return center;
}

function distance(a, b) {
    return a.sub(b).length();
}

function makeNode(children, center) {
    let radius = 0;
    for (const child of children) {
        radius = Math.max(radius, distance(center, child.center) + child.radius);
    }
    // Inflate each level's bound to account for floating-point rounding.
    return { center, radius: radius * (1 + 4 * Number.EPSILON), children };
}

function lowerBound(point, node) {
    if (!Number.isFinite(node.radius)) return 0;
    return Math.max(0, distance(point, node.center) - node.radius);
}

function canPrune(bound, worstDistance) {
    const tolerance = 16 * Number.EPSILON * Math.max(1, bound, worstDistance);
    return bound > worstDistance + tolerance;
}

export { HKmeans };
