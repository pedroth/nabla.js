import { Tuple } from "../Tuple/index.js";
import { Maybe } from "../Maybe/index.js";
import { Pair } from "../Pair/index.js";

/**
 * L(a):= () | (a, L(a))
 */
export class List {
    constructor(head, tail) {
        this.head = head;
        this.tail = tail;
    }

    // ==========================================================
    // Non-mutating Operations (return new values, leave this intact)
    // ==========================================================

    // ========== Query ==========

    isEmpty() {
        return this.head == null && this.tail == null;
    }

    size() {
        return this.isEmpty() ? 0 : 1 + this.tail.size()
    }

    get(index) {
        if (this.isEmpty()) return Maybe.none();
        if (index <= 0) return Maybe.of(this.head);
        return this.tail.get(index - 1);
    }

    // ========== Functional/Monadic ==========

    map(lambda) {
        if (this.isEmpty()) return this;
        return new List(lambda(this.head), this.tail.map(lambda))
    }

    forEach(lambda) {
        if (this.isEmpty()) return;
        lambda(this.head);
        this.tail.forEach(lambda);
    }

    filter(predicate) {
        if (this.isEmpty()) return this;
        return predicate(this.head) ?
            new List(this.head, this.tail.filter(predicate)) :
            this.tail.filter(predicate);
    }

    // flatMap: List(a) => (a => List(b)) => List(b)
    flatMap(lambda = x => x) {
        if (this.isEmpty()) return this;
        return lambda(this.head).union(this.tail.flatMap(lambda));
    }

    fold(initial, folder) {
        if (this.isEmpty()) return initial;
        return this.tail.fold(folder(initial, this.head), folder)
    }

    some(predicate) {
        if (this.isEmpty()) return false;
        if (predicate(this.head)) return true;
        return this.tail.some(predicate);
    }

    // ========== Combination ==========

    union(list) {
        if (list.isEmpty()) return this;
        if (this.isEmpty()) return list;
        return new List(this.head, this.tail.union(list));
    }

    zip(list) {
        if (this.isEmpty() || list.isEmpty()) return new List();
        return new List(Pair.of(this.head, list.head), this.tail.zip(list.tail));
    }

    prod(list) {
        if (this.isEmpty()) return this;
        if (list.isEmpty()) return list;
        return this.map(x => {
            return list.map(y => {
                if (x instanceof Tuple && y instanceof Tuple) {
                    return x.union(y)
                }
                if (x instanceof Tuple && !(y instanceof Tuple)) {
                    return x.add(y)
                }
                return Tuple.of(x, y)
            })
        }).flatMap()
    }

    slice(start = 0, end = this.size()) {
        if (end <= start) return new List();
        if (this.isEmpty()) return this;
        if (start <= 0) return new List(this.head, this.tail.slice(0, end - 1));
        // need to change both index, because end is relative to the beginning of the list.
        return this.tail.slice(start - 1, end - 1); 
    } 

    // ========== Transformation ==========

    sort(comparator = (a, b) => a - b) {
        if (this.isEmpty()) return this;
        const pivot = this.head;
        const lessThanPivot = this.tail.filter(x => comparator(x, pivot) < 0).sort(comparator);
        const greaterThanPivot = this.tail.filter(x => comparator(x, pivot) >= 0).sort(comparator);
        return lessThanPivot.union(new List(pivot, greaterThanPivot));
    }

    reverse() {
        if (this.isEmpty()) return this;
        return this.tail.reverse().union(List.of(this.head));
    }

    // ========== Iteration ==========

    iterator() {
        let current = this;
        return {
            next() {
                if (current.isEmpty()) return Maybe.none();
                const ans = current.head;
                current = current.tail;
                return Maybe.of(ans);
            }
        };
    }

    // ========== Conversion & Comparison ==========

    toArray() {
        if (this.isEmpty()) return []
        return this.tail.isEmpty() ? [this.head] : [this.head, ...this.tail.toArray()];
    }

    equals(list) {
        if (this.isEmpty() && list.isEmpty()) return true;
        const firstEquals = this.head === list.head || (typeof this.head?.equals === 'function' && this.head.equals(list.head));
        return firstEquals && this.tail.equals(list.tail);
    }

    toString() {
        return `[${this.toArray()}]`
    }

    // ==========================================================
    // Mutating Operations (modify this in place)
    // ==========================================================

    set(index, value) {
        if (this.isEmpty()) return this;
        if (index <= 0) {
            this.head = value;
            return this;
        }
        this.tail.set(index - 1, value);
        return this;
    }

    push(value) {
        if (this.isEmpty()) {
            this.head = value;
            this.tail = new List();
            return this;
        }
        this.tail.push(value);
        return this;
    }

    pop() {
        if (this.isEmpty()) return Maybe.none();
        if (this.tail.isEmpty()) {
            const ans = this.head;
            this.head = undefined;
            this.tail = undefined;
            return Maybe.of(ans);
        }
        return this.tail.pop();
    }

    del(index) {
        if (this.isEmpty()) return this;
        if (index <= 0) {
            this.head = this.tail.head;
            this.tail = this.tail.tail;
            return this;
        }
        this.tail.del(index - 1);
        return this;
    }

    // ==========================================================
    // Static Factory Methods
    // ==========================================================

    static of(...elements) {
        let ans = new List();
        elements.forEach(x => ans = ans.push(x));
        return ans;
    }

    static fromArray(nativeArray) {
        const ans = new List();
        for (let i = 0; i < nativeArray.length; i++) {
            ans.push(nativeArray[i]);
        }
        return ans;
    }

    static range(init = 0, end = 0) {
        if (init + 1 > end) return new List();
        return new List().push(init).union(List.range(init + 1, end));
    }
}

