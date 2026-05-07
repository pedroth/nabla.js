import { Set } from "../Set/index.js";


const binaryOps = {
    add,
    sub,
    mul,
    div
};

const values = {
    real,
    variable,
    vec,
    covec
};

// type: {name: string, symbol: string}, left: expression, right: expression
export function binaryOp({ name, symbol }, left, right) {
    const ans = { type: name, left, right };
    ans.children = [left, right];
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => mul(real(factor), ans);
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

export function add(a, b) {
    const ans = binaryOp({ name: "add", symbol: "+" }, a, b);
    ans.nabla = () => {
        return covec(real(1), real(1));
    };
    return ans;
}

export function sub(a, b) {
    const ans = binaryOp({ name: "sub", symbol: "-" }, a, b);
    ans.nabla = () => {
        return covec(real(1), real(-1));
    };
    return ans;
}

export function mul(a, b) {
    const ans = binaryOp({ name: "mul", symbol: "\\cdot" }, a, b);
    ans.nabla = () => {
        return covec(b, a);
    };
    return ans;
}

export function div(numerator, denominator) {
    const ans = binaryOp({ name: "div", symbol: "/" }, numerator, denominator);
    ans.toVisual = () => ({ type: "latex", value: `\\frac{${numerator.toVisual().value}}{${denominator.toVisual().value}}` });
    ans.nabla = () => {
        return covec(div(real(1), denominator), div(mul(real(-1), numerator), mul(denominator, denominator)));
    };
    return ans;
}

export function real(value) {
    const ans = { type: "real", value: value };
    ans.children = [];
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => mul(real(factor), ans);
    ans.toString = () => ans.value.toString();
    ans.toVisual = () => ({ type: "latex", value: ans.value.toString() });
    ans.equals = (other) => other?.type === "real" && other.value === value;
    ans.nabla = () => {
        return real(0);
    };
    ans.vars = Set.of();
    return ans;
}

export function variable(name) {
    const ans = { type: "variable", name };
    ans.children = [];
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => mul(real(factor), ans);
    ans.toString = () => name;
    ans.toVisual = () => ({ type: "latex", value: name });
    ans.equals = (other) => other?.type === "variable" && other.name === name;
    ans.nabla = () => {
        return real(1);
    };
    ans.vars = Set.of(ans);
    return ans;
}

export function vec(...components) {
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

export function covec(...components) {
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

export function simplify(expression) {
    const { type } = expression;

    if (type === "vector" || type === "covector") {
        const newComponents = expression.components.map(c => simplify(c));
        return type === "vector" ? vec(...newComponents) : covec(...newComponents);
    }

    if (type === "add" || type === "sub" || type === "mul" || type === "div") {
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
                return mul(simplify(add(real(1), left.left)), right);
            }

            // (a * x) + (b * x) = (a + b) * x
            if (left.type === "mul" && right.type === "mul") {
                if (left.right.equals(right.right)) {
                    return mul(simplify(add(left.left, right.left)), left.right);
                }
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
                return mul(simplify(add(real(1), mul(real(-1), right.left))), left);
            }
            // real folding: (a * x) - x = (a - 1) * x
            if (right.type === "variable" && left.type === "mul" && left.left.type === "real" && left.right.equals(right)) {
                return mul(simplify(add(left.left, real(-1))), right);
            }

            // (a * x) - (b * x) = (a - b) * x
            if (left.type === "mul" && right.type === "mul") {
                if (left.right.equals(right.right)) {
                    return mul(simplify(add(left.left, mul(real(-1), right.left))), left.right);
                }
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
            // (a * x) + (b * x) = (a + b) * x
            if (left.type === "mul" && right.type === "mul") {
                if (left.right.equals(right.right)) {
                    return mul(simplify(add(left.left, right.left)), left.right);
                }
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
            return div(left, right);
        }
    }

    return expression;

}

export function partial(expression, variable) {
    if (expression.children.length === 0) {
        return expression.equals(variable) ? real(1) : real(0);
    }
    const dExprDChildren = expression.nabla();
    const dChildrenDVariable = vec(...expression.children.map(c => partial(c, variable)));
    return dExprDChildren.prod(dChildrenDVariable);
}

export function derivative(expression) {
    const partials = [];
    expression.vars.forEach((v) => {
        partials.push(partial(expression, v));
    })
    return covec(...partials);
}