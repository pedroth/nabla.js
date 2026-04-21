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

class Some {
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

class None {
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

