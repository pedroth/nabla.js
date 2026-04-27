class Field {

    add(other) {
        // child implementation should override this method
        throw Error("add method not implemented");
    }

    sub(other) {
        // child implementation should override this method
        throw Error("sub method not implemented");
    }

    mul(other) {
        // child implementation should override this method
        throw Error("mul method not implemented");
    }

    div(other) {
        // child implementation should override this method
        throw Error("div method not implemented");
    }

    scale(factor) {
        // child implementation should override this method
        throw Error("scale method not implemented");
    }

    inv() {
        // child implementation should override this method
        throw Error("inv method not implemented");
    }

    neg() {
        // child implementation should override this method
        throw Error("neg method not implemented");
    }

    conj() {
        // child implementation should override this method
        throw Error("conj method not implemented");
    }

    equals(other) {
        // child implementation should override this method
        throw Error("equals method not implemented");
    }
}

export class Real extends Field {
    constructor(value) {
        super();
        if (typeof value !== "number") throw Error("value must be a number");
        this.x = value;
    }

    add(other) {
        return new Real(this.x + other.x);
    }

    sub(other) {
        return new Real(this.x - other.x);
    }

    mul(other) {
        return new Real(this.x * other.x);
    }

    div(other) {
        if (other.x === 0) throw Error("division by zero");
        return new Real(this.x / other.x);
    }

    scale(factor) {
        return new Real(this.x * factor);
    }

    inv() {
        if (this.x === 0) throw Error("division by zero");
        return new Real(1 / this.x);
    }

    neg() {
        return new Real(-this.x);
    }

    conj() {
        return this; // real numbers are their own conjugate
    }

    equals(other) {
        return this.x === other.x;
    }
}

export class Complex extends Field {
    constructor(real, imag) {
        super();
        if (typeof real !== "number" || typeof imag !== "number") throw Error("real and imag must be numbers");
        this.real = real;
        this.imag = imag;
    }

    add(other) {
        return new Complex(this.real + other.real, this.imag + other.imag);
    }

    sub(other) {
        return new Complex(this.real - other.real, this.imag - other.imag);
    }

    mul(other) {
        return new Complex(
            this.real * other.real - this.imag * other.imag,
            this.real * other.imag + this.imag * other.real
        );
    }

    div(other) {
        const denominator = this.mul(other.conj()).real; // |other|^2
        if (denominator === 0) throw Error("division by zero");
        return this.mul(other.conj()).scale(1 / denominator);
    }

    scale(factor) {
        return new Complex(this.real * factor, this.imag * factor);
    }

    inv() {
        const denominator = this.mul(this.conj()).real; // |this|^2
        if (denominator === 0) throw Error("division by zero");
        return this.conj().scale(1 / denominator);
    }

    neg() {
        return new Complex(-this.real, -this.imag);
    }

    conj() {
        return new Complex(this.real, -this.imag);
    }

    equals(other) {
        return this.real === other.real && this.imag === other.imag;
    }
}

export class Dual extends Field {
    constructor(real, imag) {
        super();
        if (typeof real !== "number" || typeof imag !== "number") throw Error("real and imag must be numbers");
        this.real = real;
        this.dual = imag;
    }

    add(other) {
        return new Dual(this.real + other.real, this.dual + other.dual);
    }

    sub(other) {
        return new Dual(this.real - other.real, this.dual - other.dual);
    }

    mul(other) {
        return new Dual(
            this.real * other.real,
            this.real * other.dual + this.dual * other.real
        );
    }

    div(other) {
        const denominator = this.mul(other.conj()).real; // |other|^2
        if (denominator === 0) throw Error("division by zero");
        return this.mul(other.conj()).scale(1 / denominator);
    }

    scale(factor) {
        return new Dual(this.real * factor, this.dual * factor);
    }

    inv() {
        const denominator = this.mul(this.conj()).real; // |this|^2
        if (denominator === 0) throw Error("division by zero");
        return this.conj().scale(1 / denominator);
    }

    neg() {
        return new Dual(-this.real, -this.dual);
    }

    conj() {
        return new Dual(this.real, -this.dual);
    }

    equals(other) {
        return this.real === other.real && this.dual === other.dual;
    }
}