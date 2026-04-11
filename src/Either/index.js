export class Left {
    constructor(x) {
        this.value = x;
    }

    mapLeft(f) {
        return new Left(f(this.value));
    }

    flatMapLeft(f) {
        return f(this.value);
    }

    flatMapRight() {
        return this;
    }

    mapRight() {
        return this;
    }

    toString() {
        return `Left(${this.value})`;
    }

    orLeft() {
        return this.value;
    }

    orRight(defaultLazy) {
        return defaultLazy();
    }

    static of(x) {
        return new Left(x);
    }
}

export class Right {
    constructor(x) {
        this.value = x;
    }

    mapLeft() {
        return this;
    }

    mapRight(f) {
        return new Right(f(this.value));
    }

    flatMapLeft() {
        return this;
    }

    flatMapRight(f) {
        return f(this.value);
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

    static of(x) {
        return new Right(x);
    }
}

export class Either {
    static left(x) {
        return Left.of(x);
    }

    static right(x) {
        return Right.of(x);
    }
}
