import { Pair } from "../Pair/index.js";

const NATIVE_ARRAY = globalThis.Array;
const INITIAL_CAPACITY = 7;
export class Array {
    constructor(capacity = INITIAL_CAPACITY) {
        this.length = 0;
        this.capacity = capacity;
        this.elements = new NATIVE_ARRAY(capacity);
    }

    size() {
        return this.length;
    }
    
    get(index) {
        return this.elements[index];
    }

    set(index, value) {
        if(index < 0 || index >= this.length) return this;
        this.elements[index] = value;
        return this;
    }

    _resize(newCapacity) {
        const newElements = new NATIVE_ARRAY(newCapacity);
        for (let i = 0; i < this.length; i++) {
            newElements[i] = this.elements[i];
        }
        this.elements = newElements;
        this.capacity = newCapacity;
    }

    push(elem) {
        if (this.length >= this.capacity) {
            this._resize(this.capacity * 2);
        }
        this.elements[this.length] = elem;
        this.length++;
        return this;
    }

    pop() {
        if (this.length === 0) return;
        this.length--;
        if (this.length <= this.capacity / 4) {
            this._resize(Math.max(INITIAL_CAPACITY, Math.floor(this.capacity / 2)));
        }
        return this.elements[this.length];
    }

    map(lambda) {
        const newArray = new Array(this.capacity);
        for (let i = 0; i < this.length; i++) {
            newArray.elements[i] = lambda(this.elements[i], i);
        }
        newArray.length = this.length;
        return newArray;
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

    fold(initial, lambda) {
        let accumulator = initial;
        for (let i = 0; i < this.length; i++) {
            accumulator = lambda(accumulator, this.elements[i]);
        }
        return accumulator;
    }

    reduce(lambda, initial) {
        let accumulator = initial;
        for (let i = 0; i < this.length; i++) {
            accumulator = lambda(accumulator, this.elements[i]);
        }
        return accumulator;
    }

    zip(otherArray) {
        const newArray = new Array(Math.min(this.length, otherArray.length));
        for (let i = 0; i < newArray.length; i++) {
            newArray.elements[i] = Pair.of(this.elements[i], otherArray.get(i));
        }
        newArray.length = newArray.capacity;
        return newArray;
    }
    
    toArray() {
        return this.elements.slice(0, this.length);
    }

    toString() {
        return `[${this.toArray().join(", ")}]`
    }


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
}