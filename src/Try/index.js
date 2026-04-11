export class Try {
    static success(x) {
        return Success.of(x);
    }

    static fail(x) {
        return Fail.of(x);
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