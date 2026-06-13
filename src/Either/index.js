export class Either {
    static left(x) {
        return Left.of(x);
    }

    static right(x) {
        return Right.of(x);
    }
}

class Left {
    constructor(x) {
        this.value = x;
    }

    // ========== State Check Operations ==========

    isLeft() {
        return true;
    }

    isRight() {
        return false;
    }

    isEmpty() {
        return this.value == null;
    }

    // ========== Mapping Operations ==========

    map(f) {
        return new Left(f(this.value));
    }

    mapLeft(f) {
        return new Left(f(this.value));
    }

    mapRight() {
        return this;
    }

    flatMap() {
        return this;
    }

    // ========== Value Extraction ==========

    orLeft() {
        return this.value;
    }

    orRight(defaultLazy) {
        return defaultLazy();
    }

    // ========== Comparison & Conversion ==========

    equals(other) {
        if (!(other instanceof Left)) return false;
        const equalsOrSame = (a, b) => a === b || (typeof a?.equals === 'function' && a.equals(b));
        return equalsOrSame(this.value, other.value);
    }

    toString() {
        return `Left(${this.value})`;
    }

    // ========== Static Factory ==========

    static of(x) {
        return new Left(x);
    }
}

class Right {
    constructor(x) {
        this.value = x;
    }

    // ========== State Check Operations ==========

    isLeft() {
        return false;
    }

    isRight() {
        return true;
    }

    isEmpty() {
        return this.value == null;
    }

    // ========== Mapping Operations ==========

    map(f) {
        return new Right(f(this.value));
    }

    mapLeft() {
        return this;
    }

    mapRight(f) {
        return new Right(f(this.value));
    }

    flatMap(f) {
        return f(this.value);
    }

    // ========== Value Extraction ==========

    orLeft(defaultLazy) {
        return defaultLazy();
    }

    orRight() {
        return this.value;
    }

    // ========== Comparison & Conversion ==========

    equals(other) {
        if (!(other instanceof Right)) return false;
        const equalsOrSame = (a, b) => a === b || (typeof a?.equals === 'function' && a.equals(b));
        return equalsOrSame(this.value, other.value);
    }

    toString() {
        return `Right(${this.value})`;
    }

    // ========== Static Factory ==========

    static of(x) {
        return new Right(x);
    }
}


