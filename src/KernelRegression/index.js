import { NMath } from "../NMath/index.js";
import { Symbolic } from "../Symbolic/index.js";

const KernelRegression = {};

/**
 * Fits scalar kernel ridge regression to numeric feature arrays and targets.
 * `kernelFn(a, b)` takes numeric arrays. For custom kernels, `kernelSym(point, coordinates)`
 * must implement the same kernel using a numeric training point and symbolic coordinates
 * to enable `predictSym()`. The default Gaussian supports both forms and accepts `sigma`.
 * `predictSym()` returns a snapshot with input variables x_0, x_1, ... marked as parameters.
 */
KernelRegression.new = function (X, Y, options = {}) {
    const dimension = X[0].length;
    const { sigma = 0.18 } = options;
    const {
        kernelFn = createGaussianKernel(sigma, dimension),
        kernelSym = options.kernelFn === undefined ? createGaussianKernelSym(sigma) : undefined,
        lambda = 0.05,
        maxIterations = 12000,
        tolerance = 1e-4,
        residualTolerance = 1e-3,
    } = options;

    const points = X.map(point => point.slice());
    const labels = NMath.vec.fromArray(Y.slice());
    let alpha;

    const ans = {
        fit: () => {
            const n = points.length;
            const values = [];
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    values.push(kernelFn(points[i], points[j]) + (i === j ? lambda : 0));
                }
            }
            const kernelMatrix = NMath.mat(values, [n, n]);
            const solution = kernelMatrix.solve(labels, { maxIterations, tolerance });
            const residual = kernelMatrix.prodVec(solution).sub(labels).length();
            if (!Number.isFinite(residual) || residual > residualTolerance) {
                throw new Error(`Kernel ridge solver did not converge (residual: ${residual})`);
            }
            alpha = solution;
            return ans;
        },
        gen: (coordinates) => {
            if (!alpha) throw new Error("Kernel regression must be fitted before prediction");
            let prediction = 0;
            for (let i = 0; i < points.length; i++) {
                prediction += alpha.components[i] * kernelFn(points[i], coordinates);
            }
            return prediction;
        },
        predictSym: () => {
            if (!alpha) throw new Error("Kernel regression must be fitted before prediction");
            if (typeof kernelSym !== "function") {
                throw new Error("A symbolic kernel is required for symbolic prediction");
            }
            const coordinates = Array.from({ length: dimension }, (_, i) => Symbolic.realVar(`x_${i}`, true));
            let terms = points.map((point, i) => Symbolic.real(alpha.components[i]).mul(kernelSym(point, coordinates)));
            while (terms.length > 1) {
                const next = [];
                for (let i = 0; i < terms.length; i += 2) {
                    next.push(i + 1 < terms.length ? terms[i].add(terms[i + 1]) : terms[i]);
                }
                terms = next;
            }
            return terms.length ? terms[0] : Symbolic.real(0);
        },
    };
    ans.predict = ans.gen;
    ans.alpha = () => alpha;
    return ans;
};

function createGaussianKernel(sigma, dimension) {
    return function gaussianKernel(a, b) {
        let squaredDistance = 0;
        for (let i = 0; i < dimension; i++) {
            const difference = (a[i] - b[i]) / sigma;
            squaredDistance += difference * difference;
        }
        return Math.exp(-squaredDistance / 2);
    };
}

// kernelSym receives a numeric training point and an array of symbolic input coordinates.
function createGaussianKernelSym(sigma) {
    return (point, coordinates) => {
        let squaredDistance = Symbolic.real(0);
        for (let i = 0; i < coordinates.length; i++) {
            const difference = coordinates[i].sub(Symbolic.real(point[i]));
            squaredDistance = squaredDistance.add(difference.mul(difference));
        }
        return Symbolic.exp(squaredDistance.mul(Symbolic.real(-1 / (2 * sigma * sigma))));
    };
}

export { KernelRegression };
