export function add(a, b) {
    const ans = { type: "add", left: a, right: b };
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => mul(field(factor), ans);
    ans.toString = () => `(${a.toString()} + ${b.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `(${a.toVisual().value} + ${b.toVisual().value})` });
    ans.simplify = () => {
        const simplifiedA = typeof a.simplify === "function" ? a.simplify() : a;
        const simplifiedB = typeof b.simplify === "function" ? b.simplify() : b;

        if (simplifiedA.type === "mul" && simplifiedB.type === "variable" && simplifiedA.name === simplifiedB.name) {
            return mul(field(2), variable(simplifiedA.name));
        }

        if (simplifiedA.type === "constant" && simplifiedB.type === "constant") {
            return field(simplifiedA.fieldValue.add(simplifiedB.fieldValue));
        }
    }

    return ans;
}

export function sub(a, b) {
    const ans = { type: "sub", left: a, right: b };
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => mul(field(factor), ans);
    ans.toString = () => `(${a.toString()} - ${b.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `(${a.toVisual().value} - ${b.toVisual().value})` });
    return ans;
}

export function mul(a, b) {
    const ans = { type: "mul", left: a, right: b };
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => mul(field(factor), ans);
    ans.toString = () => `(${a.toString()} * ${b.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `(${a.toVisual().value} \\cdot ${b.toVisual().value})` });
    return ans;
}

export function div(numerator, denominator) {
    const ans = { type: "div", left: numerator, right: denominator };
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => mul(field(factor), ans);
    ans.toString = () => `(${numerator.toString()} / ${denominator.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `\\frac{${numerator.toVisual().value}}{${denominator.toVisual().value}}` });
    return ans;
}

export function field(value) {
    const ans = { type: "real", fieldValue: String(value) };
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => mul(field(factor), ans);
    ans.toString = () => ans.fieldValue.toString();
    ans.toVisual = () => ({ type: "latex", value: ans.fieldValue.toString() });
    return ans;
}

export function variable(name) {
    const ans = { type: "variable", name };
    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);
    ans.scale = (factor) => mul(field(factor), ans);
    ans.toString = () => name;
    ans.toVisual = () => ({ type: "latex", value: name });
    return ans;
}