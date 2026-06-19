import { Maybe } from "../Maybe/index.js";
import { Tuple } from "../Tuple/index.js";

/**
 * S(a) := {} | {a} ∪ S(a)
 *
 * Immutable linked set with structural equality support.
 */
export class Set {
    constructor(head, tail) {
        this.equality = (x, y) => x === y || (x?.equals && x.equals(y));
        this.head = head;
        this.tail = tail;
    }

    // ==========================================================
    // Non-mutating Operations (return new values, leave this intact)
    // ==========================================================

    // ========== Query ==========

    isEmpty() {
        return this.head == null && this.tail == null; // == on purpose
    }

    size() {
        if (this.isEmpty()) return 0;
        return 1 + this.tail.size();
    }

    contains(x) {
        if (this.isEmpty()) return false;
        if (this.equality(this.head, x)) return true;
        return this.tail.contains(x);
    }

    isSubSet(set) {
        return this.map(x => set.contains(x)).fold(true, (e, x) => e && x);
    }

    equals(set) {
        if (!(set instanceof Set)) return false;
        return this.isSubSet(set) && set.isSubSet(this);
    }

    // ========== Combination ==========

    add(x) {
        if (this.isEmpty()) return new Set(x, new Set())
        if (this.equality(this.head, x)) return this;
        return new Set(this.head, this.tail.add(x), this.equality);
    }

    union(set) {
        if (set.isEmpty()) return this;
        return this.add(set.head).union(set.tail);
    }

    intersection(set) {
        return this.filter(x => set.contains(x));
    }

    prod(set) {
        if (this.isEmpty()) return this;
        if (set.isEmpty()) return set;
        return this.map(x => {
            return set.map(y => {
                if (x instanceof Tuple && y instanceof Tuple) {
                    return x.join(y)
                }
                if (x instanceof Tuple && !(y instanceof Tuple)) {
                    return x.add(y)
                }
                return Tuple.of(x, y)
            })
        }).flatMap(x => x);
    }

    // ========== Functional/Monadic ==========

    filter(predicate) {
        if (this.isEmpty()) return this;
        if (predicate(this.head)) return new Set(this.head, this.tail.filter(predicate))
        return this.tail.filter(predicate);
    }

    map(lambda) {
        if (this.isEmpty()) return this;
        return new Set(lambda(this.head), this.tail.map(lambda));
    }

    forEach(lambda) {
        if (this.isEmpty()) return;
        lambda(this.head);
        this.tail.forEach(lambda);
    }

    flatMap(lambda = x => x) {
        if (this.isEmpty()) return this;
        return lambda(this.head).union(this.tail.flatMap(lambda));
    }

    fold(init, folder) {
        if (this.isEmpty()) return init;
        return this.tail.fold(folder(init, this.head), folder);
    }

    // ========== Conversion & Comparison ==========

    toArray() {
        if (this.isEmpty()) return [];
        return [this.head, ...this.tail.toArray()];
    }

    toString() {
        return `{${this.toArray()}}`
    }

    toLatex() {
        return `\\{${this.toArray()}\\}`
    }

    // ========== Iteration ==========

    iterator() {
        let current = this;
        return {
            next: () => {
                if (current.isEmpty()) return Maybe.none();
                const ans = current.head;
                current = current.tail;
                return Maybe.of(ans);
            }
        }
    }

    // ==========================================================
    // Static Factory Methods
    // ==========================================================

    static of(...args) {
        let ans = Set.EMPTY;
        for (let i = 0; i < args.length; i++) {
            ans = ans.add(args[i]);
        }
        return ans;
    }

    static fromArray(array) {
        const ans = Set.EMPTY;
        for (let i = 0; i < array.length; i++) {
            ans.add(array[i]);
        }
        return ans;
    }

    static range(init = 0, end = 0) {
        if (init + 1 > end) return Set.EMPTY;
        return (Set.EMPTY.add(init)).union(Set.range(init + 1, end));
    }

    static powerSet(set) {
        function powerSetAux(set, acc = Set.EMPTY) {
            if (set.isEmpty()) return acc;
            return Set.of(
                powerSetAux(set.tail, Set.of(set.head).union(acc)),
                powerSetAux(set.tail, acc)
            )
        }
        const n = set.size();
        let acc = powerSetAux(set);
        for (let index = 0; index < n - 1; index++) {
            acc = acc.flatMap();
        }
        return acc;
    }

    static EMPTY = new Set()

}
