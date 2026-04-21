import { List } from "../List";
import { Maybe } from "../Maybe";
import { Pair } from "../Pair";

const hash_str = (s) => {
    let hash = 0;
    let prime = 1;
    for (let i = 0; i < s.length; i++) {
        hash = hash + s.charCodeAt(i) * prime;
        prime = prime * 31;
    }
    return hash;
}

class DynamicArray {
    constructor() {
        this.capacity = 7;
        this.length = 0;
        this.elements = new Array(this.capacity);
    }

    size() {
        return this.length;
    }

    isEmpty() {
        return this.length === 0;
    }

    _resize(newCapacity) {
        const newElements = new Array(newCapacity);
        for (let i = 0; i < this.length; i++) {
            newElements[i] = this.elements[i];
        }
        this.elements = newElements;
        this.capacity = newCapacity;
    }

    set(index, value) {
        if (index < 0 || index >= this.capacity) {
            this._resize(Math.max(this.capacity * 2, index + 1));
        }
        if (this.elements[index] === undefined) {
            this.length++;
        }
        this.elements[index] = value;
        return this;
    }

    get(index) {
        if (index < 0 || index >= this.capacity) return Maybe.none();
        return Maybe.of(this.elements[index]);
    }

    del(index) {
        if (index < 0 || index >= this.capacity) return this;
        this.elements[index] = undefined;
        this.length--;
        if (this.length <= this.capacity / 4) {
            this._resize(Math.max(7, Math.floor(this.capacity / 2)));
        }
        return this;
    }
}


export class HashMap {

    constructor(hashFun = hash_str) {
        this.hashFun = hashFun;
        this.map = new DynamicArray(); // Array of List<Pair(key, value)> for collision resolution
        this.length = 0;
    }

    hash(key) {
        return this.hashFun(key) % this.map.capacity;
    }

    isEmpty() {
        return this.map.isEmpty();
    }

    size() {
        return this.length;
    }

    get(key) {
        const hash = this.hash(key);
        let maybeList = this.map.get(hash)
        maybeList = maybeList.filter(list => list.some(pair => pair.left() === key)) // filter maybe by verifying the key exists in the list
        maybeList = maybeList.map(list => list.filter(pair => pair.left() === key)) // retrieve the list and filter it to get the pair with the matching key
        const maybeValue = maybeList.map(list => list.head.right()); 
        return maybeValue;
    }

    put(key, value) {
        if(!this.has(key)) {
            this.length++;
        }
        const hash = this.hash(key);
        const list = this.map.get(hash).orElse(() => new List());
        list.push(Pair.of(key, value));
        this.map.set(hash, list);
        return this;
    }

    del(key) {
        if(this.has(key)) {
            this.length--;
        } else {
            return this;
        }
        const hash = this.hash(key);
        let list = this.map.get(hash).orElse(() => new List());
        list = list.filter(pair => pair.left() !== key);
        this.map.set(hash, list);
        return this;
    }

    has(key) {
        const hash = this.hash(key);
        return this.map.get(hash).map(list => list.some(pair => pair.left() === key)).orElse(() => false);
    }
}