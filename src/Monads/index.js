export class Some {
    constructor(x) {
        this.value = x;
    }

    map(f) {
        return Maybe.of(f(this.value));
    }

    filter(f) {
        return f(this.value) ? this : new None()
    }

    orElse() {
        return this.value;
    }

    forEach(f) {
        f(this.value)
    }

    flatMap(f) {
        return f(this.value);
    }
    isSome() {
        return true;
    }

    static of(x) {
        return new Some(x);
    }
}

export class None {
    map() {
        return this;
    }

    filter() {
        return this;
    }

    orElse(f = () => { }) {
        return f();
    }

    forEach() { }

    flatMap() {
        return this;
    }
    isSome() {
        return false;
    }

    static of() {
        return new None();
    }
}

export class Maybe {
    static of(x) {
        if (x) {
            return Some.of(x);
        }
        return new None();
    }

    static none() {
        return new None();
    }

    static some(x) {
        return Some.of(x);
    }
}

export class Fail {
    constructor(a) {
        this.value = a;
    }

    map() {
        return this;
    }

    flatMap() {
        return this;
    }

    failMap(f) {
        return f(this.value);
    }

    isSuccess() { return false }

    orCatch(lazyError) {
        return lazyError(this.value);
    }

    static of(x) {
        return new Fail(x);
    }
}

export class Success {
    constructor(a) {
        this.value = a;
    }

    map(f) {
        return Success.of(f(this.value));
    }

    flatMap(f) {
        return f(this.value);
    }

    failMap() {
        return this;
    }

    isSuccess() { return true }

    orCatch() { return this.value }

    static of(x) {
        return new Success(x);
    }
}