import { List } from "../List/index.js";
import { Maybe } from "../Maybe/index.js";
import { Pair } from "../Pair/index.js";

const hash_str = (s) => {
    let hash = 0;
    let prime = 1;
    for (let i = 0; i < s.length; i++) {
        hash = hash + s.charCodeAt(i) * prime;
        prime = prime * 31;
    }
    return hash;
}


const INITIAL_CAPACITY = 7;

export class HashMap {

    constructor(hashFun = hash_str) {
        this.hashFun = hashFun;
        this.capacity = INITIAL_CAPACITY; // Initial capacity of the underlying array
        this.map = new Array(this.capacity); // Array of List<Pair(key, value)> for collision resolution
        this.length = 0;
    }

    // ========== Core State Operations ==========

    isEmpty() {
        return this.length === 0;
    }

    size() {
        return this.length;
    }

    // ========== Hash Utility ==========

    hash(key) {
        return this.hashFun(key) % this.capacity;
    }

    // ========== Read Operations ==========

    get(key) {
        const hash = this.hash(key);
        let maybeList = Maybe.of(this.map[hash])
        maybeList = maybeList.filter(list => list.some(pair => pair.left() === key)) // filter maybe by verifying the key exists in the list
        maybeList = maybeList.map(list => list.filter(pair => pair.left() === key)) // retrieve the list and filter it to get the pair with the matching key
        const maybeValue = maybeList.map(list => list.head.right());
        return maybeValue;
    }

    has(key) {
        const hash = this.hash(key);
        return Maybe.of(this.map[hash]).map(list => list.some(pair => pair.left() === key)).orElse(() => false);
    }

    getEntries() {
        const entries = new Array(this.length);
        for (let i = 0; i < this.length; i++) {
            const maybeList = Maybe.of(this.map[i]);
            maybeList.forEach(list => list.fold(null, (_, pair) => entries.push(pair)));
        }
        return entries;
    }

    // ========== Write Operations ==========

    put(key, value) {
        if (!this.has(key)) {
            this.length++;
            this._resizeIfNeeded();
        }
        const hash = this.hash(key);
        const list = Maybe.of(this.map[hash]).orElse(() => new List());
        list.push(Pair.of(key, value));
        this.map[hash] = list;
        return this;
    }

    del(key) {
        if (this.has(key)) {
            this.length--;
            this._resizeIfNeeded();
        } else {
            return this;
        }
        const hash = this.hash(key);
        Maybe.of(this.map[hash])
        .forEach(list => {
            let filteredList = list.filter(pair => pair.left() !== key);
            this.map[hash] = filteredList;
        });
        return this;
    }

    _resizeIfNeeded() {
        const loadFactor = this.length / this.capacity;
        if (loadFactor > 0.7) {
            this._resize(this.capacity * 2);
        } else if (loadFactor < 0.2 && this.capacity > INITIAL_CAPACITY) {
            this._resize(Math.floor(this.capacity / 2));
        }
    }

    _resize(newCapacity) {
        const oldMap = this.map;
        this.capacity = newCapacity;
        this.map = new Array(this.capacity);
        this.length = 0;
        for(let i = 0; i < oldMap.length; i++) {
            const maybeList = Maybe.of(oldMap[i]);
            maybeList.forEach(list => list.forEach(pair => this.put(pair.left(), pair.right())));
        }
    }
}