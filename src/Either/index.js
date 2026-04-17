export class Either {
    static left(x) {
        return Left.of(x);
    }

    static right(x) {
        return Right.of(x);
    }
}

export class Left {
    constructor(x) {
        this.value = x;
    }

    map(f) {
        return new Left(f(this.value));
    }

    mapLeft(f) {
        return new Left(f(this.value));
    }
    
    mapRight() {
        return this;
    }

    isLeft() {
        return true;
    }
    
    isRight() {
        return false;
    }

    orLeft() {
        return this.value;
    }

    orRight(defaultLazy) {
        return defaultLazy();
    }

    toString() {
        return `Left(${this.value})`;
    }

    equals(other) {
        if (!(other instanceof Left)) return false;
        const equalsOrSame = (a, b) => a === b || (typeof a?.equals === 'function' && a.equals(b));
        return equalsOrSame(this.value, other.value);
    }

    isEmpty() {
        return this.value == null;
    }

    static of(x) {
        return new Left(x);
    }
}

export class Right {
    constructor(x) {
        this.value = x;
    }

    map(f) {
        return new Right(f(this.value));
    }

    mapLeft() {
        return this;
    }

    mapRight(f) {
        return new Right(f(this.value));
    }

    isLeft() {
        return false;
    }
    
    isRight() {
        return true;
    }   

    orLeft(defaultLazy) {
        return defaultLazy();
    }

    orRight() {
        return this.value;
    }

    toString() {
        return `Right(${this.value})`;
    }

    equals(other) {
        if (!(other instanceof Right)) return false;
        const equalsOrSame = (a, b) => a === b || (typeof a?.equals === 'function' && a.equals(b));
        return equalsOrSame(this.value, other.value);
    }

    isEmpty() {
        return this.value == null;
    }

    static of(x) {
        return new Right(x);
    }
}


