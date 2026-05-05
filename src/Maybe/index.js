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

    // ========== State Check Operations ==========

    isSome() {
        return true;
    }

    isNone() {
        return false;
    }

    // ========== Mapping Operations ==========

    map(f) {
        return Maybe.of(f(this.value));
    }

    filter(f) {
        return f(this.value) ? this : new None()
    }

    flatMap(f) {
        return f(this.value);
    }

    forEach(f) {
        f(this.value)
    }

    // ========== Value Extraction ==========

    orElse(f = () => { }) {
        return this.value;
    }

    // ========== Static Factory ==========

    static of(x) {
        return new Some(x);
    }
}

class None {
    // ========== State Check Operations ==========

    isSome() {
        return false;
    }

    isNone() {
        return true;
    }

    // ========== Mapping Operations ==========

    map() {
        return this;
    }

    filter() {
        return this;
    }

    flatMap() {
        return this;
    }

    forEach() { }

    // ========== Value Extraction ==========

    orElse(f = () => { }) {
        return f();
    }

    // ========== Static Factory ==========

    static of() {
        return new None();
    }
}

