import { Maybe } from "../Maybe/index.js";
import { Pair } from "../Pair/index.js";
import { Tuple } from "../Tuple/index.js";

const NATIVE_ARRAY = globalThis.Array;
const INITIAL_CAPACITY = 7;

/**
 *  Continuous array implementation with dynamic resizing.
 */
export class Array {
    constructor(capacity = INITIAL_CAPACITY) {
        this.length = 0;
        this.capacity = capacity;
        this.elements = new NATIVE_ARRAY(capacity);
    }

    // ========== Core State Operations ==========

    isEmpty() {
        return this.length === 0;
    }

    size() {
        return this.length;
    }

    // ========== Access Operations ==========

    get(index) {
        if (this.isEmpty()) return Maybe.none();
        if (index <= 0) return Maybe.some(this.elements[0]);
        return Maybe.some(this.elements[index]);
    }

    set(index, value) {
        if (this.isEmpty()) return this;
        if (index <= 0) return this;
        this.elements[index] = value;
        return this;
    }

    // ========== Stack Operations ==========

    // Array => elem => Array
    push(elem) {
        // !! Mutation !!
        if (this.length >= this.capacity) {
            this._resize(this.capacity * 2);
        }
        this.elements[this.length] = elem;
        this.length++;
        return this;
    }

    // Array => () => Maybe(elem)
    pop() {
        // !! Mutation !!
        if (this.isEmpty()) return Maybe.none();
        this.length--;
        const value = this.elements[this.length];
        if (this.length <= this.capacity / 4) {
            this._resize(Math.max(INITIAL_CAPACITY, Math.floor(this.capacity / 2)));
        }
        return Maybe.some(value);
    }

    // ========== Functional/Monadic Operations ==========

    // Array => (elem => elem) => Array
    map(lambda) {
        const newArray = new Array(this.capacity);
        for (let i = 0; i < this.length; i++) {
            newArray.elements[i] = lambda(this.elements[i], i);
        }
        newArray.length = this.length;
        return newArray;
    }

    forEach(lambda) {
        for (let i = 0; i < this.length; i++) {
            lambda(this.elements[i], i);
        }
    }

    filter(predicate) {
        const newArray = new Array(this.capacity);
        for (let i = 0; i < this.length; i++) {
            if (predicate(this.elements[i], i)) {
                newArray.push(this.elements[i]);
            }
        }
        return newArray;
    }

    flatMap(lambda = x => x) {
        let newArray = new Array(this.capacity);
        for (let i = 0; i < this.length; i++) {
            const mapped = lambda(this.elements[i]);
            newArray = newArray.union(mapped);
        }
        return newArray;
    }

    fold(initial, folder) {
        let accumulator = initial;
        for (let i = 0; i < this.length; i++) {
            accumulator = folder(accumulator, this.elements[i]);
        }
        return accumulator;
    }

    some(predicate) {
        for (let i = 0; i < this.length; i++) {
            if (predicate(this.elements[i])) {
                return true;
            }
        }
        return false;
    }

    // ========== Array Combination Operations ==========

    union(otherArray) {
        const newArray = new Array(this.length + otherArray.length);
        for (let i = 0; i < this.length; i++) {
            newArray.elements[i] = this.elements[i];
        }
        for (let i = 0; i < otherArray.length; i++) {
            newArray.elements[this.length + i] = otherArray.get(i).orElse();
        }
        newArray.length = this.length + otherArray.length;
        return newArray;
    }

    zip(otherArray) {
        const newArray = new Array(Math.min(this.length, otherArray.length));
        for (let i = 0; i < newArray.capacity; i++) {
            newArray.elements[i] = Pair.of(this.elements[i], otherArray.get(i).orElse());
        }
        newArray.length = newArray.capacity;
        return newArray;
    }

    prod(otherArray) {
        if (this.isEmpty() || otherArray.isEmpty()) return new Array();
        return this.map(x => {
            return otherArray.map(y => {
                if (x instanceof Tuple && y instanceof Tuple) {
                    return x.union(y)
                }
                if (x instanceof Tuple && !(y instanceof Tuple)) {
                    return x.add(y)
                }
                return Tuple.of(x, y)

            });
        }).flatMap();
    }

    // ========== Sorting & Transformation ==========

    sort(comparator = (a, b) => a - b) {
        // !! Mutation !!
        const n = this.elements.length;
        const v = this.elements;
        const stack = [];
        stack.push(0);
        stack.push(n - 1);
        while (stack.length > 0) {
            const high = stack.pop();
            const low = stack.pop();
            /*
             * partition
             */
            if (low < high) {
                const pivot = low + Math.floor((high - low) * Math.random());
                const pivotValue = v[pivot];
                this.swap(pivot, high);
                let j = low;
                for (let i = low; i < high; i++) {
                    if (comparator(v[i], pivotValue) <= 0) {
                        this.swap(i, j);
                        j++;
                    }
                }
                this.swap(j, high);
                // stack recursion
                stack.push(low);
                stack.push(j - 1);
                stack.push(j + 1);
                stack.push(high);
            }
        }
        return this;
    }

    reverse() {
        const newArray = new Array(this.capacity);
        for (let i = 0; i < this.length; i++) {
            newArray.elements[i] = this.elements[this.length - 1 - i];
        }
        newArray.length = this.length;
        return newArray;
    }

    swap(i, j) {
        const temp = this.elements[i];
        this.elements[i] = this.elements[j];
        this.elements[j] = temp;
    }

    // ========== Element Removal ==========

    del(index) {
        if (this.isEmpty()) return this;
        if (index < 0 || index >= this.length) return this;
        for (let i = index; i < this.length - 1; i++) {
            this.elements[i] = this.elements[i + 1];
        }
        this.length--;
        if (this.length <= this.capacity / 4) {
            this._resize(Math.max(INITIAL_CAPACITY, Math.floor(this.capacity / 2)));
        }
        return this;
    }

    // ========== Iteration ==========

    iterator() {
        let index = 0;
        return {
            next: () => {
                if (index >= this.length) return Maybe.none();
                return Maybe.of(this.elements[index++]);
            }
        };
    }

    // ========== Conversion & Comparison ==========

    toArray() {
        return this.elements.slice(0, this.length);
    }

    equals(otherArray) {
        if (this.length !== otherArray.length) return false;
        for (let i = 0; i < this.length; i++) {
            const a = this.elements[i];
            const b = otherArray.get(i).orElse(undefined);
            if (a !== b && !(typeof a?.equals === 'function' && a.equals(b))) {
                return false;
            }
        }
        return true;
    }

    toString() {
        return `[${this.toArray().join(", ")}]`
    }

    // ========== Internal/Private Methods ==========

    _resize(newCapacity) {
        const newElements = new NATIVE_ARRAY(newCapacity);
        for (let i = 0; i < this.length; i++) {
            newElements[i] = this.elements[i];
        }
        this.elements = newElements;
        this.capacity = newCapacity;
    }

    // ========== Static Factory Methods ==========

    static of(...elements) {
        const array = new Array(elements.length);
        for (let i = 0; i < elements.length; i++) {
            array.elements[i] = elements[i];
        }
        array.length = elements.length;
        return array;
    }

    static fromArray(nativeArray) {
        const array = new Array(nativeArray.length);
        for (let i = 0; i < nativeArray.length; i++) {
            array.elements[i] = nativeArray[i];
        }
        array.length = nativeArray.length;
        return array;
    }

    static range(init = 0, end = 0) {
        const array = new Array(end - init);
        for (let i = 0; i < end - init; i++) {
            array.elements[i] = init + i;
        }
        array.length = end - init;
        return array;
    }
}