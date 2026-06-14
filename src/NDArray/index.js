import { Pair } from "../Pair/index.js";

/**
 * N-dimensional array implementation in row major order.
 */
export class NDArray {
    // (natural[], number[]) => NDArray
    constructor(dim, array) {
        this.dim = dim;
        // [dim[0] * ... * dim[n-1], dim[1] * ... * dim[n-1], ..., 1]
        this.powers = computePowers(dim);
        // row major array
        this.array = Array(this.powers[0]);

        if (array == null) {
            for (let i = 0; i < this.array.length; i++) {
                this.array[i] = 0;
            }
        } else {
            if (array.length !== this.array.length) {
                throw `Shape/dim doesn't agree with size ${dim}`;
            }
            this.array = array.slice();
        }
    }

    // ==========================================================
    // Non-mutating Operations (return new values, leave this intact)
    // ==========================================================

    // ========== Query ==========

    // NDArray => () => number
    size() {
        return this.powers[0];
    }

    // NDArray => () => number[]
    shape() {
        return this.dim;
    }

    // ========== Access ==========

    // NDArray => (number[] | string | number) => NDArray | number
    get(x) {
        if (x == null) return this.array[0];
        if (typeof x == "number") return this.get([x]);
        if (x.constructor === Array) {
            this.checkIfCoordSizeCompatible(x.length);
            this.checkIfIndexOutOfBounds(x);
            return this.array[this.getIndex(x)];
        }
        if (x.constructor === String) {
            const intervals = this.getIntervalFromStr(x);
            const newDim = this.computeNewDim(intervals);
            // string doesn't have any range
            if (newDim.length === 0) {
                const coord = [];
                for (let i = 0; i < intervals.length; i++) {
                    coord.push(intervals[i][0]);
                }
                return this.get(coord);
            }
            const newNDArray = new NDArray(newDim);
            const size = newNDArray.size();
            const y = [];
            const dx = [];
            for (let i = 0; i < intervals.length; i++) {
                dx[i] = intervals[i][1] - intervals[i][0] + 1;
            }

            const powers = computePowers(dx);
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < intervals.length; j++) {
                    const index = Math.floor(i / powers[j + 1]) % dx[j];
                    y[j] = intervals[j][0] + index;
                }
                newNDArray.array[i] = this.get(y);
            }
            return newNDArray;
        }
        throw "method 'get' only accepts strings and integer arrays";
    }

    // ========== Functional/Monadic ==========

    // NDArray => (scalar => scalar) => NDArray
    map(f) {
        const ans = this.copy();
        const size = this.size();
        for (let i = 0; i < size; i++) {
            ans.array[i] = f(this.array[i]);
        }
        return ans;
    }

    // NDArray => ((scalar, number[]) => scalar) => NDArray
    mapWithIndex(f) {
        const ans = this.copy();
        const size = this.size();
        const dim = this.dim;
        const powers = this.powers;
        const coord = [];
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < dim.length; j++) {
                coord[j] = Math.floor(i / powers[j + 1]) % dim[j];
            }
            ans.array[i] = f(this.array[i], coord);
        }
        return ans;
    }

    // NDArray => (b, (b, scalar) => b) => b
    fold(identity, binaryOperator) {
        const size = this.size();
        for (let i = 0; i < size; i++) {
            identity = binaryOperator(identity, this.array[i]);
        }
        return identity;
    }

    // NDArray => (number => void) => void
    forEach(f) {
        this.array.forEach(f);
    }

    // ========== Combination ==========

    // NDArray => (NDArray, number, (number, number, number) => number) => NDArray | number
    // Contracts last dim of this with first dim of otherArray via fold(accumulator, a, b).
    // Defaults to matrix multiplication: fold = (e, x, y) => e + x * y.
    prod(otherArray, initial = 0, fold = (e, x, y) => e + x * y) {
        const s1 = this.dim;
        const s2 = otherArray.dim;
        const k = s1[s1.length - 1];
        if (s2[0] !== k) {
            throw `prod: last dim of left (${k}) must equal first dim of right (${s2[0]})`;
        }
        const leftDims = s1.slice(0, -1);  // all dims of s1 except the contracted last
        const rightDims = s2.slice(1);      // all dims of s2 except the contracted first
        const outDim = leftDims.concat(rightDims);
        // 1D dot product → scalar
        if (outDim.length === 0) {
            let acc = initial;
            for (let l = 0; l < k; l++) {
                acc = fold(acc, this.get([l]), otherArray.get([l]));
            }
            return acc;
        }
        const nLeft = s1.length - 1;
        // C[i,j] = sum_l A[i,l] * B[l,j]
        return new NDArray(outDim).transformWithIndex((_, coord) => {
            const leftCoord = [...coord.slice(0, nLeft), 0]; // placeholder for contracted dim
            const rightCoord = [0, ...coord.slice(nLeft)]; // placeholder for contracted dim
            let acc = initial;
            for (let l = 0; l < k; l++) {
                leftCoord[nLeft] = l;
                rightCoord[0] = l;
                acc = fold(acc, this.get(leftCoord), otherArray.get(rightCoord));
            }
            return acc;
        });
    }

    // NDArray => (NDArray, (number, number) => number) => NDArray
    binaryOp(ndArray, binaryOperator) {
        const s1 = this.shape();

        // if ndArray is a number
        const dense = typeof ndArray == "number" ? NDArray.of(ndArray) : ndArray;
        const s2 = dense.shape();

        const small = s1.length < s2.length ? s1 : s2;
        const large = s1.length < s2.length ? s2 : s1;

        let newShape = [];
        for (let i = 0; i < small.length; i++) {
            try {
                newShape.push(
                    auxBroadCast(small[small.length - i - 1], large[large.length - i - 1])
                );
            } catch (e) {
                throw `Dimensions ${s1} and ${s2} are not compatible for broadcast`;
            }
        }
        for (let i = small.length; i < large.length; i++) {
            newShape.push(large[large.length - i - 1]);
        }
        newShape = newShape.reverse();
        const ans = new NDArray(newShape);
        return ans.transformWithIndex((x, index) => {
            const a = this.get(getBroadCastIndex(this, index));
            const b = dense.get(getBroadCastIndex(dense, index));
            return binaryOperator(a, b);
        });
    }

    zip(otherArray) {
        const s1 = this.shape();
        const s2 = otherArray.shape();
        if (s1.length != s2.length) {
            throw `can't zip arrays of different dimensions ${s1} and ${s2}`;
        }
        for (let i = 0; i < s1.length; i++) {
            if (s1[i] != s2[i]) {
                throw `can't zip arrays of different shapes ${s1} and ${s2}`;
            }
        }
        return new NDArray(s1, this.array.map((x, i) => Pair.of(x, otherArray.array[i])));
    }

    // ========== Transformation ==========

    // NDArray => (number[]) => NDArray
    reshape(newShape) {
        return NDArray.of(this, newShape);
    }

    // ========== Conversion & Comparison ==========

    // NDArray => () => nested js array
    toArray() {
        return this.toArrayRecursive([]);
    }

    toArrayRecursive(coord) {
        const array = [];
        const size = coord.length;
        if (size != this.dim.length) {
            for (let j = 0; j < this.dim[size]; j++) {
                array.push(this.toArrayRecursive(coord.concat([j])));
            }
            return array;
        }
        return this.get(coord);
    }

    // NDArray => () => string
    toString() {
        return this.toStringRecursive([]);
    }

    toStringRecursive(coord) {
        const stringBuilder = [];
        const size = coord.length;
        if (size != this.dim.length) {
            stringBuilder.push("[");
            for (let j = 0; j < this.dim[size]; j++) {
                stringBuilder.push(this.toStringRecursive(coord.concat([j])));
            }
            stringBuilder.push("]");
        } else {
            stringBuilder.push(`${this.get(coord)}, `);
        }
        return stringBuilder.join("");
    }

    // NDArray => () => NDArray (deep copy)
    copy() {
        return NDArray.of(this.array, this.dim);
    }

    // NDArray => (NDArray) => boolean
    equals(o) {
        if (this == o) return true;
        if (o == null || this.constructor !== o.constructor) return false;
        return (
            arrayEquals(this.array, o.array) &&
            arrayEquals(this.powers, o.powers) &&
            arrayEquals(this.dim, o.dim)
        );
    }

    // ==========================================================
    // Mutating Operations (modify this in place)
    // ==========================================================

    // NDArray => (number[] | string, scalar | NDArray) => NDArray
    set(x, value) {
        if (typeof x == "number" && value.constructor !== Array) {
            return this.set([x], value);
        }
        if (x.constructor === Array && value.constructor !== Array) {
            this.checkIfCoordSizeCompatible(x.length);
            this.checkIfIndexOutOfBounds(x);
            this.array[this.getIndex(x)] = value;
            return this;
        }
        if (x.constructor === String && value.constructor === NDArray) {
            const intervals = this.getIntervalFromStr(x);
            const size = value.size();
            const y = [];
            const dx = [];
            for (let i = 0; i < intervals.length; i++) {
                dx[i] = intervals[i][1] - intervals[i][0] + 1;
            }

            const powers = computePowers(dx);
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < intervals.length; j++) {
                    const index = Math.floor(i / powers[j + 1]) % dx[j];
                    y[j] = intervals[j][0] + index;
                }
                this.set(y, value.array[i]);
            }
            return this;
        }
        throw "set only accepts strings and integer arrays as the first argument and objects and NDArray as the second";
    }

    // NDArray => (number => number) => NDArray  
    transform(f) {
        const size = this.size();
        for (let i = 0; i < size; i++) {
            this.array[i] = f(this.array[i]);
        }
        return this;
    }

    // NDArray => ((number, number[]) => number) => NDArray  
    transformWithIndex(f) {
        const size = this.size();
        const dim = this.dim;
        const powers = this.powers;
        const coord = [];
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < dim.length; j++) {
                coord[j] = Math.floor(i / powers[j + 1]) % dim[j];
            }
            this.array[i] = f(this.array[i], coord);
        }
        return this;
    }

    // ========== Internal/Private Methods ==========

    getIndex(x) {
        let index = 0;
        const size = Math.min(x.length, this.dim.length);
        for (let i = 0; i < size; i++) {
            index += x[i] * this.powers[i + 1];
        }
        return index;
    }

    computeNewDim(intervals) {
        const dimBuff = [];
        for (let i = 0; i < intervals.length; i++) {
            const dx = intervals[i][1] - intervals[i][0];
            if (dx !== 0) {
                dimBuff.push(dx + 1);
            }
        }
        const newDim = [];
        for (let i = 0; i < dimBuff.length; i++) {
            newDim[i] = dimBuff[i];
        }
        return newDim;
    }

    getIntervalFromStr(x) {
        const split = x.split(" ").join("").split(",");
        this.checkIfCoordSizeCompatible(split.length);
        const intervals = [];
        for (let i = 0; i < split.length; i++) {
            const intervalBounds = split[i].split(":");
            const bounds2actions = {
                1: () => {
                    const integer = parseInt(intervalBounds[0]);
                    intervals[i] = [integer, integer];
                },
                2: () => {
                    const xmin = Math.max(
                        0,
                        Math.min(
                            this.dim[i] - 1,
                            "" === intervalBounds[0] ? 0 : parseInt(intervalBounds[0])
                        )
                    );
                    const xmax = Math.max(
                        0,
                        Math.min(
                            this.dim[i] - 1,
                            "" === intervalBounds[1] ? this.dim[i] - 1 : parseInt(intervalBounds[1])
                        )
                    );
                    const myInterval = [xmin, xmax];
                    if (xmax - xmin === 0) {
                        throw `empty interval xmax : ${xmax} < xmin : ${xmin}`;
                    }
                    intervals[i] = myInterval;
                }
            };
            bounds2actions[intervalBounds.length]();
        }
        return intervals;
    }

    checkIfIndexOutOfBounds(coord) {
        const isZeroDimOutOfBounds = this.dim.length === 0 && coord[0] > 0;
        const isOutOfBounds =
            this.dim.length !== 0 &&
            arrayBinOp(
                coord,
                this.dim,
                (x, y) => (x >= 0 && x < y ? 0 : 1)
            )
                .some(x => x === 1);
        if (isZeroDimOutOfBounds || isOutOfBounds) {
            throw `index out of bounds ${coord}, actual shape is ${this.dim}`;
        }
    }

    checkIfCoordSizeCompatible(size) {
        if (this.dim.length !== 0 && size > this.dim.length) {
            throw `Size dimension incorrect : ${size}. Correct size dimension should be less or equal ${this.dim.length}`;
        }
    }

    // ==========================================================
    // Static Factory Methods
    // ==========================================================

    // (NDArray | number[] | nested array, number[]?) => NDArray
    static of(array, dim) {
        if (array instanceof NDArray) {
            return dim === undefined
                ? new NDArray(array.dim, array.array)
                : new NDArray(dim, array.array);
        }
        if (!checkIfArrayIsLinear(array)) return buildDenseFromArray(array);
        if (array.length > 0 && dim === undefined) {
            return new NDArray([array.length], array);
        }
        return new NDArray(dim, array);
    }
}

function checkIfArrayIsLinear(array) {
    return array.length > 0 && array[0].length === undefined;
}

function buildDenseFromArray(array) {
    const dim = findArrayDim(array);
    const ans = unpackArray(array);
    return NDArray.of(ans, dim);
}

function computePowers(dim) {
    const powers = new Array(dim.length + 1);
    powers[dim.length] = 1;
    for (let i = dim.length - 1; i >= 0; i--) {
        powers[i] = powers[i + 1] * dim[i];
    }
    return powers;
}

function auxBroadCast(a, b) {
    if (a == b) return a;
    if (a == 1 || b == 1) return a * b;
    throw "values are not one and they are different ";
}


/**
 *  Get the index of a coordinate in a dense array, taking into account broadcasting.
 *  (NDArray, number[]) => number[]
 */
function getBroadCastIndex(dense, coord) {
    const shape = dense.shape();
    const ans = [];
    for (let i = 0; i < shape.length; i++) {
        ans.unshift(
            shape[shape.length - 1 - i] === 1 ?
                0 :
                coord[coord.length - 1 - i]
        );
    }
    // if shape is empty (0-dim array) => ans is empty need to add trivial value
    return ans.length === 0 ? ans.concat(0) : ans;
}

/**
 *  Test if linear arrays are equal
 *  (array, array) => boolean
 */
function arrayEquals(a1, a2) {
    if (!(a1 instanceof Array)) return false;
    if (!(a2 instanceof Array)) return false;
    if (a1.length !== a2.length) return false;
    for (let i = 0; i < a1.length; i++) {
        if (a1[i] !== a2[i]) return false;
    }
    return true;
}

/**
 *  Find the dimension of a nested array
 *  (array) => number[]
 */
function findArrayDim(array) {
    if (array instanceof Array) {
        return [array.length].concat(findArrayDim(array[0]));
    }
    return [];
}

/**
 *  Unpack a nested array into a linear array
 *  (array) => array
 */
function unpackArray(array) {
    if (!(array instanceof Array)) return [array];
    let joinIdentity = [];
    for (let i = 0; i < array.length; i++) {
        joinIdentity = joinIdentity.concat(unpackArray(array[i]));
    }
    return joinIdentity;
}

/**
 *  Apply a binary operation element-wise to two arrays
 *  (array, array, function) => array
 */
function arrayBinOp(array1, array2, binaryOp) {
    const smaller =
        array1.length < array2.length ? array1.slice() : array2.slice();
    for (let i = 0; i < smaller.length; i++)
        smaller[i] = binaryOp(array1[i], array2[i]);
    return smaller;
}