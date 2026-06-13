import { Set } from "../Set/index.js";

const Symbolic = {
    real,
    variable,
    vec,
    covec,
    add,
    sub,
    mul,
    div,
    pow,
    exp,
    log,
    simplify,
    derivative,
};

export { Symbolic };

function singleArgFunc({ name }, arg) {
    const ans = { type: name, value: arg };
    ans.children = [arg];
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => factor.type === "real" ? mul(real(factor), ans) : mul(factor, ans);
    ans.toString = () => `${name}(${arg.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `${name}(${arg.toVisual().value})` });
    ans.equals = (other) => {
        if (other?.type !== name) return false;
        if (!arg.equals(other.value)) return false;
        return true;
    }
    ans.vars = arg.vars;
    arg.parents = arg.parents ? arg.parents.concat([ans]) : [ans];
    return ans;
}

// type: {name: string, symbol: string}, left: expression, right: expression
function binaryOp({ name, symbol }, left, right) {
    const ans = { type: name, left, right };
    ans.children = [left, right];
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => factor.type === "real" ? mul(real(factor), ans) : mul(factor, ans);
    ans.toString = () => `(${left.toString()} ${symbol} ${right.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `(${left.toVisual().value} ${symbol} ${right.toVisual().value})` });
    ans.equals = (other) => {
        if (other?.type !== name) return false;
        if (!left.equals(other.left)) return false;
        if (!right.equals(other.right)) return false;
        return true;
    }
    ans.vars = Set.of(...left.vars.toArray(), ...right.vars.toArray());
    left.parents = left.parents ? left.parents.concat([ans]) : [ans];
    right.parents = right.parents ? right.parents.concat([ans]) : [ans];
    return ans;
}

function add(a, b) {
    const ans = binaryOp({ name: "add", symbol: "+" }, a, b);
    ans.nabla = () => {
        return covec(real(1), real(1));
    };
    return ans;
}

function sub(a, b) {
    const ans = binaryOp({ name: "sub", symbol: "-" }, a, b);
    ans.nabla = () => {
        return covec(real(1), real(-1));
    };
    return ans;
}

function mul(a, b) {
    const ans = binaryOp({ name: "mul", symbol: "\\cdot" }, a, b);
    ans.nabla = () => {
        return covec(b, a);
    };
    return ans;
}

function div(numerator, denominator) {
    const ans = binaryOp({ name: "div", symbol: "/" }, numerator, denominator);
    ans.toVisual = () => ({ type: "latex", value: `\\frac{${numerator.toVisual().value}}{${denominator.toVisual().value}}` });
    ans.nabla = () => {
        return covec(div(real(1), denominator), div(mul(real(-1), numerator), mul(denominator, denominator)));
    };
    return ans;
}

function pow(base, exponent) {
    const ans = binaryOp({ name: "pow", symbol: "^" }, base, exponent);
    ans.toVisual = () => ({ type: "latex", value: `{${base.toVisual().value}}^{${exponent.toVisual().value}}` });
    ans.nabla = () => {
        // d(base^exp)/d(base)     = exp * base^(exp-1)
        // d(base^exp)/d(exponent) = base^exp * log(base)
        return covec(
            mul(exponent, pow(base, sub(exponent, real(1)))),
            mul(ans, log(base))
        );
    };
    return ans;
}

function exp(value) {
    const ans = singleArgFunc({ name: "exp" }, value);
    ans.toVisual = () => ({ type: "latex", value: `e^{${value.toVisual().value}}` });
    ans.nabla = () => {
        // d(e^value)/d(value) = e^value
        return covec(ans);
    };
    return ans;
}

function log(value) {
    const ans = singleArgFunc({ name: "log" }, value);
    ans.toVisual = () => ({ type: "latex", value: `\\log(${value.toVisual().value})` });
    ans.nabla = () => {
        // d(log(value))/d(value) = 1/value
        return covec(div(real(1), value));
    };
    return ans;
}

function real(value) {
    const ans = { type: "real", value: value };
    ans.children = [];
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => factor.type === "real" ? mul(real(factor), ans) : mul(factor, ans);
    ans.toString = () => ans.value.toString();
    ans.toVisual = () => ({ type: "latex", value: ans.value.toString() });
    ans.equals = (other) => other?.type === "real" && other.value === value;
    ans.nabla = () => {
        return real(0);
    };
    ans.vars = Set.of();
    return ans;
}

function variable(name) {
    const ans = { type: "variable", name };
    ans.children = [];
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => factor.type === "real" ? mul(real(factor), ans) : mul(factor, ans);
    ans.toString = () => name;
    ans.toVisual = () => ({ type: "latex", value: name });
    ans.equals = (other) => other?.type === "variable" && other.name === name;
    ans.nabla = () => {
        return real(1);
    };
    ans.vars = Set.of(ans);
    return ans;
}

function vec(...components) {
    const ans = { type: "vector", components };
    ans.dim = components.length;
    ans.add = (other) => {
        if (other.type !== "vector" || other.components.length !== components.length) {
            throw new Error("Can only add vectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.add(other.components[i]));
        return vec(...newComponents);
    };
    ans.sub = (other) => {
        if (other.type !== "vector" || other.components.length !== components.length) {
            throw new Error("Can only subtract vectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.sub(other.components[i]));
        return vec(...newComponents);
    }
    ans.mul = (other) => {
        if (other.type !== "vector" || other.components.length !== components.length) {
            throw new Error("Can only multiply vectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.mul(other.components[i]));
        return vec(...newComponents);
    };
    ans.div = (denominator) => {
        if (denominator.type !== "vector" || denominator.components.length !== components.length) {
            throw new Error("Can only divide vectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.div(denominator.components[i]));
        return vec(...newComponents);
    };
    ans.scale = (factor) => {
        const newComponents = components.map(c => c.scale(factor));
        return vec(...newComponents);
    };
    ans.prod = (covector) => {
        if (covector.type !== "vector" || covector.components.length !== components.length) {
            throw new Error("Can only take the product of a covector and a vector of the same dimension");
        }
        const products = components.map((c, i) => {
            const vectorComponent = covector.components[i];
            if (c.type === "vector" || c.type === "covector") {
                return c.scale(vectorComponent);
            }
            return c.mul(vectorComponent);
        });
        let ans = products[0];
        for (let i = 1; i < products.length; i++) {
            ans = ans.add(products[i]);
        }
        return ans;
    }
    ans.transpose = () => {
        return covec(...components);
    };
    ans.dot = (otherVec) => {
        return ans.transpose().prod(otherVec);
    }
    ans.nabla = () => {
        const components = ans.components.map(c => c.nabla());
        return covec(...components);
    }
    ans.toString = () => `vec(${components.map(c => c.toString()).join(", ")})`;
    ans.toVisual = () => ({ type: "latex", value: `(${components.map(c => c.toVisual().value).join(", ")})` });
    return ans;
}

function covec(...components) {
    const ans = { type: "covector", components };
    ans.dim = components.length;
    ans.add = (other) => {
        if (other.type !== "covector" || other.components.length !== components.length) {
            throw new Error("Can only add covectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.add(other.components[i]));
        return covec(...newComponents);
    };
    ans.sub = (other) => {
        if (other.type !== "covector" || other.components.length !== components.length) {
            throw new Error("Can only subtract covectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.sub(other.components[i]));
        return covec(...newComponents);
    }
    ans.mul = (other) => {
        if (other.type !== "covector" || other.components.length !== components.length) {
            throw new Error("Can only multiply covectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.mul(other.components[i]));
        return covec(...newComponents);
    };
    ans.div = (denominator) => {
        if (denominator.type !== "covector" || denominator.components.length !== components.length) {
            throw new Error("Can only divide covectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.div(denominator.components[i]));
        return covec(...newComponents);
    };
    ans.scale = (factor) => {
        const newComponents = components.map(c => c.scale(factor));
        return covec(...newComponents);
    };
    ans.prod = (vector) => {
        if (vector.type !== "vector" || vector.components.length !== components.length) {
            throw new Error("Can only take the product of a covector and a vector of the same dimension");
        }
        const products = components.map((c, i) => {
            const vectorComponent = vector.components[i];
            if (c.type === "vector" || c.type === "covector") {
                return c.scale(vectorComponent);
            }
            return c.mul(vectorComponent);
        });
        let ans = products[0];
        for (let i = 1; i < products.length; i++) {
            ans = ans.add(products[i]);
        }
        return ans;
    };
    ans.transpose = () => {
        return covec(...components);
    };
    ans.dot = (otherVec) => {
        return ans.transpose().prod(otherVec);
    }
    ans.nabla = () => {
        const components = ans.components.map(c => c.nabla());
        return covec(...components);
    }
    ans.toString = () => `covec(${components.map(c => c.toString()).join(", ")})`;
    ans.toVisual = () => ({ type: "latex", value: `[${components.map(c => c.toVisual().value).join(", ")}]` });

    return ans;
}

function simplifyStep(expression) {
    const { type } = expression;

    if (type === "vector" || type === "covector") {
        const newComponents = expression.components.map(c => simplify(c));
        return type === "vector" ? vec(...newComponents) : covec(...newComponents);
    }

    if (type === "add" || type === "sub" || type === "mul" || type === "div" || type === "pow") {
        const left = simplify(expression.left);
        const right = simplify(expression.right);

        if (type === "add") {
            // constant folding
            if (left.type === "real" && right.type === "real") return real(left.value + right.value);
            // x + 0 = x
            if (right.type === "real" && right.value === 0) return left;
            // 0 + x = x
            if (left.type === "real" && left.value === 0) return right;
            // x + x = 2 * x
            if (left.type === "variable" && left.equals(right)) return mul(real(2), left);

            // real folding: x + (a * x) = (a + 1) * x
            if (left.type === "variable" && right.type === "mul" && right.left.type === "real" && right.right.equals(left)) {
                return mul(add(real(1), right.left), left);
            }
            // real folding: (a * x) + x = (a + 1) * x
            if (right.type === "variable" && left.type === "mul" && left.left.type === "real" && left.right.equals(right)) {
                return mul(simplifyStep(add(real(1), left.left)), right);
            }

            // (a * x) + (b * x) = (a + b) * x
            if (left.type === "mul" && right.type === "mul") {
                if (left.right.equals(right.right)) {
                    return mul(simplifyStep(add(left.left, right.left)), left.right);
                }
            }

            // a + (-1 * b) = a - b
            if (right.type === "mul" && right.left.type === "real" && right.left.value === -1) {
                return simplifyStep(sub(left, right.right));
            }
            // a + (b * -1) = a - b
            if (right.type === "mul" && right.right.type === "real" && right.right.value === -1) {
                return simplifyStep(sub(left, right.left));
            }

            // (a - b) + (c + b) = a + c  (and symmetric variants)
            if (left.type === "sub" && right.type === "add") {
                if (left.right.equals(right.right)) return simplifyStep(add(left.left, right.left));
                if (left.right.equals(right.left)) return simplifyStep(add(left.left, right.right));
            }
            if (left.type === "add" && right.type === "sub") {
                if (left.right.equals(right.right)) return simplifyStep(add(left.left, right.left));
                if (left.left.equals(right.right)) return simplifyStep(add(left.right, right.left));
            }

            return add(left, right);
        }

        if (type === "sub") {
            // constant folding
            if (left.type === "real" && right.type === "real") return real(left.value - right.value);
            // x - 0 = x
            if (right.type === "real" && right.value === 0) return left;
            // 0 - x = -1 * x
            if (left.type === "real" && left.value === 0) return mul(real(-1), right);
            // x - x = 0
            if (left.equals(right)) return real(0);

            // real folding: x - (a * x) = (1 - a) * x
            if (left.type === "variable" && right.type === "mul" && right.left.type === "real" && right.right.equals(left)) {
                return mul(simplifyStep(add(real(1), mul(real(-1), right.left))), left);
            }
            // real folding: (a * x) - x = (a - 1) * x
            if (right.type === "variable" && left.type === "mul" && left.left.type === "real" && left.right.equals(right)) {
                return mul(simplifyStep(add(left.left, real(-1))), right);
            }

            // (a * x) - (b * x) = (a - b) * x
            if (left.type === "mul" && right.type === "mul") {
                if (left.right.equals(right.right)) {
                    return mul(simplifyStep(add(left.left, mul(real(-1), right.left))), left.right);
                }
            }
            // (a + b) - (c + d) where a common term cancels
            if (left.type === "add" && right.type === "add") {
                if (left.left.equals(right.left)) return simplifyStep(sub(left.right, right.right));
                if (left.left.equals(right.right)) return simplifyStep(sub(left.right, right.left));
                if (left.right.equals(right.left)) return simplifyStep(sub(left.left, right.right));
                if (left.right.equals(right.right)) return simplifyStep(sub(left.left, right.left));
            }

            // (a - b) - (a + c) = -(b + c),  (a - b) - (c + b) = a - c - 2b, etc.
            if (left.type === "sub" && right.type === "add") {
                if (left.left.equals(right.left)) return simplifyStep(mul(real(-1), add(left.right, right.right)));
                if (left.left.equals(right.right)) return simplifyStep(mul(real(-1), add(left.right, right.left)));
                if (left.right.equals(right.left)) return simplifyStep(sub(left.left, add(simplifyStep(mul(real(2), right.left)), right.right)));
                if (left.right.equals(right.right)) return simplifyStep(sub(left.left, add(right.left, simplifyStep(mul(real(2), right.right)))));
            }
            // (a + b) - (c - d) where a term cancels
            if (left.type === "add" && right.type === "sub") {
                if (left.left.equals(right.left)) return simplifyStep(add(left.right, right.right));
                if (left.right.equals(right.left)) return simplifyStep(add(left.left, right.right));
                if (left.left.equals(right.right)) return simplifyStep(add(left.right, right.left));
                if (left.right.equals(right.right)) return simplifyStep(add(left.left, right.left));
            }

            return sub(left, right);
        }

        if (type === "mul") {
            // constant folding
            if (left.type === "real" && right.type === "real") return real(left.value * right.value);
            // x * 0 = 0 or 0 * x = 0
            if ((left.type === "real" && left.value === 0) || (right.type === "real" && right.value === 0)) return real(0);
            // x * 1 = x
            if (right.type === "real" && right.value === 1) return left;
            // 1 * x = x
            if (left.type === "real" && left.value === 1) return right;
            // real folding: a * (b * x) = (a * b) * x
            if (left.type === "real" && right.type === "mul" && right.left.type === "real") {
                return mul(real(left.value * right.left.value), right.right);
            }
            // real folding: (a * x) * b = (a * b) * x
            if (right.type === "real" && left.type === "mul" && left.left.type === "real") {
                return mul(real(right.value * left.left.value), left.right);
            }

            // a^m * a^n = a^(m+n)
            if (left.type === "pow" && right.type === "pow" && left.left.equals(right.left)) {
                return simplifyStep(pow(left.left, simplifyStep(add(left.right, right.right))));
            }
            // a^n * a = a^(n+1)
            if (left.type === "pow" && left.left.equals(right)) {
                return simplifyStep(pow(left.left, simplifyStep(add(left.right, real(1)))));
            }
            // a * a^n = a^(n+1)
            if (right.type === "pow" && right.left.equals(left)) {
                return simplifyStep(pow(right.left, simplifyStep(add(right.right, real(1)))));
            }

            // (a/b) * (c/d) = (a*c)/(b*d)
            if (left.type === "div" && right.type === "div") {
                return simplifyStep(div(simplifyStep(mul(left.left, right.left)), simplifyStep(mul(left.right, right.right))));
            }
            // (a/b^n) * (k*b) = (k*a)/b^(n-1)  — cancel one factor of base from denominator power
            if (left.type === "div" && left.right.type === "pow" && right.type === "mul") {
                const base = left.right.left;
                if (right.right.equals(base)) {
                    const newNum = simplifyStep(mul(left.left, right.left));
                    const newExp = simplifyStep(sub(left.right.right, real(1)));
                    return simplifyStep(div(newNum, simplifyStep(pow(base, newExp))));
                }
                if (right.left.equals(base)) {
                    const newNum = simplifyStep(mul(left.left, right.right));
                    const newExp = simplifyStep(sub(left.right.right, real(1)));
                    return simplifyStep(div(newNum, simplifyStep(pow(base, newExp))));
                }
            }
            // (a/b^n) * b = a/b^(n-1)
            if (left.type === "div" && left.right.type === "pow" && right.equals(left.right.left)) {
                const newExp = simplifyStep(sub(left.right.right, real(1)));
                return simplifyStep(div(left.left, simplifyStep(pow(left.right.left, newExp))));
            }
            // (a/b) * c = (a*c)/b
            if (left.type === "div") {
                return simplifyStep(div(simplifyStep(mul(left.left, right)), left.right));
            }
            // a * (b/c) = (a*b)/c
            if (right.type === "div") {
                return simplifyStep(div(simplifyStep(mul(left, right.left)), right.right));
            }

            // (a * x) + (b * x) = (a + b) * x  [left here as comment — handled in add section]
            if (left.type === "mul" && right.type === "mul") {
                if (left.right.equals(right.right)) {
                    return mul(simplifyStep(add(left.left, right.left)), left.right);
                }
            }

            // distributive property: a * (b + c) = a * b + a * c
            if (right.type === "add" || right.type === "sub") {
                const a = right.left;
                const b = right.right;
                const leftMulA = simplifyStep(mul(left, a));
                const leftMulB = simplifyStep(mul(left, b));
                if (right.type === "add") {
                    return simplifyStep(add(leftMulA, leftMulB));
                } else {
                    return simplifyStep(sub(leftMulA, leftMulB));
                }
            }

            // distributive property: (a + b) * c = a * c + b * c
            if (left.type === "add" || left.type === "sub") {
                const a = left.left;
                const b = left.right;
                const aMulRight = simplifyStep(mul(a, right));
                const bMulRight = simplifyStep(mul(b, right));
                if (left.type === "add") {
                    return simplifyStep(add(aMulRight, bMulRight));
                } else {
                    return simplifyStep(sub(aMulRight, bMulRight));
                }
            }

            // canonical ordering: sort variable * variable alphabetically so x*y and y*x are the same
            if (left.type === "variable" && right.type === "variable" && left.name > right.name) {
                return mul(right, left);
            }

            // x * x = x^2
            if (left.equals(right)) return pow(left, real(2));
            // real folding: x * (a * x) = (a + 1) * x
            if (left.type === "variable" && right.type === "mul" && right.left.type === "real" && right.right.equals(left)) {
                return mul(add(real(1), right.left), left);
            }
            return mul(left, right);
        }

        if (type === "div") {
            // constant folding
            if (left.type === "real" && right.type === "real" && right.value !== 0) return real(left.value / right.value);
            // 0 / x = 0
            if (left.type === "real" && left.value === 0) return real(0);
            // x / 1 = x
            if (right.type === "real" && right.value === 1) return left;
            // x / x = 1
            if (left.equals(right)) return real(1);

            // (a/b) / c = a/(b*c)
            if (left.type === "div") {
                return simplifyStep(div(left.left, simplifyStep(mul(left.right, right))));
            }
            // a / (b/c) = (a*c)/b
            if (right.type === "div") {
                return simplifyStep(div(simplifyStep(mul(left, right.right)), right.left));
            }

            // a^m / a^n = a^(m-n)
            if (left.type === "pow" && right.type === "pow" && left.left.equals(right.left)) {
                const newExp = simplifyStep(sub(left.right, right.right));
                if (newExp.type === "real" && newExp.value === 0) return real(1);
                if (newExp.type === "real" && newExp.value > 0) return simplifyStep(pow(left.left, newExp));
                if (newExp.type === "real" && newExp.value < 0) return simplifyStep(div(real(1), pow(left.left, real(-newExp.value))));
                return simplifyStep(pow(left.left, newExp));
            }
            // a^m / a = a^(m-1)
            if (left.type === "pow" && left.left.equals(right)) {
                const newExp = simplifyStep(sub(left.right, real(1)));
                if (newExp.type === "real" && newExp.value === 0) return real(1);
                if (newExp.type === "real" && newExp.value < 0) return simplifyStep(div(real(1), pow(left.left, real(-newExp.value))));
                return simplifyStep(pow(left.left, newExp));
            }
            // a / a^n = 1/a^(n-1)
            if (right.type === "pow" && right.left.equals(left)) {
                const newExp = simplifyStep(sub(right.right, real(1)));
                if (newExp.type === "real" && newExp.value === 0) return real(1);
                if (newExp.type === "real" && newExp.value > 0) return simplifyStep(div(real(1), pow(left, newExp)));
                if (newExp.type === "real" && newExp.value < 0) return simplifyStep(pow(left, real(-newExp.value)));
                return simplifyStep(div(real(1), pow(left, newExp)));
            }

            // (a*b) / c: cancel c from numerator
            if (left.type === "mul") {
                if (left.left.equals(right)) return simplifyStep(left.right);
                if (left.right.equals(right)) return simplifyStep(left.left);
                // (a*b) / (a*c) = b/c  (and variants)
                if (right.type === "mul") {
                    if (left.left.equals(right.left)) return simplifyStep(div(left.right, right.right));
                    if (left.left.equals(right.right)) return simplifyStep(div(left.right, right.left));
                    if (left.right.equals(right.left)) return simplifyStep(div(left.left, right.right));
                    if (left.right.equals(right.right)) return simplifyStep(div(left.left, right.left));
                }
            }
            // a / (b*c): cancel a from denominator
            if (right.type === "mul") {
                if (right.left.equals(left)) return simplifyStep(div(real(1), right.right));
                if (right.right.equals(left)) return simplifyStep(div(real(1), right.left));
            }

            return div(left, right);
        }

        if (type === "pow") {
            // x^0 = 1
            if (right.type === "real" && right.value === 0) return real(1);
            // x^1 = x
            if (right.type === "real" && right.value === 1) return left;
            // constant folding
            if (left.type === "real" && right.type === "real") return real(Math.pow(left.value, right.value));
            // (a^m)^n = a^(m*n)
            if (left.type === "pow") {
                return simplifyStep(pow(left.left, simplifyStep(mul(left.right, right))));
            }
            return pow(left, right);
        }
    }

    return expression;
}

function simplify(expression) {
    let current = expression;
    for (let i = 0; i < 20; i++) {
        const next = simplifyStep(current);
        if (next.toString() === current.toString()) break;
        current = next;
    }
    return current;
}

function partial(expression, variable) {
    if (expression.children.length === 0) {
        return expression.equals(variable) ? real(1) : real(0);
    }
    const dExprDChildren = expression.nabla();
    const dChildrenDVariable = vec(...expression.children.map(c => partial(c, variable)));
    return dExprDChildren.prod(dChildrenDVariable);
}

function derivative(expression) {
    const partials = [];
    if(expression.type === "vector" || expression.type === "covector") {
        return covec(...expression.components.map(c => derivative(c)));
    }
    expression.vars.forEach((v) => {
        partials.push(partial(expression, v));
    })
    return covec(...partials);
}