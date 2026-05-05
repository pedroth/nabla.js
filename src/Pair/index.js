export class Pair {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    // ========== State Check Operations ==========

    isEmpty() {
        return this.x == null && this.y == null;
    }

    // ========== Access Operations ==========

    left() {
        return this.x;
    }

    right() {
        return this.y;
    }

    // ========== Mapping Operations ==========

    map(f) {
        return new Pair(f(this.x), f(this.y));
    }

    mapLeft(f) {
        return new Pair(f(this.x), this.y);
    }

    mapRight(f) {
        return new Pair(this.x, f(this.y));
    }

    fold(defaultValue, f) {
        if (this.isEmpty()) return defaultValue;
        return f(this.x, this.y);
    }

    // ========== Conversion & Comparison ==========

    equals(pair) {
        if (!(pair instanceof Pair)) return false;
        const equalsOrSame = (a, b) => a === b || (typeof a?.equals === 'function' && a.equals(b));
        return equalsOrSame(this.x, pair.left()) && equalsOrSame(this.y, pair.right());
    }

    toArray() {
        return [this.x, this.y];
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }

    // ========== Static Factory ==========

    static of(x, y) {
        return new Pair(x, y);
    }
}
