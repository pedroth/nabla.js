export class Stream {
    /**
     * 
     * @param {any} head 
     * @param {() => Stream} tail 
     */
    constructor(head, tail) {
        this.isEmpty = !head && !tail;
        this.head = head;
        this.tail = tail;
    }

    isEmpty() { return this._isEmpty; }

    head() { return this._head }

    tail() {
        if(this.isEmpty()) return new Stream();
        return this._tail();
    }

    map(lambda) {
        if(this.isEmpty()) return new Stream();
        return new Stream(lambda(this._head), () => this._tail().map(lambda))
    }

    flatMap(lambda) {
        if(this.isEmpty()) return this;
        const flatted = lambda(this._head);
        if(flatted.isEmpty()) return this._tail().flatMap(lambda);
        return new Stream(flatted._head, () => flatted._tail().concat(this._tail().flatMap(lambda)))
    }

    concat(stream) {
        if(this.isEmpty()) return stream;
        return new Stream(this._head, () => this._tail().concat(stream));
    }

    filter(predicate = () => true) {
        if(predicate(this._head)) {
            return new Stream(this._head, () => this._tail().filter(predicate));
        }
        return this._tail().filter(predicate);
    }

    fold(initialValue = 0, reducer = (e, x) => e + x) {
        if (this.isEmpty()) return initialValue;
        return this.tail().fold(reducer(initialValue, this.head()), reducer);
    }

    take(n) {
        if (n <= 0) return new Stream();
        return new Stream(this._head, () => this._tail().take(n - 1));
    }

    toArray() {
        return this.fold([], (acc, x) => { acc.push(x); return acc; });
    }   

    static of(...array) {
        return Stream.fromArray(array);
    }

    static fromArray(array) {
        if (array.length === 0) return new Stream();
        return new Stream(array[0], () => Stream.fromArray(array.slice(1)));
    }

    static range(start = 0, end = undefined) {
        if (start >= end) return new Stream();
        return new Stream(start, () => Stream.range(start + 1, end));
    }

    static primes() {
        function primesRecursive(stream) {
            const p = stream.head();
            return new Stream(p, () => primesRecursive(stream.tail().filter(x => x % p !== 0)));
        }
        return primesRecursive(Stream.range(2));
    }

}