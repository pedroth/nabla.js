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

    isEmpty() {
        return this.head == null && this.tail == null;
    }

    size() {
        return this.isEmpty() ? 0 : 1 + this.tail.size()
    }

    get(k) {
        if (this.isEmpty()) return Maybe.none();
        if (k <= 0) return Maybe.of(this.head);
        return this.tail.get(k - 1);
    }

    set(k, x) {
        if (this.isEmpty()) return this;
        if (k <= 0) {
            this.head = x;
            return this;
        }
        this.tail.set(k - 1, x);
        return this;
    }

    push(x) {
        // !! Mutation !!
        if (this.isEmpty()) {
            this.head = x;
            this.tail = new List();
            return this;
        }
        this.tail.push(x);
        return this;
    }

    pop() {
        // !! Mutation !!
        if (this.isEmpty()) return Maybe.none();
        if (this.tail.isEmpty()) {
            const ans = this.head;
            this.head = undefined;
            this.tail = undefined;
            return Maybe.of(ans);
        }
        return this.tail.pop();
    }

    map(f) {
        if (this.isEmpty()) return this;
        return new List(f(this.head), this.tail.map(f))
    }
    
    filter(predicate) {
        if (this.isEmpty()) return this;
        return predicate(this.head) ?
            new List(this.head, this.tail.filter(predicate)) :
            this.tail.filter(predicate);
    }

    // flatMap: List(a) => (a => List(b)) => List(b)
    flatMap(f = x => x) {
        if (this.isEmpty()) return this;
        return f(this.head).union(this.tail.flatMap(f));
    }

    fold(initial, f) {
        if (this.isEmpty()) return initial;
        return this.tail.fold(f(initial, this.head), f)
    }

    union(list) {
        if(list.isEmpty()) return this;
        if(this.isEmpty()) return list;
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

    toArray() {
        if (this.isEmpty()) return []
        return this.tail.isEmpty() ? [this.head] : [this.head, ...this.tail.toArray()];
    }

    equals(list) {
        if (this.isEmpty() && list.isEmpty()) return true;
        return (this.head === list.head || this.head.equals(list.head)) && this.tail.equals(list.tail);
    }

    toString() {
        return `[${this.toArray()}]`
    }

    static of(...arr) {
        let ans = new List();
        arr.forEach(x => ans = ans.push(x));
        return ans;
    }

    static fromArray(arr) {
        const ans = new List();
        for (let i = 0; i < arr.length; i++) {
            ans.add(arr[i]);
        }
        return ans;
    }

    static range(init = 0, end = 0) {
        if (init + 1 > end) return new List();
        return new List().add(init).union(List.range(init + 1, end));
    }
}

