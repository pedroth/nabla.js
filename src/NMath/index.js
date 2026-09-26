import { Try } from "../Try/index.js";

const TYPES = {
    real: "real",
    complex: "complex",
    dual: "dual",
    vector: "vector",
    covector: "covector",
    multivector: "multivector",
    matrix: "matrix",
};

function real(value) {
    const ans = { type: TYPES.real, value: value, isField: true };
    ans.add = (other) => real(ans.value + other.value);
    ans.sub = (other) => real(ans.value - other.value);
    ans.mul = (other) => real(ans.value * other.value);
    ans.div = (other) => {
        if (other.value === 0) throw Error("division by zero");
        return real(ans.value / other.value);
    };
    ans.inv = () => {
        if (ans.value === 0) throw Error("division by zero");
        return real(1 / ans.value);
    };
    ans.neg = () => real(-ans.value);
    ans.conj = () => ans; // real numbers are their own conjugate
    ans.equals = (other) => other.type === TYPES.real && ans.value === other.value;
    ans.toString = () => String(ans.value);
    ans.toVisual = () => ({ type: "latex", value: ans.value });
    return ans;
}
real.random = () => real(Math.random());

function complex(realPart, imagPart) {
    const ans = { type: TYPES.complex, real: real(realPart), imag: real(imagPart), isField: true };
    ans.add = (other) => complex(ans.real.value + other.real.value, ans.imag.value + other.imag.value);
    ans.sub = (other) => complex(ans.real.value - other.real.value, ans.imag.value - other.imag.value);
    ans.mul = (other) => complex(
        ans.real.value * other.real.value - ans.imag.value * other.imag.value,
        ans.real.value * other.imag.value + ans.imag.value * other.real.value
    );
    ans.div = (other) => {
        const denominator = ans.mul(other.conj()).real.value; // |other|^2
        if (denominator === 0) throw Error("division by zero");
        return ans.mul(other.conj()).mul(complex(1 / denominator, 0));
    }
    ans.inv = () => {
        const denominator = ans.mul(ans.conj()).real.value; // |this|^2
        if (denominator === 0) throw Error("division by zero");
        return ans.conj().mul(complex(1 / denominator, 0));
    }
    ans.neg = () => complex(-ans.real.value, -ans.imag.value);
    ans.conj = () => complex(ans.real.value, -ans.imag.value);
    ans.equals = (other) => other.type === TYPES.complex && ans.real.value === other.real.value && ans.imag.value === other.imag.value;
    ans.toString = () => `${ans.real.value} + ${ans.imag.value}i`;
    ans.toVisual = () => ({ type: "latex", value: `${ans.real.value} + ${ans.imag.value}\\imath` });
    return ans;
}
complex.random = () => complex(Math.random(), Math.random());

function dual(realPart, dualPart) {
    const ans = { type: TYPES.dual, real: real(realPart), dual: real(dualPart), isField: true };
    ans.add = (other) => dual(ans.real.value + other.real.value, ans.dual.value + other.dual.value);
    ans.sub = (other) => dual(ans.real.value - other.real.value, ans.dual.value - other.dual.value);
    ans.mul = (other) => dual(
        ans.real.value * other.real.value,
        ans.real.value * other.dual.value + ans.dual.value * other.real.value
    );
    ans.div = (other) => {
        const denominator = ans.mul(other.conj()).real.value; // |other|^2
        if (denominator === 0) throw Error("division by zero");
        return ans.mul(other.conj()).mul(dual(1 / denominator, 0));
    }
    ans.inv = () => {
        const denominator = ans.mul(ans.conj()).real.value; // |this|^2
        if (denominator === 0) throw Error("division by zero");
        return ans.conj().mul(dual(1 / denominator, 0));
    }
    ans.neg = () => dual(-ans.real.value, -ans.dual.value);
    ans.conj = () => dual(ans.real.value, -ans.dual.value);
    ans.equals = (other) => other.type === TYPES.dual && ans.real.value === other.real.value && ans.dual.value === other.dual.value;
    ans.toString = () => `${ans.real.value} + ${ans.dual.value}\\epsilon`;
    ans.toVisual = () => ({ type: "latex", value: `${ans.real.value} + ${ans.dual.value}\\epsilon` });
    return ans;
}
dual.random = () => dual(Math.random(), Math.random());

function vec(...components) {
    const ans = { type: TYPES.vector, components: components.map(c => typeof c === "number" ? real(c) : c), isField: false };
    ans.add = (other) => {
        const newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(ans.components[i].add(other.components[i]));
        }
        return vec(...newVec);
    };
    ans.sub = (other) => {
        const newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(ans.components[i].sub(other.components[i]));
        }
        return vec(...newVec);
    };
    ans.mul = (other) => {
        const newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(ans.components[i].mul(other.components[i]));
        }
        return vec(...newVec);
    };
    ans.div = (other) => {
        const newVec = [];
        for (let i = 0; i < ans.components.length; i++) {
            newVec.push(ans.components[i].div(other.components[i]));
        }
        return vec(...newVec);
    };
    ans.dot = (other) => {
        let result = real(0);
        for (let i = 0; i < ans.components.length; i++) {
            result = result.add(ans.components[i].conj().mul(other.components[i]));
        }
        return result;
    };
    ans.scale = (field) => {
        const normalizeField = typeof field === "number" ? real(field) : field;
        if (normalizeField.isField) {
            return vec(...ans.components.map(c => c.mul(normalizeField)));
        } else {
            Try.fail("Scaling requires a field element");
        }
    };

    ans.length = () => {
        return Math.sqrt(ans.dot(ans).value);
    };
    ans.normalize = () => {
        const length = ans.dot(ans).value; // also works for complex
        if (length === 0) {
            Try.fail("Cannot normalize zero vector");
        }
        const invLength = real(1).div(real(Math.sqrt(length)));
        return ans.scale(invLength);
    };

    ans.fold = (acc, fn) => {
        let result = acc;
        for (let i = 0; i < ans.components.length; i++) {
            result = fn(result, ans.components[i], i);
        }
        return result;
    };
    ans.map = (fn) => {
        let result = [];
        for (let i = 0; i < ans.components.length; i++) {
            result.push(fn(ans.components[i], i));
        }
        return vec(...result);
    };

    ans.equals = (other) => other.type === TYPES.vector && ans.components.every((c, i) => c.equals(other.components[i]));
    ans.toString = () => `(${ans.components.map(c => c.value).join(", ")})`;
    ans.toVisual = () => ({ type: "latex", value: `(${ans.components.map(c => c.value).join(", ")})` });
    ans.toArray = () => ans.components.map(c => c.type === TYPES.real ? c.value : c);
    return ans;
}
vec.zero = (dim, field = real) => {
    const components = [];
    for (let i = 0; i < dim; i++) {
        components.push(field(0));
    }
    return vec(...components);
};
vec.random = (dim, field = real) => {
    const components = [];
    for (let i = 0; i < dim; i++) {
        components.push(field.random());
    }
    return vec(...components);
};



function exp(x) {
    switch (x.type) {
        case TYPES.real:
            return real(Math.exp(x.value));
        case TYPES.complex: {
            const expReal = Math.exp(x.real.value);
            return complex(
                expReal * Math.cos(x.imag.value),
                expReal * Math.sin(x.imag.value)
            );
        }
        case TYPES.dual: {
            const expRealDual = Math.exp(x.real.value);
            return dual(
                expRealDual,
                expRealDual * x.dual.value
            );
        }
        default:
            throw Error(`Unsupported type for exp: ${x.type}`);
    }
}

function log(x) {
    switch (x.type) {
        case TYPES.real:
            if (x.value <= 0) throw Error("logarithm of non-positive number");
            return real(Math.log(x.value));
        case TYPES.complex:
            return complex(
                Math.log(Math.sqrt(x.real.value ** 2 + x.imag.value ** 2)),
                Math.atan2(x.imag.value, x.real.value)
            );
        case TYPES.dual:
            if (x.real.value <= 0) throw Error("logarithm of non-positive number");
            return dual(Math.log(x.real.value), x.dual.value / x.real.value);
        default:
            throw Error(`Unsupported type for log: ${x.type}`);
    }
}



export const NMath = {
    real,
    complex,
    dual,
    exp,
    log,
    vec
};