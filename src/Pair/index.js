export class Pair {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    map(f) {
        return new Pair(f(this.x), f(this.y));
    }

    fold(acc, f) {
        return f(f(acc, this.x), this.y);
    }

    filter(predicate) {
        return predicate(this.x) && predicate(this.y) ? new Pair(this.x, this.y) : new Pair();
    }

    left() {
        return this.x;
    }

    right() {
        return this.y;
    }

    equals(pair) {
        return this.x === pair.left() && this.y === pair.right();
    }

    isEmpty() {
        return !this.x && !this.y;
    }
}
