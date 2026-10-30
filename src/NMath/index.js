
// Type tags
const TYPES = {
    real: "real",
    complex: "complex",
    dual: "dual",
    vector: "vector",
    covector: "covector",
    multivector: "multivector",
    matrix: "matrix",
    smatrix: "smatrix",
};

// Scalar types
function real(value) {
    const ans = { type: TYPES.real, value: value };
    ans.add = (other) => real(ans.value + other.value);
    ans.sub = (other) => real(ans.value - other.value);
    ans.mul = (other) => real(ans.value * other.value);
    ans.div = (other) => {
        if (other.value === 0) throw Error("division by zero");
        return real(ans.value / other.value);
    };
    ans.inv = () => {
        if (ans.value === 0) throw Error("division by zero");
        return real(1 / ans.value);
    };
    ans.neg = () => real(-ans.value);
    ans.conj = () => ans; // real numbers are their own conjugate
    ans.equals = (other) => other.type === TYPES.real && ans.value === other.value;
    ans.toString = () => String(ans.value);
    ans.toVisual = () => ({ type: "latex", value: ans.value });
    return ans;
}
real.random = () => real(Math.random());

function complex(realPart, imagPart) {
    const ans = { type: TYPES.complex, real: real(realPart), imag: real(imagPart) };
    ans.add = (other) => complex(ans.real.value + other.real.value, ans.imag.value + other.imag.value);
    ans.sub = (other) => complex(ans.real.value - other.real.value, ans.imag.value - other.imag.value);
    ans.mul = (other) => complex(
        ans.real.value * other.real.value - ans.imag.value * other.imag.value,
        ans.real.value * other.imag.value + ans.imag.value * other.real.value
    );
    ans.div = (other) => {
        const denominator = ans.mul(other.conj()).real.value; // |other|^2
        if (denominator === 0) throw Error("division by zero");
        return ans.mul(other.conj()).mul(complex(1 / denominator, 0));
    }
    ans.inv = () => {
        const denominator = ans.mul(ans.conj()).real.value; // |this|^2
        if (denominator === 0) throw Error("division by zero");
        return ans.conj().mul(complex(1 / denominator, 0));
    }
    ans.neg = () => complex(-ans.real.value, -ans.imag.value);
    ans.conj = () => complex(ans.real.value, -ans.imag.value);
    ans.equals = (other) => other.type === TYPES.complex && ans.real.value === other.real.value && ans.imag.value === other.imag.value;
    ans.toString = () => `${ans.real.value} + ${ans.imag.value}i`;
    ans.toVisual = () => ({ type: "latex", value: `${ans.real.value} + ${ans.imag.value}\\imath` });
    return ans;
}
complex.random = () => complex(Math.random(), Math.random());

function dual(realPart, dualPart) {
    const ans = { type: TYPES.dual, real: real(realPart), dual: real(dualPart) };
    ans.add = (other) => dual(ans.real.value + other.real.value, ans.dual.value + other.dual.value);
    ans.sub = (other) => dual(ans.real.value - other.real.value, ans.dual.value - other.dual.value);
    ans.mul = (other) => dual(
        ans.real.value * other.real.value,
        ans.real.value * other.dual.value + ans.dual.value * other.real.value
    );
    ans.div = (other) => {
        const denominator = ans.mul(other.conj()).real.value; // |other|^2
        if (denominator === 0) throw Error("division by zero");
        return ans.mul(other.conj()).mul(dual(1 / denominator, 0));
    }
    ans.inv = () => {
        const denominator = ans.mul(ans.conj()).real.value; // |this|^2
        if (denominator === 0) throw Error("division by zero");
        return ans.conj().mul(dual(1 / denominator, 0));
    }
    ans.neg = () => dual(-ans.real.value, -ans.dual.value);
    ans.conj = () => dual(ans.real.value, -ans.dual.value);
    ans.equals = (other) => other.type === TYPES.dual && ans.real.value === other.real.value && ans.dual.value === other.dual.value;
    ans.toString = () => `${ans.real.value} + ${ans.dual.value}\\epsilon`;
    ans.toVisual = () => ({ type: "latex", value: `${ans.real.value} + ${ans.dual.value}\\epsilon` });
    return ans;
}
dual.random = () => dual(Math.random(), Math.random());

// Vectors
function vec(...components) {
    return vec.fromArray(components);
}

// Takes ownership of the array, avoiding the argument spread of vec(...components)
vec.fromArray = (components) => {
    const ans = { type: TYPES.vector, components: components };

    ans.dim = ans.components.length;
    ans.add = (other) => {
        if (!other || other.type !== TYPES.vector) throw Error("Operand must be a vector");
        if (ans.components.length !== other.components.length) throw Error("Vector dimensions must match for addition");
        const newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(ans.components[i] + other.components[i]);
        }
        return vec(...newVec);
    };
    ans.sub = (other) => {
        if (!other || other.type !== TYPES.vector) throw Error("Operand must be a vector");
        if (ans.components.length !== other.components.length) throw Error("Vector dimensions must match for subtraction");
        const newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(ans.components[i] - other.components[i]);
        }
        return vec(...newVec);
    };
    ans.mul = (other) => {
        if (!other || other.type !== TYPES.vector) throw Error("Operand must be a vector");
        if (ans.components.length !== other.components.length) throw Error("Vector dimensions must match for multiplication");
        const newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(ans.components[i] * other.components[i]);
        }
        return vec(...newVec);
    };
    ans.div = (other) => {
        if (!other || other.type !== TYPES.vector) throw Error("Operand must be a vector");
        if (ans.components.length !== other.components.length) throw Error("Vector dimensions must match for division");
        const newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(ans.components[i] / other.components[i]);
        }
        return vec(...newVec);
    };

    ans.op = (other, fn) => {
        if (!other || other.type !== TYPES.vector) throw Error("Operand must be a vector");
        if (ans.components.length !== other.components.length) throw Error("Vector dimensions must match for operation");
        const newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(fn(ans.components[i], other.components[i]));
        }
        return vec(...newVec);
    };

    ans.scale = (field) => {
        if (typeof field !== "number") throw Error("Scaling requires a field element");
        let newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(ans.components[i] * field);
        }
        return vec(...newVec);
    };

    // Dot product of two vectors, returns a field element
    ans.dot = (other) => {
        if (!other || other.type !== TYPES.vector) throw Error("Operand must be a vector");
        if (ans.components.length !== other.components.length) throw Error("Vector dimensions must match for dot product");
        let result = 0;
        for (let i = 0; i < ans.components.length; i++) {
            result += ans.components[i] * other.components[i];
        }
        return result;
    };

    // Outer product of two vectors, returns a matrix, C_ij = A_i * B_j
    ans.outer = (other) => {
        const data = [];
        for (let i = 0; i < ans.components.length; i++) {
            for (let j = 0; j < other.components.length; j++) {
                data.push(ans.components[i] * other.components[j]);
            }
        }
        return mat(data, [ans.components.length, other.components.length]);
    }

    ans.length = () => {
        return Math.sqrt(ans.dot(ans));
    };

    ans.squareLength = () => {
        return ans.dot(ans);
    };

    ans.normalize = () => {
        const length = ans.dot(ans);
        if (length === 0) {
            throw Error("Cannot normalize zero vector");
        }
        const invLength = 1 / Math.sqrt(length);
        return ans.scale(invLength);
    };

    ans.fold = (acc, fn) => {
        let result = acc;
        for (let i = 0; i < ans.components.length; i++) {
            result = fn(result, ans.components[i], i);
        }
        return result;
    };
    ans.map = (fn) => {
        let result = [];
        for (let i = 0; i < ans.components.length; i++) {
            result.push(fn(ans.components[i], i));
        }
        return vec(...result);
    };
    ans.forEach = (fn) => {
        for (let i = 0; i < ans.components.length; i++) {
            fn(ans.components[i], i);
        }
    };

    ans.equals = (other) => {
        if (!other || other.type !== TYPES.vector) return false;
        for (let i = 0; i < ans.components.length; i++) {
            if (ans.components[i] !== other.components[i]) return false;
        }
        return true;
    };
    ans.toString = () => `(${ans.components.join(", ")})`;
    ans.toVisual = () => ({ type: "latex", value: `(${ans.components.join(", ")})` });
    ans.toArray = () => ans.components;
    return ans;
};
vec.zero = (dim) => {
    const components = [];
    for (let i = 0; i < dim; i++) {
        components.push(0);
    }
    return vec(...components);
};
vec.random = (dim) => {
    const components = [];
    for (let i = 0; i < dim; i++) {
        components.push(Math.random());
    }
    return vec(...components);
};

vec.e = (n, index) => {
    const components = [];
    for (let i = 0; i < n; i++) {
        components.push(i === index ? 1 : 0);
    }
    return vec(...components);
};



// Dense matrices
// data: array of matrix elements in row-major order
// shape: [rows: number of rows, cols: number of columns]
function mat(data, shape) {
    const ans = { type: TYPES.matrix, data, shape };

    if (!shape) {
        throw Error("Shape must be provided for the matrix");
    }

    ans.rows = shape[0];
    ans.cols = shape[1];

    ans.get = (row, col) => {
        if (row < 0 || row >= ans.rows || col < 0 || col >= ans.cols) {
            throw Error("Index out of bounds");
        }
        return ans.data[row * ans.cols + col];
    };

    ans.add = (other) => {
        if (!other || other.type !== TYPES.matrix) throw Error("Invalid matrix for addition");
        if (other.rows !== ans.rows || other.cols !== ans.cols) {
            throw Error("Matrix dimensions must match for addition");
        }
        const resultData = [];
        for (let i = 0; i < ans.data.length; i++) {
            resultData.push(ans.data[i] + other.data[i]);
        }
        return mat(resultData, [ans.rows, ans.cols]);
    };
    ans.sub = (other) => {
        if (!other || other.type !== TYPES.matrix) throw Error("Invalid matrix for subtraction");
        if (other.rows !== ans.rows || other.cols !== ans.cols) {
            throw Error("Matrix dimensions must match for subtraction");
        }
        const resultData = [];
        for (let i = 0; i < ans.data.length; i++) {
            resultData.push(ans.data[i] - other.data[i]);
        }
        return mat(resultData, [ans.rows, ans.cols]);
    };
    ans.mul = (other) => {
        if (!other || other.type !== TYPES.matrix) throw Error("Invalid matrix for multiplication");
        if (other.rows !== ans.rows || other.cols !== ans.cols) {
            throw Error("Matrix dimensions must match for multiplication");
        }
        const resultData = [];
        for (let i = 0; i < ans.data.length; i++) {
            resultData.push(ans.data[i] * other.data[i]);
        }
        return mat(resultData, [ans.rows, ans.cols]);
    };
    ans.div = (other) => {
        if (!other || other.type !== TYPES.matrix) throw Error("Invalid matrix for division");
        if (other.rows !== ans.rows || other.cols !== ans.cols) {
            throw Error("Matrix dimensions must match for division");
        }
        const resultData = [];
        for (let i = 0; i < ans.data.length; i++) {
            resultData.push(ans.data[i] / other.data[i]);
        }
        return mat(resultData, [ans.rows, ans.cols]);
    };
    ans.scale = (field) => {
        if (typeof field !== "number") throw Error("Invalid field for scaling");
        const resultData = [];
        for (let i = 0; i < ans.data.length; i++) {
            resultData.push(ans.data[i] * field);
        }
        return mat(resultData, [ans.rows, ans.cols]);
    };

    ans.prod = (other) => {
        if (!other || other.type !== TYPES.matrix) throw Error("Invalid matrix for product");
        if (ans.cols !== other.rows) {
            throw Error("Matrix dimensions must match for matrix product");
        }

        const resultData = new Array(ans.rows * other.cols);
        for (let i = 0; i < ans.rows; i++) {
            for (let j = 0; j < other.cols; j++) {
                let sum = ans.data[i * ans.cols] * other.data[j];
                for (let k = 1; k < ans.cols; k++) {
                    sum = sum + ans.data[i * ans.cols + k] * other.data[k * other.cols + j];
                }
                resultData[i * other.cols + j] = sum;
            }
        }
        return mat(resultData, [ans.rows, other.cols]);
    };

    ans.prodVec = (vector) => {
        if (!vector || vector.type !== TYPES.vector) throw Error("Invalid vector for matrix-vector product");
        if (ans.cols !== vector.dim) {
            throw Error("Matrix and vector dimensions must match for matrix-vector product");
        }
        const resultData = new Array(ans.rows);
        for (let i = 0; i < ans.rows; i++) {
            let sum = ans.data[i * ans.cols] * vector.components[0];
            for (let j = 1; j < ans.cols; j++) {
                sum = sum + ans.data[i * ans.cols + j] * vector.components[j];
            }
            resultData[i] = sum;
        }
        return vec(...resultData);
    };

    ans.dotVec = (vector) => {
        if (!vector || vector.type !== TYPES.vector) throw Error("Invalid vector for transpose product");
        if (ans.rows !== vector.dim) {
            throw Error("Matrix and vector dimensions must match for transpose product");
        }
        const resultData = new Array(ans.cols).fill(0);
        for (let i = 0; i < ans.rows; i++) {
            for (let j = 0; j < ans.cols; j++) {
                resultData[j] += ans.data[i * ans.cols + j] * vector.components[i];
            }
        }
        return vec.fromArray(resultData);
    };

    ans.dot = (matrixOrVector) => {
        if (matrixOrVector?.type === TYPES.vector) {
            return ans.dotVec(matrixOrVector);
        }
        if (!matrixOrVector || matrixOrVector.type !== TYPES.matrix) {
            throw Error("Invalid matrix or vector for transpose product");
        }
        if (ans.rows !== matrixOrVector.rows) {
            throw Error("Matrix dimensions must match for transpose product");
        }

        const resultData = new Array(ans.cols * matrixOrVector.cols).fill(0);
        for (let i = 0; i < ans.cols; i++) {
            for (let j = 0; j < matrixOrVector.cols; j++) {
                for (let k = 0; k < ans.rows; k++) {
                    resultData[i * matrixOrVector.cols + j] +=
                        ans.data[k * ans.cols + i] * matrixOrVector.data[k * matrixOrVector.cols + j];
                }
            }
        }
        return mat(resultData, [ans.cols, matrixOrVector.cols]);
    };

    ans.map = (fn) => {
        const resultData = [];
        for (let n = 0; n < ans.data.length; n++) {
            const j = n % ans.cols;
            const i = Math.floor(n / ans.cols);
            resultData.push(fn(ans.data[n], i, j));
        }
        return mat(resultData, [ans.rows, ans.cols]);
    };

    // Eigen decomposition for symmetric matrices (max and min eigenvalues)
    // options: maxIterations, tolerance (eigenpair residual ||Av - lambda v||), momentum, k (number of eigenvalues), maxFirst (whether to compute largest eigenvalues first)
    ans.eigen = (options = {}) => {
        const { maxFirst = true } = options;
        if (maxFirst) {
            return eigenMax(ans, options);
        }
        return eigenMin(ans, options);
    };

    // Solve min_x 0.5 |Ax - b|^2 using Nesterov gradient descent.
    ans.solve = (b, options = {}) => {
        if (!b || b.type !== TYPES.vector) throw Error("Invalid vector for linear system");
        if (ans.rows !== b.dim) throw Error("Matrix and vector dimensions must match for linear system");

        const { maxIterations = 1000, tolerance = 1e-6, momentum = 0.9 } = options;
        const square = ans.rows === ans.cols;
        const gradient = residual => square ? residual : ans.dot(residual);
        const hessianProdVec = vector => {
            const product = ans.prodVec(vector);
            return square ? product : ans.dot(product);
        };

        let x = vec.zero(ans.cols);
        let velocity = vec.zero(ans.cols);
        for (let i = 0; i < maxIterations; i++) {
            const lookahead = x.sub(velocity.scale(momentum));
            const residual = ans.prodVec(lookahead).sub(b);
            const grad = gradient(residual);
            if (grad.length() <= tolerance) return lookahead;

            const hessianGrad = hessianProdVec(grad);
            const denominator = grad.dot(hessianGrad);
            if (denominator === 0) break;
            const alpha = grad.dot(grad) / denominator;
            velocity = velocity.scale(momentum).add(grad.scale(alpha));
            x = x.sub(velocity);
        }
        return x;
    };

    ans.equals = (other) => {
        if (!other || other.type !== TYPES.matrix) return false;
        if (ans.rows !== other.rows || ans.cols !== other.cols) return false;
        for (let i = 0; i < ans.data.length; i++) {
            if (ans.data[i] !== other.data[i]) return false;
        }
        return true;
    };

    ans.toString = () => {
        let rows = [];
        for (let i = 0; i < ans.rows; i++) {
            let row = [];
            for (let j = 0; j < ans.cols; j++) {
                row.push(ans.data[i * ans.cols + j]);
            }
            rows.push(`[${row.join(", ")}]`);
        }
        return `[${rows.join(", ")}]`;
    };

    ans.toVisual = () => {
        let rows = [];
        for (let i = 0; i < ans.rows; i++) {
            let row = [];
            for (let j = 0; j < ans.cols; j++) {
                row.push(ans.data[i * ans.cols + j]);
            }
            rows.push(row.join(" & "));
        }
        return { type: "latex", value: `\\begin{bmatrix}${rows.join("\\\\")}\\end{bmatrix}` };
    };

    return ans;
}

mat.ofVectors = (vectors) => {
    const comps = vectors.map(v => v.components ?? v);
    const d = comps[0].length;
    const n = comps.length;
    const matrix = new Array(d * n);
    for (let i = 0; i < d; i++) {
        for (let j = 0; j < n; j++) {
            matrix[i * n + j] = comps[j][i];
        }
    }
    return mat(matrix, [d, n]);
};

mat.id = (size) => {
    const vectors = [];
    for (let j = 0; j < size; j++) {
        const v = vec.zero(size);
        v.components[j] = 1;
        vectors.push(v);
    }
    return mat.ofVectors(vectors);
}

mat.zero = (rows, cols) => {
    const vectors = [];
    for (let j = 0; j < cols; j++) {
        vectors.push(vec.zero(rows));
    }
    return mat.ofVectors(vectors);
};

const gaussian = () => {
    const u = 1 - Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};

const SAMPLERS = {
    uniform: Math.random,
    gaussian,
};

// options.distribution: "uniform" (default, [0,1)), "gaussian" (N(0,1)), "rademacher" (+-1)
mat.random = (rows, cols, { distribution = SAMPLERS.uniform } = {}) => {
    const sample = SAMPLERS[distribution];
    if (!sample) throw Error(`Unknown distribution: ${distribution}`);
    const data = new Array(rows * cols);
    for (let i = 0; i < data.length; i++) {
        data[i] = sample();
    }
    return mat(data, [rows, cols]);
};

mat.builder = (rows, cols) => {
    const matrix = new Array(rows * cols).fill(0);
    const builder = {
        build: () => {
            return mat(matrix, [rows, cols]);
        },
        set: (i, j, x) => {
            if (i >= 0 && i < rows && j >= 0 && j < cols) {
                matrix[i * cols + j] = x;
                return builder;
            }
            return builder;
        }
    }
    return builder;
}

// Sparse matrices
function smat(nzvalues, indices, shape) {
    const ans = { type: TYPES.smatrix, nzvalues, indices, shape };

    if (!shape) {
        throw Error("Shape must be provided for the matrix");
    }

    ans.rows = shape[0];
    ans.cols = shape[1];

    // Row and column of each nonzero, computed once on first use (the matrix is immutable)
    let coords = null;
    const coordinates = () => {
        if (!coords) {
            const rowOf = new Array(ans.indices.length);
            const colOf = new Array(ans.indices.length);
            for (let k = 0; k < ans.indices.length; k++) {
                rowOf[k] = Math.floor(ans.indices[k] / ans.cols);
                colOf[k] = ans.indices[k] % ans.cols;
            }
            coords = { rowOf, colOf };
        }
        return coords;
    };

    ans.get = (i, j) => {
        if (i < 0 || i >= ans.shape[0] || j < 0 || j >= ans.shape[1]) return 0;
        const index = j + i * ans.shape[1];
        let low = 0;
        let high = ans.indices.length - 1;
        while (low <= high) {
            const mid = (low + high) >> 1;
            if (ans.indices[mid] === index) return ans.nzvalues[mid];
            if (ans.indices[mid] < index) low = mid + 1;
            else high = mid - 1;
        }
        return 0;
    };

    ans.add = (other) => {
        if (!other || other.type !== TYPES.smatrix) throw Error("Incompatible matrix");
        if (ans.shape[0] !== other.shape[0] || ans.shape[1] !== other.shape[1]) throw Error("Incompatible matrix shape");
        const n = ans.rows * ans.cols;
        const builder = smat.builder(ans.rows, ans.cols);
        for (let k = 0; k < n; k++) {
            const i = Math.floor(k / ans.cols);
            const j = k % ans.cols;
            builder.set(i, j, ans.get(i, j) + other.get(i, j));
        }
        return builder.build();
    };

    ans.sub = (other) => {
        if (!other || other.type !== TYPES.smatrix) throw Error("Incompatible matrix");
        if (ans.shape[0] !== other.shape[0] || ans.shape[1] !== other.shape[1]) throw Error("Incompatible matrix shape");
        const n = ans.rows * ans.cols;
        const builder = smat.builder(ans.rows, ans.cols);
        for (let k = 0; k < n; k++) {
            const i = Math.floor(k / ans.cols);
            const j = k % ans.cols;
            builder.set(i, j, ans.get(i, j) - other.get(i, j));
        }
        return builder.build();
    };

    ans.mul = (other) => {
        if (!other || other.type !== TYPES.smatrix) throw Error("Incompatible matrix");
        if (ans.shape[0] !== other.shape[0] || ans.shape[1] !== other.shape[1]) throw Error("Incompatible matrix shape");
        const n = ans.rows * ans.cols;
        const builder = smat.builder(ans.rows, ans.cols);
        for (let k = 0; k < n; k++) {
            const i = Math.floor(k / ans.cols);
            const j = k % ans.cols;
            builder.set(i, j, ans.get(i, j) * other.get(i, j));
        }
        return builder.build();
    };

    ans.div = (other) => {
        if (!other || other.type !== TYPES.smatrix) throw Error("Incompatible matrix");
        if (ans.shape[0] !== other.shape[0] || ans.shape[1] !== other.shape[1]) throw Error("Incompatible matrix shape");
        const n = ans.rows * ans.cols;
        const builder = smat.builder(ans.rows, ans.cols);
        for (let k = 0; k < n; k++) {
            const i = Math.floor(k / ans.cols);
            const j = k % ans.cols;
            builder.set(i, j, ans.get(i, j) / other.get(i, j));
        }
        return builder.build();
    };

    ans.scale = (field) => {
        if (typeof field !== "number") throw Error("Invalid field for scaling");
        const builder = smat.builder(ans.rows, ans.cols);
        for (let i = 0; i < ans.rows; i++) {
            for (let j = 0; j < ans.cols; j++) {
                builder.set(i, j, ans.get(i, j) * field);
            }
        }
        return builder.build();
    };


    ans.prod = (other) => {
        if (!other || other.type !== TYPES.smatrix) throw Error("Invalid matrix for product");
        if (ans.cols !== other.rows) {
            throw Error("Matrix dimensions must match for matrix product");
        }

        const builder = smat.builder(ans.rows, other.cols);
        for (let i = 0; i < ans.rows; i++) {
            for (let j = 0; j < other.cols; j++) {
                let sum = ans.get(i, 0) * other.get(0, j);
                for (let k = 1; k < ans.cols; k++) {
                    sum = sum + ans.get(i, k) * other.get(k, j);
                }
                builder.set(i, j, sum);
            }
        }
        return builder.build();
    };

    ans.prodVec = (vector) => {
        if (!vector || vector.type !== TYPES.vector) throw Error("Invalid vector for matrix-vector product");
        if (ans.cols !== vector.dim) {
            throw Error("Matrix and vector dimensions must match for matrix-vector product");
        }
        const { rowOf, colOf } = coordinates();
        const x = vector.components;
        const values = ans.nzvalues;
        const resultData = new Array(ans.rows).fill(0);
        for (let k = 0; k < values.length; k++) {
            resultData[rowOf[k]] += values[k] * x[colOf[k]];
        }
        return vec.fromArray(resultData);
    };

    ans.dotVec = (vector) => {
        if (!vector || vector.type !== TYPES.vector) throw Error("Invalid vector for transpose product");
        if (ans.rows !== vector.dim) {
            throw Error("Matrix and vector dimensions must match for transpose product");
        }
        const { rowOf, colOf } = coordinates();
        const resultData = new Array(ans.cols).fill(0);
        for (let k = 0; k < ans.nzvalues.length; k++) {
            resultData[colOf[k]] += ans.nzvalues[k] * vector.components[rowOf[k]];
        }
        return vec.fromArray(resultData);
    };

    ans.dot = (matrixOrVector) => {
        if (matrixOrVector?.type === TYPES.vector) {
            return ans.dotVec(matrixOrVector);
        }
        if (!matrixOrVector || matrixOrVector.type !== TYPES.smatrix) {
            throw Error("Invalid sparse matrix or vector for transpose product");
        }
        if (ans.rows !== matrixOrVector.rows) {
            throw Error("Matrix dimensions must match for transpose product");
        }

        const resultData = new Array(ans.cols * matrixOrVector.cols).fill(0);
        const { rowOf, colOf } = coordinates();
        for (let k = 0; k < ans.nzvalues.length; k++) {
            const row = rowOf[k];
            const col = colOf[k];
            for (let j = 0; j < matrixOrVector.cols; j++) {
                resultData[col * matrixOrVector.cols + j] +=
                    ans.nzvalues[k] * matrixOrVector.get(row, j);
            }
        }
        const result = smat.builder(ans.cols, matrixOrVector.cols);
        for (let i = 0; i < ans.cols; i++) {
            for (let j = 0; j < matrixOrVector.cols; j++) {
                result.set(i, j, resultData[i * matrixOrVector.cols + j]);
            }
        }
        return result.build();
    };

    ans.solve = (b, options = {}) => {
        if (!b || b.type !== TYPES.vector) throw Error("Invalid vector for linear system");
        if (ans.rows !== b.dim) throw Error("Matrix and vector dimensions must match for linear system");

        const { maxIterations = 1000, tolerance = 1e-6, momentum = 0.9 } = options;
        const square = ans.rows === ans.cols;
        const gradient = residual => square ? residual : ans.dot(residual);
        const hessianProdVec = vector => {
            const product = ans.prodVec(vector);
            return square ? product : ans.dot(product);
        };

        let x = vec.zero(ans.cols);
        let velocity = vec.zero(ans.cols);
        for (let i = 0; i < maxIterations; i++) {
            const lookahead = x.sub(velocity.scale(momentum));
            const residual = ans.prodVec(lookahead).sub(b);
            const grad = gradient(residual);
            if (grad.length() <= tolerance) return lookahead;

            const hessianGrad = hessianProdVec(grad);
            const denominator = grad.dot(hessianGrad);
            if (denominator === 0) break;
            const alpha = grad.dot(grad) / denominator;
            velocity = velocity.scale(momentum).add(grad.scale(alpha));
            x = x.sub(velocity);
        }
        return x;
    };

    ans.map = (fn) => {
        const builder = smat.builder(ans.rows, ans.cols);
        for (let n = 0; n < ans.indices.length; n++) {
            const j = ans.indices[n] % ans.cols;
            const i = Math.floor(ans.indices[n] / ans.cols);
            builder.set(i, j, fn(ans.get(i, j), i, j));
        }
        return builder.build();
    };

    // Eigen decomposition for symmetric matrices (max and min eigenvalues)
    // options: maxIterations, tolerance (eigenpair residual ||Av - lambda v||), momentum, k (number of eigenvalues), maxFirst (whether to compute largest eigenvalues first)
    ans.eigen = (options = {}) => {
        const { maxFirst = true} = options;
        if (maxFirst) {
            return eigenMax(ans, options);
        }
        return eigenMin(ans, options);
    };

    ans.equals = (other) => {
        if (!other || other.type !== TYPES.smatrix) return false;
        if (ans.shape[0] !== other.shape[0] || ans.shape[1] !== other.shape[1]) return false;
        if (ans.nzvalues.length !== other.nzvalues.length) return false;
        for (let i = 0; i < ans.nzvalues.length; i++) {
            if (ans.nzvalues[i] !== other.nzvalues[i]) return false;
            if (ans.indices[i] !== other.indices[i]) return false;
        }
        return true;
    };

    ans.toString = () => {
        let rows = [];
        for (let i = 0; i < ans.rows; i++) {
            let row = [];
            for (let j = 0; j < ans.cols; j++) {
                row.push(ans.get(i, j));
            }
            rows.push(`[${row.join(", ")}]`);
        }
        return `[${rows.join(", ")}]`;
    };

    ans.toVisual = () => {
        let rows = [];
        for (let i = 0; i < ans.rows; i++) {
            let row = [];
            for (let j = 0; j < ans.cols; j++) {
                row.push(ans.get(i, j));
            }
            rows.push(row.join(" & "));
        }
        return { type: "latex", value: `\\begin{bmatrix}${rows.join("\\\\")}\\end{bmatrix}` };
    };

    return ans;
}

smat.builder = (rows, cols) => {
    const nzvalues = [];
    const indices = [];
    const shape = [rows, cols];
    const auxMap = new Map();
    const builder = {
        build: () => {
            const entries = [...auxMap.entries()].sort(([left], [right]) => left - right);
            for (const [index, value] of entries) {
                nzvalues.push(value);
                indices.push(index);
            }
            return smat(nzvalues, indices, shape);

        },
        set: (i, j, x) => {
            if (i < 0 || i >= rows || j < 0 || j >= cols) {
                return builder;
            }
            const index = j + i * cols;
            if (x === 0) {
                auxMap.delete(index);
            } else {
                auxMap.set(index, x);
            }
            return builder;
        }
    };
    return builder;
};

// Eigenvalue algorithms
function eigenMax(symMatrix, options = {}) {
    const { k = symMatrix.cols } = options;
    const eigenvalues = [];
    const eigenvectors = [];
    for (let i = 0; i < k; i++) {
        const v = powerMethod(symMatrix, options, eigenvectors);
        eigenvectors.push(v);
        const lambda = v.dot(symMatrix.prodVec(v)); // v is normalized, no need to divide by v.dot(v)
        eigenvalues.push(lambda);
    }
    return { eigenvalues, eigenvectors };
}

// Residual of the eigenpair (lambda, v), where v is unit length and av = A v
function eigenResidual(v, av) {
    return av.sub(v.scale(v.dot(av))).length();
}

function powerMethod(symMatrix, options = {}, basis = []) {
    const { maxIterations = 1000, tolerance = 1e-6 } = options;
    let v = gramSchmidt(vec.random(symMatrix.rows), basis);
    v = v.normalize();
    for (let i = 0; i < maxIterations; i++) {
        const w = symMatrix.prodVec(v);
        if (eigenResidual(v, w) <= tolerance) break;
        v = gramSchmidt(w, basis).normalize();
    }
    return v;
}

// basis vectors must be unit length
function gramSchmidt(v, basis) {
    let u = v;
    for (let i = 0; i < basis.length; i++) {
        const b = basis[i];
        u = u.sub(b.scale(u.dot(b)));
    }
    return u;
}

function eigenGradientDescent(symMatrix, options = {}, basis = []) {
    const { maxIterations = 1000, tolerance = 1e-6, momentum = 0.9 } = options;
    let v = gramSchmidt(vec.random(symMatrix.rows), basis);
    v = v.normalize();
    let velocity = vec.zero(symMatrix.rows);
    for (let i = 0; i < maxIterations; i++) {
        const lookahead = gramSchmidt(v.sub(velocity.scale(momentum)), basis).normalize();
        const grad = symMatrix.prodVec(lookahead); // gradient at the Nesterov look-ahead
        if (eigenResidual(lookahead, grad) <= tolerance) {
            v = lookahead;
            break;
        }
        const alpha = grad.dot(grad) / grad.dot(symMatrix.prodVec(grad));
        velocity = gramSchmidt(velocity.scale(momentum).add(grad.scale(alpha)), basis);
        v = gramSchmidt(v.sub(velocity), basis).normalize();
    }
    return v;
}

function eigenMin(symMatrix, options = {}) {
    const { k = symMatrix.cols } = options;
    const eigenvalues = [];
    const eigenvectors = [];
    for (let i = 0; i < k; i++) {
        const v = eigenGradientDescent(symMatrix, options, eigenvectors);
        eigenvectors.push(v);
        const lambda = v.dot(symMatrix.prodVec(v)); // v is normalized, no need to divide by v.dot(v)
        eigenvalues.push(lambda);
    }
    // Deflation does not guarantee ascending order
    const order = eigenvalues.map((_, i) => i).sort((i, j) => eigenvalues[i] - eigenvalues[j]);
    return { eigenvalues: order.map(i => eigenvalues[i]), eigenvectors: order.map(i => eigenvectors[i]) };
}




// Scalar functions
function exp(x) {
    switch (x.type) {
        case TYPES.real:
            return real(Math.exp(x.value));
        case TYPES.complex: {
            const expReal = Math.exp(x.real.value);
            return complex(
                expReal * Math.cos(x.imag.value),
                expReal * Math.sin(x.imag.value)
            );
        }
        case TYPES.dual: {
            const expRealDual = Math.exp(x.real.value);
            return dual(
                expRealDual,
                expRealDual * x.dual.value
            );
        }
        default:
            throw Error(`Unsupported type for exp: ${x.type}`);
    }
}

function log(x) {
    switch (x.type) {
        case TYPES.real:
            if (x.value <= 0) throw Error("logarithm of non-positive number");
            return real(Math.log(x.value));
        case TYPES.complex:
            return complex(
                Math.log(Math.sqrt(x.real.value ** 2 + x.imag.value ** 2)),
                Math.atan2(x.imag.value, x.real.value)
            );
        case TYPES.dual:
            if (x.real.value <= 0) throw Error("logarithm of non-positive number");
            return dual(Math.log(x.real.value), x.dual.value / x.real.value);
        default:
            throw Error(`Unsupported type for log: ${x.type}`);
    }
}



// Public API
const NMath = {
    real,
    complex,
    dual,
    exp,
    log,
    vec,
    mat,
    smat,
    TYPES,
};
export { NMath };