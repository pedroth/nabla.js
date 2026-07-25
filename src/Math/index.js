const TYPES = {
    real: "real",
    complex: "complex",
    dual: "dual"
};

function real(value) {
    const ans = { type: TYPES.real, value: value };
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

function complex(realPart, imagPart) {
    const ans = { type: TYPES.complex, real: real(realPart), imag: real(imagPart) };
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


function dual(realPart, dualPart) {
    const ans = { type: TYPES.dual, real: real(realPart), dual: real(dualPart) };
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

export const NablaMath = {
    real,
    complex,
    dual,
    exp,
    log
};