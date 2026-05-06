import { ArrayUtils } from "../ArrayUtils/index.js";
import { Pair } from "../Pair/index.js";

/**
 * N-dimensional array implementation in column major order.
 */
export class NDArray {
    constructor(dim, array) {
        this.dim = dim;
        // column major array
        this.array = [];
        this.powers = computePowers(dim);

        if (array === undefined) {
            for (let i = 0; i < this.powers[this.powers.length - 1]; i++) {
                this.array[i] = null;
            }
        } else {
            if (array.length != this.powers[this.powers.length - 1]) {
                throw `Shape/dim doesn't agree with size ${dim}`;
            }
            this.array = array.slice();
        }
    }

    // ========== Core State Operations ==========

    // NDArray => () => number
    size() {
        return this.powers[this.powers.length - 1];
    }

    // NDArray => () => number[]
    shape() {
        return this.dim;
    }

    // ========== Access Operations ==========

    // NDArray => (number[] | string | number) => NDArray | scalar
    get(x) {
        if (x == null) return this.array[0];
        if (typeof x == "number") return this.get([x]);
        if (x.constructor === Array) {
            this.checkIfIndexOutOfBounds(x);
            this.checkIfCoordSizeCompatible(x.length);
            return this.array[this.getIndex(x)];
        }
        if (x.constructor === String) {
            const intervals = this.getIntervalFromStr(x);
            const newDim = this.computeNewDim(intervals);

            // string doesn't have any range
            if (newDim.length == 0) {
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
                let k = 0;
                for (let j = 0; j < intervals.length; j++) {
                    const index = Math.floor((i % powers[k + 1]) / powers[k]);
                    y[j] = intervals[j][0] + index;
                    k++;
                }
                newNDArray.array[i] = this.get(y);
            }
            return newNDArray;
        }
        throw "method 'get' only accepts strings and integer arrays";
    }

    // NDArray => (number[] | string, scalar | NDArray) => NDArray
    set(x, value) {
        if (typeof x == "number" && value.constructor !== Array) {
            return this.set([x], value);
        }
        if (x.constructor === Array && value.constructor !== Array) {
            this.checkIfIndexOutOfBounds(x);
            this.checkIfCoordSizeCompatible(x.length);
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
                let k = 0;
                for (let j = 0; j < intervals.length; j++) {
                    const index = Math.floor((i % powers[k + 1]) / powers[k]);
                    y[j] = intervals[j][0] + index;
                    k++;
                }
                this.set(y, value.array[i]);
            }
            return this;
        }
        throw "set only accepts strings and integer arrays as the first argument and objects and NDArray as the second";
    }

    // ========== Functional/Monadic Operations ==========

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
                coord[j] = Math.floor((i % powers[j + 1]) / powers[j]);
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

    // NDArray => (scalar => void) => void
    forEach(f) {
        this.array.forEach(f);
    }

    // ========== Transformation Operations (in-place) ==========

    // NDArray => (scalar => scalar) => NDArray  !! Mutation !!
    transform(f) {
        const size = this.size();
        for (let i = 0; i < size; i++) {
            this.array[i] = f(this.array[i]);
        }
        return this;
    }

    // NDArray => ((scalar, number[]) => scalar) => NDArray  !! Mutation !!
    transformWithIndex(f) {
        const size = this.size();
        const dim = this.dim;
        const powers = this.powers;
        const coord = [];
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < dim.length; j++) {
                coord[j] = Math.floor((i % powers[j + 1]) / powers[j]);
            }
            this.array[i] = f(this.array[i], coord);
        }
        return this;
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
            for (let j = 0; j < this.dim[this.dim.length - 1 - size]; j++) {
                array.push(this.toArrayRecursive([j].concat(coord)));
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
            for (let j = 0; j < this.dim[this.dim.length - 1 - size]; j++) {
                stringBuilder.push(this.toStringRecursive([j].concat(coord)));
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
            ArrayUtils.arrayEquals(this.array, o.array) &&
            ArrayUtils.arrayEquals(this.powers, o.powers) &&
            ArrayUtils.arrayEquals(this.dim, o.dim)
        );
    }

    // ========== Internal/Private Methods ==========

    getIndex(x) {
        let index = 0;
        const size = Math.min(x.length, this.dim.length);
        // this strange loop is for the case where |x| < |dim|
        for (let i = 0; i < size; i++) {
            index += x[x.length - i - 1] * this.powers[this.dim.length - i - 1];
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
                            "" == intervalBounds[0] ? 0 : parseInt(intervalBounds[0])
                        )
                    );
                    const xmax = Math.max(
                        0,
                        Math.min(
                            this.dim[i] - 1,
                            "" == intervalBounds[1] ? this.dim[i] - 1 : parseInt(intervalBounds[1])
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
        const isZeroDimOutOfBounds = this.dim.length == 0 && coord[0] > 0;
        const isOutOfBounds =
            this.dim.length != 0 &&
            ArrayUtils.binaryOp(coord, this.dim, (x, y) => (x >= 0 && x < y ? 0 : 1)).reduce(
                (e, x) => e + x,
                0
            ) > 0;
        if (isZeroDimOutOfBounds || isOutOfBounds) {
            throw `index out of bounds ${coord}, actual shape is ${this.dim}`;
        }
    }

    checkIfCoordSizeCompatible(size) {
        if (this.dim.length != 0 && size > this.dim.length) {
            throw `Size dimension incorrect : ${size}. Correct size dimension should be less or equal ${this.dim.length}`;
        }
    }

    // ========== Array Combination Operations ==========

    // NDArray => (NDArray, scalar, (scalar, scalar, scalar) => scalar) => NDArray | scalar
    // Contracts last dim of this with first dim of otherArray via fold(accumulator, a, b).
    // Defaults to matrix multiplication: fold = (e, x, y) => e + x * y.
    prod(otherArray, initial = 0, fold = (e, x, y) => e + x * y) {
        const s1 = this.dim;
        const s2 = otherArray.dim;
        const k = s1[s1.length - 1];
        if (s2[0] !== k) {
            throw `prod: last dim of left (${k}) must equal first dim of right (${s2[0]})`;
        }
        const outDim = s1.slice(0, -1).concat(s2.slice(1)); // output dim is all but last of s1 and all but first of s2
        // 1D dot product → scalar
        if (outDim.length === 0) {
            let acc = initial;
            for (let l = 0; l < k; l++) acc = fold(acc, this.get([l]), otherArray.get([l]));
            return acc;
        }
        const nLeft = s1.length - 1;
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

    // NDArray => (NDArray, (scalar, scalar) => scalar) => NDArray
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

    // ========== Sorting & Transformation ==========

    // NDArray => (number[]) => NDArray
    reshape(newShape) {
        return NDArray.of(this, newShape);
    }

    // ========== Static Factory Methods ==========

    // (NDArray | scalar[] | nested array, number[]?) => NDArray
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
    const dim = ArrayUtils.findArrayDim(array);
    const ans = ArrayUtils.unpackArray(array);
    return NDArray.of(ans, dim);
}

function computePowers(dim) {
    const powers = [];
    let acc = 1;
    powers[0] = acc;
    for (let i = 0; i < dim.length; i++) {
        acc *= dim[i];
        powers[i + 1] = acc;
    }
    return powers;
}

function auxBroadCast(a, b) {
    if (a == b) return a;
    if (a == 1 || b == 1) return a * b;
    throw "values are not one and they are different ";
}

function getBroadCastIndex(dense, coord) {
    const shape = dense.shape();
    const ans = [];
    for (let i = 0; i < shape.length; i++) {
        ans.unshift(
            shape[shape.length - 1 - i] == 1 ? 0 : coord[coord.length - 1 - i]
        );
    }
    // if shape is empty (0-dim array) => ans is empty need to add trivial value
    return ans.length == 0 ? ans.concat(0) : ans;
}


