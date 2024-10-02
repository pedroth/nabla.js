import { Tuple } from "../Tuple";

/**
 * L<x> -> [] | [x, L<x>]
 */
export class List {
    constructor(head, tail) {
        this._head = head;
        this._tail = tail;
    }

    isEmpty() {
        return !this._head && !this._tail;
    }

    head() {
        return this._head;
    }

    tail() {
        if (this.isEmpty()) return this;
        return this._tail;
    }

    get(k) {
        if(k <= 0) return this.head();
        return this.tail().get(k - 1);
    }

    map(f) {
        return this.isEmpty() ? 
            this :
            new List(f(this.head()), this.tail().map(f));
    }

    flatMap(f = x => x) {
        if (this.isEmpty()) return this;
        const flatted = f(this.head());
        if (flatted.isEmpty()) return this.tail().flatMap(f);
        return new List(flatted.head(), flatted.tail().concat(this.tail().flatMap(f)));
    }

    fold(initial, f) {
        return this.isEmpty() ?
            initial :
            f(initial, this.tail().fold(initial, f));
    }

    filter(predicate) {
        return this.isEmpty() ?
            this :
            predicate(this.head()) ?
                new List(this.head(), this.tail().filter(predicate)) :
                this.tail().filter(predicate);
    }

    concat(list) {
        return this.isEmpty() ?
            list :
            new List(this.head(), this.tail().concat(list));
    }

    prod(list) {
        if(this.isEmpty()) return this;
        if(list.isEmpty()) return list;
        return new List(list.prodLeft(this.head()), this.tail().prod(list));
    }

    prodLeft(x) {
        if(this.isEmpty()) return this;
        if(x instanceof List) {
            return x.prod(this);
        }
        const y = this.head();
        const t = this.tail();
        if(y instanceof List) {
            return new List(y.prodLeft(x), t.prodLeft(x));
        }
        return new List(
            x instanceof Tuple ? 
            x.push(y) :
            y instanceof Tuple ?
            new Tuple(x, y) :
            Tuple.of(x, y), 
            t.prodLeft(x)
        );
    }

    push(x) {
        // !! Mutation !!
        if (this.isEmpty()) {
            this._head = x;
            this._tail = new List();
            return this;
        }
        this.tail().push(x);
        return this;
    }

    pop() {
        // !! Mutation !!
        if (this.isEmpty()) return;
        if (this.tail().isEmpty()) {
            const ans = this.head();
            this._head = undefined;
            this._tail = undefined;
            return ans;
        }
        return this.tail().pop();
    }

    length() {
        return this.isEmpty() ? 0 : 1 + this.tail().length();
    }

    toArray() {
        return this.tail().isEmpty() ? [this.head()] : [this.head(), ...this.tail().toArray()];
    }

    equals(list) {
        if (this.isEmpty() && list.isEmpty()) return true;
        return this.head() === list.head() && this.tail().equals(list.tail());
    }

    static of(...arr) {
        let ans = new List();
        arr.forEach(x => ans = ans.push(x));
        return ans;
    }

    static fromArray(arr) {
        const ans = new List();
        for (let i = 0; i < arr.length; i++) {
            ans.push(arr[arr.length - 1 - i]);
        }
        return ans;
    }
}

