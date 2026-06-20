import { Set } from "../Set/index.js";
import { Array } from "../Array/index.js";

/**
 * Symbolic is a library for symbolic maths. Main features are symbolic simplification and automatic differentiation. 
 * Expressions are represented as trees of objects, where each object has a type and methods for basic operations (add, sub, mul, div, pow) that return new expression objects. 
 * The library supports real numbers, variables, vectors, and covectors. 
 * The simplify function applies algebraic simplification rules to an expression, and the derivative function computes the symbolic derivative of an expression with respect to its variables.
 * 
 * An expression :: {
 *     type,
 *     value?,
 * 
 *     children: Array<expression>,
 *     vars => Set<variable> 
 *     
 *     add(other : expression) => expression
 *     sub(other : expression) => expression
 *     mul(other : expression) => expression
 *     div(denominator : expression) => expression
 *     
 *     flat() => expression
 *     simplify() => expression
 * 
 * 
 *     pullback() => covector of partial derivatives with respect to children
 *     derivative() => covector of partial derivatives with respect to vars
 * 
 *     toString() => string
 *     toVisual() => { type: "latex", value: string }
 *     equals(other : expression) => boolean
 * }
 * 
 */
const Symbolic = {
    real,
    realVar,
    vec,
    covec,
    add,
    sub,
    mul,
    div,
    poly,
    exp,
    log,
    derivative,
    simplify: (expr) => expr.simplify(),
};

export { Symbolic };

const TYPES = {
    real: "real",
    realVar: "realVar",
    vector: "vector",
    covector: "covector",
    add: "add",
    sub: "sub",
    mul: "mul",
    div: "div",
    poly: "poly",
    exp: "exp",
    log: "log",
}

function sortVars(vars) {
    return vars.sort((a, b) => a.name.localeCompare(b.name));
}

function mergeVars(...expressions) {
    return sortVars(Set.of(...expressions.flatMap(expression => expression.vars)).toArray());
}

function mergeAtomicExprMaps(...expressions) {
    const mergedMap = new Map();
    expressions.forEach((expression) => {
        if (!expression?.atomicExprMap) return;
        expression.atomicExprMap.forEach((atomicExpr, atomicKey) => {
            mergedMap.set(atomicKey, atomicExpr);
        });
    });
    return mergedMap;
}

function real(value) {
    const ans = { type: TYPES.real, value: value };
    ans.children = [];
    ans.vars = [];

    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);

    ans.flat = () => poly(new Map([["", ans]]));
    ans.simplify = () => ans;

    ans.pullback = () => {
        return real(0);
    };
    ans.derivative = () => {
        return covec(real(0));
    };

    ans.toString = () => ans.value.toString();
    ans.toVisual = () => ({ type: "latex", value: ans.value.toString() });
    ans.equals = (other) => other?.type === TYPES.real && other.value === value;
    return ans;
}

function realVar(name) {
    const ans = { type: TYPES.realVar, name };

    ans.children = [];
    ans.vars = [ans];

    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);

    ans.flat = () => poly(new Map([[name, real(1)]]), ans.vars);
    ans.simplify = () => ans;

    ans.pullback = () => {
        return real(1);
    };
    ans.derivative = () => {
        return covec(real(1));
    };

    ans.toString = () => name;
    ans.toVisual = () => ({ type: "latex", value: name });
    ans.equals = (other) => other?.type === ans.type && other.name === name;
    return ans;
}

// type: {name: string, symbol: string}, left: expression, right: expression
function binaryOp({ name, symbol }, left, right) {
    const ans = { type: name, left, right };

    ans.children = [left, right];
    ans.vars = mergeVars(left, right);

    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);

    ans.flat = () => {
        return ans; // default implementation.
    }
    ans.simplify = () => {
        return ans; // default implementation.
    };

    ans.pullback = () => {
        throw new Error(`pullback not implemented for ${name}`);
    };
    ans.derivative = () => {
        return derivative(ans);
    }

    ans.toString = () => `(${left.toString()} ${symbol} ${right.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `(${left.toVisual().value} ${symbol} ${right.toVisual().value})` });
    ans.equals = (other) => {
        if (other?.type !== name) return false;
        if (!left.equals(other.left)) return false;
        if (!right.equals(other.right)) return false;
        return true;
    }
    return ans;
}


function add(a, b) {
    const ans = binaryOp({ name: TYPES.add, symbol: "+" }, a, b);

    ans.flat = () => {
        const flatA = a.flat();
        const flatB = b.flat();
        return flatA.add(flatB);
    }
    ans.simplify = () => {
        if (a.type === TYPES.real && b.type === TYPES.real) return real(a.value + b.value);
        return ans.flat();
    }

    ans.pullback = () => {
        return covec(real(1), real(1));
    };

    return ans;
}

function sub(a, b) {
    const ans = binaryOp({ name: TYPES.sub, symbol: "-" }, a, b);

    ans.flat = () => {
        const flatA = a.flat();
        const flatB = b.flat();
        return flatA.sub(flatB);
    }
    ans.simplify = () => {
        if (a.type === TYPES.real && b.type === TYPES.real) return real(a.value - b.value);
        return ans.flat();
    }

    ans.pullback = () => {
        return covec(real(1), real(-1));
    };

    return ans;
}

function mul(a, b) {
    const ans = binaryOp({ name: TYPES.mul, symbol: "\\cdot" }, a, b);

    ans.flat = () => {
        const flatA = a.flat();
        const flatB = b.flat();
        return flatA.mul(flatB);
    }
    ans.simplify = () => {
        if (a.type === TYPES.real && b.type === TYPES.real) return real(a.value * b.value);
        return ans.flat();
    }

    ans.pullback = () => {
        return covec(b, a);
    };
    return ans;
}

function div(numerator, denominator) {
    const ans = binaryOp({ name: TYPES.div, symbol: "/" }, numerator, denominator);

    ans.flat = () => {
        const flatNumerator = numerator.flat();
        const flatDenominator = denominator.flat();
        return flatNumerator.div(flatDenominator);
    }
    ans.simplify = () => {
        if (numerator.type === TYPES.real && denominator.type === TYPES.real) return real(numerator.value / denominator.value);
        return ans.flat();
    }

    ans.pullback = () => {
        return covec(div(real(1), denominator), div(mul(real(-1), numerator), mul(denominator, denominator)));
    };

    ans.toVisual = () => ({ type: "latex", value: `\\frac{${numerator.toVisual().value}}{${denominator.toVisual().value}}` });
    return ans;
}

function polyToString(polyExpr, exprToStr,) {
    if (polyExpr.varCombCoeffsMap.size === 0) {
        return exprToStr(real(0));
    }
    return [...polyExpr.varCombCoeffsMap.entries()]
        .map(([varComb, coeff], i) => {
            const varCombStr = Array.fromArray(varComb.split("*"))
                .groupBy(v => v)
                .getEntries()
                .toArray()
                .sort((a, b) => {
                    // regular variables before atomic expressions (e.g. exp(...)), then alphabetically
                    const aIsAtomic = a.left().startsWith("__atomic__");
                    const bIsAtomic = b.left().startsWith("__atomic__");
                    if (aIsAtomic !== bIsAtomic) return aIsAtomic - bIsAtomic;
                    return a.left().localeCompare(b.left());
                })
                .map(pair => {
                    const [varName, occurrences] = [pair.left(), pair.right()];
                    let finalVarName = varName;
                    if (polyExpr.atomicExprMap.has(varName)) {
                        finalVarName = exprToStr(polyExpr.atomicExprMap.get(varName));
                    }
                    if (occurrences.length > 1) {
                        const base = varName.startsWith("__atomic__") ? `\\left(${finalVarName}\\right)` : finalVarName;
                        return `${base}^{${occurrences.length}}`;
                    }
                    return finalVarName;
                })
                .join("");
            const absCoeff = Math.abs(coeff.value);
            const coeffStr = absCoeff === 1 && varCombStr ? "" : exprToStr(real(absCoeff));
            const sign = coeff.value < 0 ? "-" : "+";
            return i === 0
                ? `${sign === "-" ? "-" : ""}${coeffStr}${varCombStr}`
                : `${sign} ${coeffStr}${varCombStr}`;
        }).join(" ");
}

function poly(varCombCoeffsMap, vars = [], atomicExprMap = new Map()) {
    // varCombCoeffsMap: Map<varComb: string, coeff>, varComb example: "x^2*y^3", "", coeff: field_expr
    const ans = { type: TYPES.poly, varCombCoeffsMap };
    ans.children = [];
    ans.vars = vars;
    ans.atomicExprMap = atomicExprMap; // Map<hash: string, expr: expression> for atomic expressions that are not polynomials, e.g., exp, log, etc.

    ans.add = (expr) => {
        // always creates a poly.
        const flatExpr = expr.flat();

        if (flatExpr.type === "ratioPoly") {
            // poly + num/denom = (poly * denom + num) / denom
            return ratioPoly(ans.mul(flatExpr.denominatorPoly).add(flatExpr.numeratorPoly), flatExpr.denominatorPoly);
        }

        const newVars = mergeVars(ans, expr);
        const newAtomicExprMap = mergeAtomicExprMaps(ans, flatExpr);
        const newVarCombCoeffsMap = new Map(ans.varCombCoeffsMap);
        flatExpr.varCombCoeffsMap.keys().forEach((varComb) => {
            const coeff = flatExpr.varCombCoeffsMap.get(varComb);
            if (ans.varCombCoeffsMap.has(varComb)) {
                const newCoeff = ans.varCombCoeffsMap.get(varComb).add(coeff).simplify();
                newVarCombCoeffsMap.set(varComb, newCoeff);
            } else {
                newVarCombCoeffsMap.set(varComb, coeff);
            }
        });
        // remove zero coeff terms        
        newVarCombCoeffsMap.forEach((coeff, varComb) => {
            if (coeff.type === TYPES.real && coeff.value === 0) {
                newVarCombCoeffsMap.delete(varComb);
            }
        });
        const newPoly = poly(newVarCombCoeffsMap, newVars, newAtomicExprMap);
        return newPoly;
    };
    ans.sub = (expr) => {
        // always creates a poly.
        const flatExpr = expr.flat();

        if (flatExpr.type === "ratioPoly") {
            // poly - num/denom = (poly * denom - num) / denom
            return ratioPoly(ans.mul(flatExpr.denominatorPoly).sub(flatExpr.numeratorPoly), flatExpr.denominatorPoly);
        }

        const newVars = mergeVars(ans, expr);
        const newAtomicExprMap = mergeAtomicExprMaps(ans, flatExpr);
        const newVarCombCoeffsMap = new Map(ans.varCombCoeffsMap);
        flatExpr.varCombCoeffsMap.keys().forEach((varComb) => {
            const coeff = flatExpr.varCombCoeffsMap.get(varComb);
            if (ans.varCombCoeffsMap.has(varComb)) {
                const newCoeff = ans.varCombCoeffsMap.get(varComb).sub(coeff).simplify();
                newVarCombCoeffsMap.set(varComb, newCoeff);
            } else {
                newVarCombCoeffsMap.set(varComb, mul(real(-1), coeff).simplify());
            }
        });
        // remove zero coeff terms        
        newVarCombCoeffsMap.forEach((coeff, varComb) => {
            if (coeff.type === TYPES.real && coeff.value === 0) {
                newVarCombCoeffsMap.delete(varComb);
            }
        });
        const newPoly = poly(newVarCombCoeffsMap, newVars, newAtomicExprMap);
        return newPoly;
    };
    ans.mul = (expr) => {
        // always creates a poly.
        const flatExpr = expr.flat();

        if (flatExpr.type === "ratioPoly") {
            // poly * (num/denom) = (poly * num) / denom
            return ratioPoly(ans.mul(flatExpr.numeratorPoly), flatExpr.denominatorPoly);
        }

        const newVars = mergeVars(ans, expr);
        const newAtomicExprMap = mergeAtomicExprMaps(ans, flatExpr);
        const newVarCombCoeffsMap = new Map();
        ans.varCombCoeffsMap.keys().forEach((varComb1) => {
            const coeff1 = ans.varCombCoeffsMap.get(varComb1);
            flatExpr.varCombCoeffsMap.keys().forEach((varComb2) => {
                const coeff2 = flatExpr.varCombCoeffsMap.get(varComb2);
                //Note that: [].join("*") => ""
                const newVarComb = [...varComb1.split("*"), ...varComb2.split("*")].filter(v => v !== "").sort().join("*");
                const newCoeff = coeff1.mul(coeff2).simplify();
                if (newVarCombCoeffsMap.has(newVarComb)) {
                    const existingCoeff = newVarCombCoeffsMap.get(newVarComb);
                    newVarCombCoeffsMap.set(newVarComb, existingCoeff.add(newCoeff).simplify());
                } else {
                    newVarCombCoeffsMap.set(newVarComb, newCoeff);
                }
            });
        });
        // remove zero coeff terms        
        newVarCombCoeffsMap.forEach((coeff, varComb) => {
            if (coeff.type === TYPES.real && coeff.value === 0) {
                newVarCombCoeffsMap.delete(varComb);
            }
        });
        const newPoly = poly(newVarCombCoeffsMap, newVars, newAtomicExprMap);
        return newPoly;
    };
    ans.div = (denominator) => {
        const flatDenominator = denominator.flat();
        if (flatDenominator.type === "ratioPoly") {
            // poly / (n/d) = (poly * d) / n
            return ratioPoly(ans.mul(flatDenominator.denominatorPoly), flatDenominator.numeratorPoly);
        }
        return ratioPoly(ans, flatDenominator);
    };

    ans.flat = () => ans;
    ans.unFlat = () => {
        const entries = [...ans.varCombCoeffsMap.entries()];
        let acc = ans.varCombCoeffsMap.get("") || real(0);
        entries.forEach(([varComb, coeff]) => {
            const varCombParts = varComb === "" ? [] : varComb.split("*");
            let mulAcc = coeff;
            varCombParts.forEach(v => {
                const monoid = ans.atomicExprMap.has(v) ? ans.atomicExprMap.get(v) : realVar(v);
                mulAcc = mulAcc.mul(monoid);
            });
            acc = acc.add(mulAcc);
        });
        return acc;
    };
    ans.simplify = () => ans;

    ans.pullback = () => {
        throw new Error("Pullback of polynomials not implemented");
    };
    ans.derivative = () => {
        return ans.unFlat().derivative();
    };

    ans.toString = () => polyToString(ans, coeff => coeff.toString());
    ans.toVisual = () => ({ type: "latex", value: polyToString(ans, coeff => coeff.toVisual().value) });
    ans.equals = (other) => {
        if (other?.type !== TYPES.poly) return false;
        if (ans.vars.length !== other.vars.length) return false;
        for (let i = 0; i < ans.vars.length; i++) {
            if (!ans.vars[i].equals(other.vars[i])) return false;
        }
        if (ans.varCombCoeffsMap.size !== other.varCombCoeffsMap.size) return false;
        for (let [varComb, coeff] of ans.varCombCoeffsMap.entries()) {
            if (!other.varCombCoeffsMap.has(varComb)) return false;
            if (!coeff.equals(other.varCombCoeffsMap.get(varComb))) return false;
        }
        return true;
    }
    return ans;
}

function simplifyRatioPoly(numeratorPoly, denominatorPoly) {
    // Simplify the ratio of two polynomials by factoring out common factors.
    // For now, we will just return the numerator and denominator as is.
    return [numeratorPoly, denominatorPoly];
}

// numerator and denominator must be polynomials. 
function ratioPoly(numeratorPoly, denominatorPoly) {
    if (numeratorPoly.type !== TYPES.poly || denominatorPoly.type !== TYPES.poly) {
        throw new Error("ratioPoly only accepts polynomials as numerator and denominator");
    }
    const [simplifiedNumerator, simplifiedDenominator] = simplifyRatioPoly(numeratorPoly, denominatorPoly);
    const ans = { type: "ratioPoly", numeratorPoly: simplifiedNumerator, denominatorPoly: simplifiedDenominator };

    ans.vars = mergeVars(simplifiedNumerator, simplifiedDenominator);
    ans.children = [simplifiedNumerator, simplifiedDenominator];

    // Normalize any flat expression to {numeratorPoly, denominatorPoly}
    function asRatio(expr) {
        const f = expr.flat();
        if (f.type === "ratioPoly") return f;
        if (f.type === TYPES.poly) return ratioPoly(f, poly(new Map([["", real(1)]]), f.vars));
        throw new Error(`Cannot convert ${f.type} to ratioPoly`);
    }

    ans.add = (other) => {
        // (n1/d1) + (n2/d2) = (n1*d2 + n2*d1) / (d1*d2)
        const { numeratorPoly: n2, denominatorPoly: d2 } = asRatio(other);
        return ratioPoly(
            numeratorPoly.mul(d2).add(n2.mul(denominatorPoly)),
            denominatorPoly.mul(d2)
        );
    };
    ans.sub = (other) => {
        // (n1/d1) - (n2/d2) = (n1*d2 - n2*d1) / (d1*d2)
        const { numeratorPoly: n2, denominatorPoly: d2 } = asRatio(other);
        return ratioPoly(
            numeratorPoly.mul(d2).sub(n2.mul(denominatorPoly)),
            denominatorPoly.mul(d2)
        );
    };
    ans.mul = (other) => {
        // (n1/d1) * (n2/d2) = (n1*n2) / (d1*d2)
        const { numeratorPoly: n2, denominatorPoly: d2 } = asRatio(other);
        return ratioPoly(
            numeratorPoly.mul(n2),
            denominatorPoly.mul(d2)
        );
    };
    ans.div = (other) => {
        // (n1/d1) / (n2/d2) = (n1*d2) / (d1*n2)
        const { numeratorPoly: n2, denominatorPoly: d2 } = asRatio(other);
        return ratioPoly(
            numeratorPoly.mul(d2),
            denominatorPoly.mul(n2)
        );
    };

    ans.flat = () => ratioPoly(numeratorPoly.flat(), denominatorPoly.flat());
    ans.unFlat = () => div(numeratorPoly.unFlat(), denominatorPoly.unFlat());
    ans.simplify = () => ratioPoly(numeratorPoly.simplify(), denominatorPoly.simplify());

    ans.pullback = () => {
        throw new Error(`pullback not implemented for ratioPoly`);
    };
    ans.derivative = () => ans.unFlat().derivative();

    ans.toString = () => `(${numeratorPoly.toString()}) / (${denominatorPoly.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `\\frac{${numeratorPoly.toVisual().value}}{${denominatorPoly.toVisual().value}}` });
    ans.equals = (other) => {
        if (other?.type !== "ratioPoly") return false;
        if (!numeratorPoly.equals(other.numeratorPoly)) return false;
        if (!denominatorPoly.equals(other.denominatorPoly)) return false;
        return true;
    };
    return ans;
}

function vec(...components) {
    const ans = { type: TYPES.vector, components };

    ans.dim = components.length;
    ans.children = components;
    ans.vars = sortVars(Set.of(...components.flatMap(c => c.vars)).toArray());

    ans.add = (other) => {
        if (other.type !== TYPES.vector || other.components.length !== components.length) {
            throw new Error("Can only add vectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.add(other.components[i]));
        return vec(...newComponents);
    };
    ans.sub = (other) => {
        if (other.type !== TYPES.vector || other.components.length !== components.length) {
            throw new Error("Can only subtract vectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.sub(other.components[i]));
        return vec(...newComponents);
    }
    ans.mul = (other) => {
        if (other.type !== TYPES.vector || other.components.length !== components.length) {
            throw new Error("Can only multiply vectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.mul(other.components[i]));
        return vec(...newComponents);
    };
    ans.div = (denominator) => {
        if (denominator.type !== TYPES.vector || denominator.components.length !== components.length) {
            throw new Error("Can only divide vectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.div(denominator.components[i]));
        return vec(...newComponents);
    };
    ans.scale = (factor) => {
        const newComponents = components.map(c => c.mul(factor));
        return vec(...newComponents);
    };
    ans.prod = (covector) => {
        if (covector.type !== TYPES.vector || covector.components.length !== components.length) {
            throw new Error("Can only take the product of a covector and a vector of the same dimension");
        }
        const products = components.map((c, i) => {
            const vectorComponent = covector.components[i];
            if (c.type === TYPES.vector || c.type === TYPES.covector) {
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


    ans.flat = () => {
        const flatComponents = components.map(c => c.flat());
        return vec(...flatComponents);
    }
    ans.simplify = () => {
        const simplifiedComponents = components.map(c => c.simplify());
        return vec(...simplifiedComponents);
    };

    ans.pullback = () => {
        const components = ans.components.map(c => c.pullback());
        return covec(...components);
    }
    ans.derivative = () => {
        const components = ans.components.map(c => c.derivative());
        return covec(...components);
    }


    ans.toString = () => `vec(${components.map(c => c.toString()).join(", ")})`;
    ans.toVisual = () => ({ type: "latex", value: `(${components.map(c => c.toVisual().value).join(", ")})` });
    ans.equals = (other) => {
        if (other?.type !== TYPES.vector || other.components.length !== components.length) {
            return false;
        }
        for (let i = 0; i < components.length; i++) {
            if (!components[i].equals(other.components[i])) {
                return false;
            }
        }
        return true;
    }
    return ans;
}

function covec(...components) {
    const ans = { type: TYPES.covector, components };
    ans.dim = components.length;
    ans.children = components;
    ans.vars = sortVars(Set.of(...components.flatMap(c => c.vars)).toArray());

    ans.add = (other) => {
        if (other.type !== TYPES.covector || other.components.length !== components.length) {
            throw new Error("Can only add covectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.add(other.components[i]));
        return covec(...newComponents);
    };
    ans.sub = (other) => {
        if (other.type !== TYPES.covector || other.components.length !== components.length) {
            throw new Error("Can only subtract covectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.sub(other.components[i]));
        return covec(...newComponents);
    }
    ans.mul = (other) => {
        if (other.type !== TYPES.covector || other.components.length !== components.length) {
            throw new Error("Can only multiply covectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.mul(other.components[i]));
        return covec(...newComponents);
    };
    ans.div = (denominator) => {
        if (denominator.type !== TYPES.covector || denominator.components.length !== components.length) {
            throw new Error("Can only divide covectors of the same dimension");
        }
        const newComponents = components.map((c, i) => c.div(denominator.components[i]));
        return covec(...newComponents);
    };
    ans.scale = (factor) => {
        const newComponents = components.map(c => c.mul(factor));
        return covec(...newComponents);
    };
    ans.prod = (vector) => {
        if (vector.type !== TYPES.vector || vector.components.length !== components.length) {
            throw new Error("Can only take the product of a covector and a vector of the same dimension");
        }
        const products = components.map((c, i) => {
            const vectorComponent = vector.components[i];
            if (c.type === TYPES.vector || c.type === TYPES.covector) {
                return c.scale(vectorComponent);
            }
            return vectorComponent.mul(c);
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

    ans.flat = () => {
        const flatComponents = components.map(c => c.flat());
        return covec(...flatComponents);
    }
    ans.simplify = () => {
        const simplifiedComponents = components.map(c => c.simplify());
        return covec(...simplifiedComponents);
    };

    ans.pullback = () => {
        const components = ans.components.map(c => c.pullback());
        return covec(...components);
    }
    ans.derivative = () => {
        const components = ans.components.map(c => c.derivative());
        return covec(...components);
    };

    ans.toString = () => `covec(${components.map(c => c.toString()).join(", ")})`;
    ans.toVisual = () => ({ type: "latex", value: `[${components.map(c => c.toVisual().value).join(", ")}]` });
    ans.equals = (other) => {
        if (other?.type !== TYPES.covector || other.components.length !== components.length) {
            return false;
        }
        for (let i = 0; i < components.length; i++) {
            if (!components[i].equals(other.components[i])) {
                return false;
            }
        }
    };
    return ans;
}

function singleArgFunc({ name }, arg) {
    const ans = { type: name, value: arg };
    ans.children = [arg];
    ans.vars = arg.vars;

    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);

    ans.flat = () => {
        return ans; // default implementation.
    }
    ans.simplify = () => {
        return ans; // default implementation.
    };

    ans.pullback = () => {
        throw new Error(`pullback not implemented for ${name}`);
    };
    ans.derivative = () => {
        return derivative(ans);
    }

    ans.toString = () => `${name}(${arg.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `${name}(${arg.toVisual().value})` });
    ans.equals = (other) => {
        if (other?.type !== name) return false;
        if (!arg.equals(other.value)) return false;
        return true;
    }

    return ans;
}

const hash_str = (s) => {
    let hash = 0;
    let prime = 1;
    for (let i = 0; i < s.length; i++) {
        hash = hash + s.charCodeAt(i) * prime;
        prime = prime * 31;
    }
    return hash;
}

function hashAtomic(expr) {
    return hash_str(expr.toString());
}

function exp(value) {
    const ans = singleArgFunc({ name: "exp" }, value);

    ans.flat = () => {
        const flat = exp(value.flat());
        const hash = hashAtomic(flat);
        const atomicVarStr = `__atomic__${hash}`;
        return poly(new Map([[atomicVarStr, real(1)]]), flat.vars, new Map([[atomicVarStr, flat]]));
    }

    ans.simplify = () => {
        return ans.flat();
    }

    ans.pullback = () => {
        // d(e^value)/d(value) = e^value
        return covec(ans);
    };

    ans.toVisual = () => ({ type: "latex", value: `e^{${value.toVisual().value}}` });

    return ans;
}

function log(value) {
    const ans = singleArgFunc({ name: "log" }, value);

    ans.flat = () => {
        const flat = log(value.flat());
        const hash = hashAtomic(flat);
        const atomicVarStr = `__atomic__${hash}`;
        return poly(new Map([[atomicVarStr, real(1)]]), flat.vars, new Map([[atomicVarStr, flat]]));
    }

    ans.simplify = () => {
        return ans.flat();
    }

    ans.pullback = () => {
        // d(log(value))/d(value) = 1/value
        return covec(div(real(1), value));
    };

    ans.toVisual = () => ({ type: "latex", value: `\\log(${value.toVisual().value})` });

    return ans;
}


function partial(expression, variable) {
    if (expression.type === TYPES.poly || expression.type === "ratioPoly") {
        return partial(expression.unFlat(), variable);
    }
    // partial of atomics like real and realVar.
    if (expression.children.length === 0) {
        if (expression.equals(variable)) {
            return real(1);
        }
        return real(0);
    }
    const dExprDChildren = expression.pullback();
    const dChildrenDVariable = vec(...expression.children.map(c => partial(c, variable)));
    return dExprDChildren.prod(dChildrenDVariable);
}

function derivative(expression) {
    const partials = [];
    if (expression.type === TYPES.vector || expression.type === TYPES.covector) {
        return covec(...expression.components.map(c => derivative(c)));
    }
    expression.vars.forEach((v) => {
        partials.push(partial(expression, v));
    })
    return partials.length === 1 ? partials[0] : covec(...partials);
}