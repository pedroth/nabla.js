import { Set } from "../Set/index.js";
import { NArray } from "../NArray/index.js";
import { Maybe } from "../Maybe/index.js";

/**
 * Symbolic is a library for symbolic maths. Main features are symbolic simplification and automatic differentiation.
 * Expressions are represented as trees of objects, where each object has a type and methods for basic operations
 * (add, sub, mul, div) that return new expression objects.
 * The library supports real numbers, variables, complex numbers, vectors, covectors, and transcendental functions (exp, log).
 * The simplify function applies algebraic simplification rules to an expression, and the derivative function computes
 * the symbolic derivative of an expression with respect to its variables.
 *
 * Concrete expression types:
 *   - real(value: number)                          — scalar real constant
 *   - realVar(name: string)                        — scalar real variable
 *   - complex(real: expression, imag: expression)  — complex number
 *   - vec(...components: expression[])             — column vector
 *   - covec(...components: expression[])           — row covector
 *   - exp(value: expression)                       — e^value
 *   - log(value: expression)                       — natural logarithm
 *   - vectorVar(name: string, dim: number)         — vec of realVars named `name_i`
 *   - covectorVar(name: string, dim: number)       — covec of realVars named `name_i`
 *   - matrixVar(name: string, rows: number, cols: number) — vec of covecs named `name_i^j`
 *
 * An expression :: {
 *     type: string,
 *     value?: number | expression,
 *
 *     children: NArray<expression>,
 *     vars: NArray<variable>,
 *
 *     add(other: expression) => expression
 *     sub(other: expression) => expression
 *     mul(other: expression) => expression
 *     div(denominator: expression) => expression
 *
 *     flat() => poly | ratioPoly | vec | covec
 *     simplify() => poly | ratioPoly | expression
 *
 *     pullback() => covector of partial derivatives with respect to children
 *     derivative() => covector of partial derivatives with respect to vars
 *     eval(variableValues: { [variableName: string]: expression }) => expression
 *
 *     toString() => string
 *     toVisual() => { type: "latex", value: string }
 *     equals(other: expression) => boolean
 * }
 *
 * Additional properties/methods on vec and covec:
 *     dim: number
 *     components: NArray<expression>
 *     transpose() => vec | covec
 *     prod(other: vec | covec | expression) => expression | vec | covec
 *     dot(other: vec | covec) => expression
 *     map(fn: (c: expression) => expression) => vec | covec
 *
 * Additional method on complex:
 *     conj() => complex           — complex conjugate
 *
 * Public API: Symbolic.{ real, realVar, complex, vec, covec, add, sub, mul, div, poly,
 *                         exp, log, derivative, simplify, vectorVar, covectorVar, matrixVar }
 */

// =============================================================================
// Constants
// =============================================================================

const TYPES = {
    real: "real",
    realVar: "realVar",
    complex: "complex",
    vector: "vector",
    covector: "covector",
    add: "add",
    sub: "sub",
    mul: "mul",
    div: "div",
    poly: "poly",
    exp: "exp",
    log: "log",
    ratioPoly: "ratioPoly",
};

// =============================================================================
// Helpers
// =============================================================================

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

// Generic sign/magnitude helpers for atomic field coefficients (real or complex)
function coeffIsNegative(coeff) {
    if (coeff.type === TYPES.real) return coeff.value < 0;
    if (coeff.type === TYPES.complex) {
        // Sign is driven by whichever component is non-zero (real takes priority),
        // matching the convention that complex() collapses to real when imag is zero.
        if (coeff.real.type === TYPES.real && coeff.real.value !== 0) {
            return coeff.real.value < 0;
        }
        if (coeff.imag.type === TYPES.real) {
            return coeff.imag.value < 0;
        }
    }
    return false;
}

function coeffAbs(coeff) {
    if (!coeffIsNegative(coeff)) return coeff;
    if (coeff.type === TYPES.real) return real(Math.abs(coeff.value));
    if (coeff.type === TYPES.complex) return atomicFieldMul(coeff, real(-1));
    return coeff;
}

function polyToString(polyExpr, exprToStr) {
    if (polyExpr.varCombCoeffsMap.size === 0) {
        return exprToStr(real(0));
    }
    const nonZeroEntries = [...polyExpr.varCombCoeffsMap.entries()]
        .filter(([, coeff]) => !isZero(coeff));

    if (nonZeroEntries.length === 0) {
        return exprToStr(real(0));
    }

    return nonZeroEntries
        .map(([varComb, coeff], i) => {
            const varCombStr = NArray.fromArray(varComb.split("*"))
                .groupBy(v => v)
                .getEntries()
                .toArray()
                .sort((a, b) => {
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

            const isNegative = coeffIsNegative(coeff);
            const absCoeff = coeffAbs(coeff);
            const sign = isNegative ? "-" : "+";
            const coeffStr = (absCoeff.type === TYPES.real && absCoeff.value === 1 && varCombStr)
                ? ""
                : exprToStr(absCoeff);

            return i === 0
                ? `${isNegative ? "-" : ""}${coeffStr}${varCombStr}`
                : `${sign} ${coeffStr}${varCombStr}`;
        }).join(" ");
}

function hash_str(s) {
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

function gcd(a, b) {
    const posA = Math.abs(a);
    const posB = Math.abs(b);
    if (posA < posB) return gcd(posB, posA);
    if (posB === 0) return posA;
    return gcd(posB, posA % posB);
}

function simplifyRatioPoly(numeratorPoly, denominatorPoly) {
    // Simplify the ratio of two polynomials by factoring out common factors.
    return extractReal(numeratorPoly.flat())
        .flatMap(num =>
            extractReal(denominatorPoly.flat())
                .map(denom => {
                    const commonDiv = gcd(num.value, denom.value);
                    let simplifiedNum = num.value / commonDiv;
                    let simplifiedDenom = denom.value / commonDiv;
                    // Normalize sign: keep denominator positive
                    if (simplifiedDenom < 0) {
                        simplifiedNum = -simplifiedNum;
                        simplifiedDenom = -simplifiedDenom;
                    }
                    return [poly(new Map([["", real(simplifiedNum)]])), poly(new Map([["", real(simplifiedDenom)]]))];
                })
        )
        // For now, we will just return the numerator and denominator .
        .orElse(() => [numeratorPoly, denominatorPoly]);
}

function extractReal(expr) {
    if (expr.type === TYPES.real) return Maybe.some(expr);
    if (expr.type === TYPES.ratioPoly) {
        return extractReal(expr.numeratorPoly)
            .flatMap(num =>
                extractReal(expr.denominatorPoly)
                    .map(denom => real(num.value / denom.value))
            );
    }
    const flatExpr = expr.flat();
    // constant poly with no variables,
    if (
        flatExpr.type === TYPES.poly &&
        flatExpr.varCombCoeffsMap.has("") &&
        flatExpr.varCombCoeffsMap.size === 1
    ) {
        const coeff = flatExpr.varCombCoeffsMap.get("");
        if (coeff.type === TYPES.real) return Maybe.some(coeff);
    }
    return Maybe.none();
}

function isPolyJustAReal(poly, value) {
    if (poly.varCombCoeffsMap.size === 0 && value === 0) return true;
    return extractReal(poly).map(r => r.value === value).orElse(() => false);
}

function isZero(expr) {
   return isReal(expr, 0);
}

function isReal(expr, value = 0) {
    if (expr.type === TYPES.real && expr.value === value) return true;
    if (
        expr.type === TYPES.complex &&
        expr.vars.length === 0 &&
        isReal(expr.real, 0) &&
        isReal(expr.imag, 0)
    ) return true;
    const flatExpr = expr.flat();
    if (flatExpr.type === TYPES.poly) {
        return isPolyJustAReal(flatExpr, value);
    }
    return false;
}

function isAtomicField(expr) {
    return expr.type === TYPES.real || (expr.type === TYPES.complex && expr.vars.length === 0);

}

function toComplexPair(a) {
    if (a.type === TYPES.real) return [a.value, 0];
    return [a.real.value, a.imag.value];
}

function atomicFieldAdd(a, b) {
    const [ar, ai] = toComplexPair(a);
    const [br, bi] = toComplexPair(b);
    return complex(real(ar + br), real(ai + bi));
}

function atomicFieldSub(a, b) {
    const [ar, ai] = toComplexPair(a);
    const [br, bi] = toComplexPair(b);
    return complex(real(ar - br), real(ai - bi));
}

function atomicFieldMul(a, b) {
    const [ar, ai] = toComplexPair(a);
    const [br, bi] = toComplexPair(b);
    // Avoid NaN * 0 = NaN (IEEE 754): short-circuit for pure-real inputs
    if (ai === 0 && bi === 0) return complex(real(ar * br), real(0));
    return complex(real(ar * br - ai * bi), real(ar * bi + ai * br));
}

function atomicFieldDiv(a, b) {
    const [ar, ai] = toComplexPair(a);
    const [br, bi] = toComplexPair(b);
    const denom = br * br + bi * bi;
    if (denom === 0) throw new Error("division by zero");
    return complex(real((ar * br + ai * bi) / denom), real((ai * br - ar * bi) / denom));
}

// Determine sign and magnitude string for a complex number's imaginary component.
// Only collapses "1"/"−1" to a bare sign when the imag part is a literal real;
// for anything else (variables, expressions) we just print it with a leading "+".
function formatImagPart(imagExpr, toStr) {
    if (imagExpr.type === TYPES.real) {
        const isNeg = imagExpr.value < 0;
        const absVal = Math.abs(imagExpr.value);
        const magStr = absVal === 1 ? "" : toStr(real(absVal));
        return { sign: isNeg ? "-" : "+", magStr };
    }
    return { sign: "+", magStr: toStr(imagExpr) };
}

// =============================================================================
// Atomic expressions
// =============================================================================

function real(value) {
    if (typeof value !== "number") { throw new Error("Value must be a number"); }
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
        return covec(real(0));
    };
    ans.derivative = () => {
        return derivative(ans);
    };
    ans.eval = () => ans;

    ans.toString = () => ans.value.toString();
    ans.toVisual = () => ({ type: "latex", value: ans.value.toString() });
    ans.equals = (other) => other?.type === TYPES.real && other.value === value;
    return ans;
}

function realVar(name, isParam = false) {
    const ans = { type: TYPES.realVar, name, isParam };

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
        return derivative(ans);
    };
    ans.eval = (variableValues) => {
        // return itself if value not provided, instead of throwing an error, to allow partial evaluation.
        if (!(ans.name in variableValues)) {
            return ans;
        }
        // check if is native number transforms to real, otherwise return the value as is.
        const value = variableValues[ans.name];
        if (typeof value === "number") {
            return real(value);
        }
        return value;
    };

    ans.toString = () => name;
    ans.toVisual = () => ({ type: "latex", value: name });
    ans.equals = (other) => other?.type === ans.type && other.name === name;
    return ans;
}

// real: real , imag: real 
function complex(realPart, imagPart) {
    if (typeof realPart === "number") realPart = real(realPart);
    if (typeof imagPart === "number") imagPart = real(imagPart);
    if (isZero(imagPart)) {
        return realPart;
    }
    const ans = { type: TYPES.complex, real: realPart, imag: imagPart };
    ans.children = [ans.real, ans.imag];
    ans.vars = mergeVars(ans.real, ans.imag);

    ans.add = (other) => add(ans, other);
    ans.sub = (other) => sub(ans, other);
    ans.mul = (other) => mul(ans, other);
    ans.div = (denominator) => div(ans, denominator);

    ans.conj = () => complex(ans.real, mul(ans.imag, real(-1)));

    ans.flat = () => {
        const realFlat = ans.real.flat();
        const imagFlat = ans.imag.flat();
        const varCoeffsMap = new Map();
        realFlat.varCombCoeffsMap.forEach((coeff, varComb) => {
            if (imagFlat.varCombCoeffsMap.has(varComb)) {
                varCoeffsMap.set(varComb, complex(coeff, imagFlat.varCombCoeffsMap.get(varComb)));
            } else {
                varCoeffsMap.set(varComb, coeff);
            }
        })
        imagFlat.varCombCoeffsMap.forEach((imagCoeff, imagVarComb) => {
            if (!varCoeffsMap.has(imagVarComb)) {
                varCoeffsMap.set(imagVarComb, complex(real(0), imagCoeff));
            }
        })
        return poly(varCoeffsMap, ans.vars, mergeAtomicExprMaps(realFlat, imagFlat));

    };
    ans.simplify = () => {
        return ans.flat();
    };
    ans.pullback = () => {
        // d(real + i*imag)/d(real, imag) = [1, i]
        return covec(real(1), complex(real(0), real(1)));
    };
    ans.derivative = () => {
        return derivative(ans);
    };
    ans.eval = (variableValues) => {
        const result = complex(ans.real.eval(variableValues), ans.imag.eval(variableValues));
        result.vars = ans.vars;
        return result;
    };

    ans.toString = () => {
        const { sign, magStr } = formatImagPart(ans.imag, e => e.toString());
        if (isZero(ans.real)) {
            return sign === "-" ? `(-${magStr}i)` : `(${magStr}i)`;
        }
        return `(${ans.real.toString()} ${sign} ${magStr}i)`;
    };

    ans.toVisual = () => {
        const { sign, magStr } = formatImagPart(ans.imag, e => e.toVisual().value);
        if (isZero(ans.real)) {
            if (magStr === "") {
                return { type: "latex", value: sign === "-" ? `-\\imath ` : `\\imath ` };
            }
            return { type: "latex", value: sign === "-" ? `-\\imath ${magStr}` : `\\imath ${magStr}` };
        }
        if (magStr === "") {
            return { type: "latex", value: `(${ans.real.toVisual().value} ${sign} \\imath)` };
        }
        return { type: "latex", value: `(${ans.real.toVisual().value} ${sign} \\imath ${magStr})` };
    }
    ans.equals = (other) => other?.type === TYPES.complex && other.real.equals(ans.real) && other.imag.equals(ans.imag);
    return ans;
}



// =============================================================================
// Binary operations
// =============================================================================

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
    };
    ans.simplify = () => {
        return ans; // default implementation.
    };

    ans.pullback = () => {
        throw new Error(`pullback not implemented for ${name}`);
    };
    ans.derivative = () => {
        return derivative(ans);
    };
    ans.eval = () => {
        throw new Error(`eval not implemented for ${name}`);
    }

    ans.toString = () => `(${left.toString()} ${symbol} ${right.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `(${left.toVisual().value} ${symbol} ${right.toVisual().value})` });
    ans.equals = (other) => {
        if (other?.type !== name) return false;
        if (!left.equals(other.left)) return false;
        if (!right.equals(other.right)) return false;
        return true;
    };
    return ans;
}

function add(a, b) {
    const ans = binaryOp({ name: TYPES.add, symbol: "+" }, a, b);

    ans.flat = () => {
        const flatA = a.flat();
        const flatB = b.flat();
        return flatA.add(flatB);
    };
    ans.simplify = () => {
        if (isAtomicField(a) && isAtomicField(b)) return atomicFieldAdd(a, b);
        return ans.flat().simplify();
    };

    ans.pullback = () => {
        return covec(real(1), real(1));
    };
    ans.eval = (variableValues) => {
        const evalA = a.eval(variableValues);
        const evalB = b.eval(variableValues);
        return evalA.add(evalB);
    }

    return ans;
}

function sub(a, b) {
    const ans = binaryOp({ name: TYPES.sub, symbol: "-" }, a, b);

    ans.flat = () => {
        const flatA = a.flat();
        const flatB = b.flat();
        return flatA.sub(flatB);
    };
    ans.simplify = () => {
        if (isAtomicField(a) && isAtomicField(b)) return atomicFieldSub(a, b);
        return ans.flat().simplify();
    };

    ans.pullback = () => {
        return covec(real(1), real(-1));
    };

    ans.eval = (variableValues) => {
        const evalA = a.eval(variableValues);
        const evalB = b.eval(variableValues);
        return evalA.sub(evalB);

    }
    return ans;
}

function mul(a, b) {
    const ans = binaryOp({ name: TYPES.mul, symbol: "\\cdot" }, a, b);

    ans.flat = () => {
        const flatA = a.flat();
        const flatB = b.flat();
        return flatA.mul(flatB);
    };
    ans.simplify = () => {
        if (isAtomicField(a) && isAtomicField(b)) return atomicFieldMul(a, b);
        return ans.flat().simplify();
    };

    ans.pullback = () => {
        return covec(b, a);
    };
    ans.eval = (variableValues) => {
        const evalA = a.eval(variableValues);
        const evalB = b.eval(variableValues);
        return evalA.mul(evalB);
    }
    return ans;
}

function div(numerator, denominator) {
    const ans = binaryOp({ name: TYPES.div, symbol: "/" }, numerator, denominator);

    ans.flat = () => {
        const flatNumerator = numerator.flat();
        const flatDenominator = denominator.flat();
        return flatNumerator.div(flatDenominator);
    };
    ans.simplify = () => {
        if (isAtomicField(numerator) && isAtomicField(denominator)) return atomicFieldDiv(numerator, denominator);
        return ans.flat().simplify();
    };

    ans.pullback = () => {
        return covec(div(real(1), denominator), div(mul(real(-1), numerator), mul(denominator, denominator)));
    };
    ans.eval = (variableValues) => {
        const evalNumerator = numerator.eval(variableValues);
        const evalDenominator = denominator.eval(variableValues);
        return evalNumerator.div(evalDenominator);
    };

    ans.toVisual = () => ({ type: "latex", value: `\\frac{${numerator.toVisual().value}}{${denominator.toVisual().value}}` });
    return ans;
}

// =============================================================================
// Polynomial expressions
// =============================================================================
function evaluatePoly(polyExpr, variableValues) {
    let acc = real(0);

    polyExpr.varCombCoeffsMap.forEach((coeff, varComb) => {
        let term = coeff.eval(variableValues);
        if (varComb !== "") {
            varComb.split("*").forEach((varName) => {
                const originalVar = polyExpr.vars.find(varObj => varObj.name === varName);
                const factor = polyExpr.atomicExprMap.has(varName)
                    ? polyExpr.atomicExprMap.get(varName)
                    : realVar(varName, originalVar?.isParam ?? false);
                term = term.mul(factor.eval(variableValues));
            });
        }
        acc = acc.add(term).simplify();
    });

    return acc;
}

function poly(varCombCoeffsMap, vars = [], atomicExprMap = new Map()) {
    // varCombCoeffsMap: Map<varComb: string, coeff>, varComb example: "x*x*y*y*y", "", coeff: field_expr
    const ans = { type: TYPES.poly, varCombCoeffsMap };
    ans.children = [];
    ans.vars = vars;
    ans.atomicExprMap = atomicExprMap; // Map<hash: string, expr: expression> for atomic expressions that are not polynomials, e.g., exp, log, etc.

    ans.add = (expr) => {
        // always creates a poly.
        const flatExpr = expr.flat();

        if (flatExpr.type === TYPES.ratioPoly) {
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

        if (flatExpr.type === TYPES.ratioPoly) {
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

        if (flatExpr.type === TYPES.ratioPoly) {
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
        if (flatDenominator.type === TYPES.ratioPoly) {
            // poly / (n/d) = (poly * d) / n
            return ratioPoly(ans.mul(flatDenominator.denominatorPoly), flatDenominator.numeratorPoly);
        }
        return ratioPoly(ans, flatDenominator);
    };

    ans.flat = () => ans;
    ans.unFlat = () => {
        const entries = [...ans.varCombCoeffsMap.entries()];
        let acc = real(0);
        entries.forEach(([varComb, coeff]) => {
            const varCombParts = varComb === "" ? [] : varComb.split("*");
            let mulAcc = coeff;
            varCombParts.forEach(v => {
                const originalVar = ans.vars.find(varObj => varObj.name === v);
                const monoid = ans.atomicExprMap.has(v) ? ans.atomicExprMap.get(v) : realVar(v, originalVar?.isParam ?? false);
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
    ans.eval = (variableValues) => evaluatePoly(ans, variableValues)

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

// numerator and denominator must be polynomials.
function ratioPoly(numeratorPoly, denominatorPoly) {
    if (numeratorPoly.type !== TYPES.poly || denominatorPoly.type !== TYPES.poly) {
        throw new Error("ratioPoly only accepts polynomials as numerator and denominator");
    }
    [numeratorPoly, denominatorPoly] = simplifyRatioPoly(numeratorPoly, denominatorPoly);
    const ans = { type: TYPES.ratioPoly, numeratorPoly, denominatorPoly };

    ans.vars = mergeVars(numeratorPoly, denominatorPoly);
    ans.children = [numeratorPoly, denominatorPoly];

    // Normalize any flat expression to {numeratorPoly, denominatorPoly}
    function asRatio(expr) {
        const f = expr.flat();
        if (f.type === TYPES.ratioPoly) return f;
        if (f.type === TYPES.poly) return ratioPoly(f, poly(new Map([["", real(1)]]), f.vars));
        throw new Error(`Cannot convert ${f.type} to ${TYPES.ratioPoly}`);
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
    ans.simplify = () => {
        const flat = ans.flat();
        if (isPolyJustAReal(flat.numeratorPoly, 0)) {
            return real(0);
        }
        if (isPolyJustAReal(flat.denominatorPoly, 1)) {
            return flat.numeratorPoly;
        }
        return flat;
    };

    ans.pullback = () => {
        throw new Error(`pullback not implemented for ratioPoly`);
    };
    ans.derivative = () =>ans.unFlat().derivative();
    ans.eval = (variableValues) => {
        const evaluatedNumerator = evaluatePoly(numeratorPoly, variableValues);
        const evaluatedDenominator = evaluatePoly(denominatorPoly, variableValues);
        return evaluatedNumerator.div(evaluatedDenominator).simplify();
    };

    ans.toString = () => `(${numeratorPoly.toString()}) / (${denominatorPoly.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `\\frac{${numeratorPoly.toVisual().value}}{${denominatorPoly.toVisual().value}}` });
    ans.equals = (other) => {
        if (other?.type !== TYPES.ratioPoly) return false;
        if (!numeratorPoly.equals(other.numeratorPoly)) return false;
        if (!denominatorPoly.equals(other.denominatorPoly)) return false;
        return true;
    };
    return ans;
}

// =============================================================================
// Vector and covector expressions
// =============================================================================

function _is_tensor(expr) {
    return expr.type === TYPES.vector || expr.type === TYPES.covector;
}

function _tensor_mul(a, b) {
    if (_is_tensor(a) && _is_tensor(b)) return a.prod(b);
    if (_is_tensor(a)) return a.map(c => c.mul(b));
    if (_is_tensor(b)) return b.map(c => a.mul(c));
    return a.mul(b);
}

function _tensor_contraction(a, b) {
    // Recursively multiply and accumulate across the matching dimensions
    let acc = _tensor_mul(a.components[0], b.components[0]);
    for (let i = 1; i < a.components.length; i++) {
        acc = acc.add(_tensor_mul(a.components[i], b.components[i]));
    }
    return acc;
}

function _tensor_outer(a, b) {
    const nextComponents = a.components.map(comp => _tensor_mul(comp, b));
    return a.type === TYPES.covector ? covec(...nextComponents) : vec(...nextComponents);
}

function covec(...components) {
    components = components.map(c => typeof c === "number" ? real(c) : c);

    const ans = { type: TYPES.covector, components };
    ans.dim = components.length;
    ans.children = components;
    ans.vars = sortVars(Set.of(...components.flatMap(c => c.vars)).toArray());
    components.forEach(c => c.vars = ans.vars);


    ans.add = (other) => {
        if (components?.length === other?.components?.length) {
            return covec(...components.map((c, i) => c.add(other.components[i])));
        }
        return covec(...components.map(c => c.add(other)));
    };
    ans.sub = (other) => {
        if (components?.length === other?.components?.length) {
            return covec(...components.map((c, i) => c.sub(other.components[i])));
        }
        return covec(...components.map(c => c.sub(other)));
    }
    ans.mul = (other) => {
        if (components?.length === other?.components?.length) {
            return covec(...components.map((c, i) => c.mul(other.components[i])));
        }
        return covec(...components.map(c => c.mul(other)));
    };
    ans.div = (denominator) => {
        if (components?.length === denominator?.components?.length) {
            return covec(...components.map((c, i) => c.div(denominator.components[i])));
        }
        return covec(...components.map(c => c.div(denominator)));
    };
    ans.prod = (other) => {
        if (other.type === TYPES.vector) return _tensor_contraction(ans, other);
        if (other.type === TYPES.covector) return _tensor_outer(ans, other);
        return covec(...components.map(c => c.prod(other)));
    };
    ans.transpose = () => {
        return vec(...components);
    };
    ans.dot = (otherVec) => {
        return ans.transpose().prod(otherVec);
    }
    ans.map = (fn) => {
        const newComponents = components.map(c => fn(c));
        return covec(...newComponents);
    }
    ans.flatMap = (fn) => {
        const newComponents = components.flatMap(c => fn(c).components);
        return covec(...newComponents);
    }

    ans.flat = () => {
        const flatComponents = components.map(c => c.flat());
        return covec(...flatComponents);
    }
    ans.simplify = () => {
        const simplifiedComponents = components.map(c => c.simplify());
        const result = covec(...simplifiedComponents);
        result.vars = ans.vars;
        return result;
    };

    ans.pullback = () => {
        const components = ans.components.map(c => c.pullback());
        return covec(...components);
    }
    ans.derivative = () => {
        return derivative(ans);
    };
    ans.eval = (variableValues) => {
        return covec(...components.map(c => c.eval(variableValues)));
    }

    ans.toString = () => `covec(${components.map(c => c.toString()).join(", ")})`;
    ans.toVisual = () => ({ type: "latex", value: `\\left [${components.map(c => c.toVisual().value).join(", ")}\\right ]` });
    ans.equals = (other) => {
        if (other?.type !== TYPES.covector || other.components.length !== components.length) {
            return false;
        }
        for (let i = 0; i < components.length; i++) {
            if (!components[i].equals(other.components[i])) {
                return false;
            }
        }
        return true;
    };
    return ans;
}

function vec(...components) {
    components = components.map(c => typeof c === "number" ? real(c) : c);
    const ans = { type: TYPES.vector, components };

    ans.dim = components.length;
    ans.children = components;
    ans.vars = sortVars(Set.of(...components.flatMap(c => c.vars)).toArray());
    components.forEach(c => c.vars = ans.vars);

    ans.add = (other) => {
        if (components?.length === other?.components?.length) {
            return vec(...components.map((c, i) => c.add(other.components[i])));
        }
        return vec(...components.map(c => c.add(other)));
    };
    ans.sub = (other) => {
        if (components?.length === other?.components?.length) {
            return vec(...components.map((c, i) => c.sub(other.components[i])));
        }
        return vec(...components.map(c => c.sub(other)));
    }
    ans.mul = (other) => {
        if (components?.length === other?.components?.length) {
            return vec(...components.map((c, i) => c.mul(other.components[i])));
        }
        return vec(...components.map(c => c.mul(other)));
    };
    ans.div = (denominator) => {
        if (components?.length === denominator?.components?.length) {
            return vec(...components.map((c, i) => c.div(denominator.components[i])));
        }
        return vec(...components.map(c => c.div(denominator)));
    };
    ans.prod = (other) => {
        if (other.type === TYPES.covector) return _tensor_contraction(ans, other);
        if (other.type === TYPES.vector) return _tensor_outer(ans, other);
        return vec(...components.map(c => c.prod(other)));
    };
    ans.transpose = () => {
        return covec(...components);
    };
    ans.dot = (otherVec) => {
        return ans.transpose().prod(otherVec);
    }
    ans.map = (fn) => {
        const newComponents = components.map(c => fn(c));
        return vec(...newComponents);
    }
    ans.flatMap = (fn) => {
        const newComponents = components.flatMap(c => fn(c).components);
        return vec(...newComponents);
    }


    ans.flat = () => {
        const flatComponents = components.map(c => c.flat());
        return vec(...flatComponents);
    }
    ans.simplify = () => {
        const simplifiedComponents = components.map(c => c.simplify());
        const result = vec(...simplifiedComponents);
        result.vars = ans.vars;
        return result;
    };

    ans.pullback = () => {
        const components = ans.components.map(c => c.pullback());
        return covec(...components);
    }
    ans.derivative = () => {
        return derivative(ans);
    }
    ans.eval = (variableValues) => {
        return vec(...components.map(c => c.eval(variableValues)));
    }

    ans.toString = () => `vec(${components.map(c => c.toString()).join(", ")})`;
    ans.toVisual = () => ({ type: "latex", value: `\\begin{pmatrix}${components.map(c => c.toVisual().value).join(" \\\\ ")}\\end{pmatrix}` });
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

// =============================================================================
// Unary functions
// =============================================================================

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
    };
    ans.simplify = () => {
        return ans; // default implementation.
    };

    ans.pullback = () => {
        throw new Error(`pullback not implemented for ${name}`);
    };
    ans.derivative = () => {
        return derivative(ans);
    };

    ans.toString = () => `${name}(${arg.toString()})`;
    ans.toVisual = () => ({ type: "latex", value: `${name}(${arg.toVisual().value})` });
    ans.equals = (other) => {
        if (other?.type !== name) return false;
        if (!arg.equals(other.value)) return false;
        return true;
    };

    return ans;
}

function exp(value) {
    const ans = singleArgFunc({ name: TYPES.exp }, value);

    if(isZero(value)) {
        return real(1);
    }

    ans.flat = () => {
        const flat = exp(value.flat());
        const hash = hashAtomic(flat);
        const atomicVarStr = `__atomic__${hash}`;
        return poly(new Map([[atomicVarStr, real(1)]]), flat.vars, new Map([[atomicVarStr, flat]]));
    };

    ans.simplify = () => {
        return ans.flat();
    };

    ans.pullback = () => {
        // d(e^value)/d(value) = e^value
        return covec(ans);
    };
    ans.eval = (variableValues) => {
        const evaluatedValue = value.eval(variableValues);
        return extractReal(evaluatedValue)
            .map((realValue) => real(Math.exp(realValue.value))
            ).orElse(() => {
                return exp(evaluatedValue);
            });
    }

    ans.toVisual = () => ({ type: "latex", value: `e^{${value.toVisual().value}}` });

    return ans;
}

function log(value) {
    const ans = singleArgFunc({ name: TYPES.log }, value);

    if(isReal(value, 1)) {
        return real(0);
    }

    ans.flat = () => {
        const flat = log(value.flat());
        const hash = hashAtomic(flat);
        const atomicVarStr = `__atomic__${hash}`;
        return poly(new Map([[atomicVarStr, real(1)]]), flat.vars, new Map([[atomicVarStr, flat]]));
    };

    ans.simplify = () => {
        return ans.flat();
    };

    ans.pullback = () => {
        // d(log(value))/d(value) = 1/value
        return covec(div(real(1), value));
    };
    ans.eval = (variableValues) => {
        const evaluatedValue = value.eval(variableValues);
        return extractReal(evaluatedValue)
            .map((realValue) => real(Math.log(realValue.value))
            ).orElse(() => {
                return log(evaluatedValue);
            });
    }

    ans.toVisual = () => ({ type: "latex", value: `\\log(${value.toVisual().value})` });

    return ans;
}

// =============================================================================
// Vector and covector vars
// =============================================================================

function vectorVar(name, dim) {
    if (dim <= 0) {
        throw new Error("Dimension must be a positive integer");
    }
    const components = [];
    for (let i = 0; i < dim; i++) {
        components.push(realVar(`${name}_${i}`));
    }
    return vec(...components);
}

function covectorVar(name, dim) {
    if (dim <= 0) {
        throw new Error("Dimension must be a positive integer");
    }
    const components = [];
    for (let i = 0; i < dim; i++) {
        components.push(realVar(`${name}_${i}`));
    }
    return covec(...components);
}

function matrixVar(name, rows, cols) {
    const components = [];
    for (let i = 0; i < rows; i++) {
        const rowComponents = [];
        for (let j = 0; j < cols; j++) {
            rowComponents.push(realVar(`${name}_{${i}}^{${j}}`));
        }
        components.push(covec(...rowComponents));
    }
    return vec(...components);
}

// =============================================================================
// Differentiation
// =============================================================================

function partial(expression, variable) {
    if (expression.type === TYPES.poly || expression.type === TYPES.ratioPoly) {
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

function derivative(expression, asMap = false) {
    if (expression.type === TYPES.covector) {
        return covec(...expression.components.map(c => derivative(c)));
    }
    if(expression.type === TYPES.vector){
        return vec(...expression.components.map(c => derivative(c)));
    }
    // Capture the exact variables BEFORE differentiating collapses them
    const parentVars = [...expression.vars];
    const partials = parentVars.filter(v => !v.isParam).map(v => partial(expression, v));
    let result = partials.length === 1 ? partials[0] : covec(...partials);
    result.vars = parentVars;
    if (asMap) {
        const resultMap = new Map();
        parentVars
            .filter(v => !v.isParam)
            .forEach((v, i) => {
                resultMap.set(v.name, partials[i]);
            });
        return resultMap;
    }
    return result;
}

// =============================================================================
// Compile
// =============================================================================

function compile(expression) {
    const varIndexMap = new Map();
    expression.vars.forEach((v, i) => varIndexMap.set(v.name, i));

    function atomicToJsExpr(expr) {
        switch (expr.type) {
            case TYPES.real:
                return Number(expr.value).toString();
            case TYPES.realVar: {
                if (!varIndexMap.has(expr.name)) {
                    throw new Error(`Variable ${expr.name} not found in compile variable map`);
                }
                return `x[${JSON.stringify(expr.name)}]`;
            }
            case TYPES.add:
                return `(${atomicToJsExpr(expr.left)} + ${atomicToJsExpr(expr.right)})`;
            case TYPES.sub:
                return `(${atomicToJsExpr(expr.left)} - ${atomicToJsExpr(expr.right)})`;
            case TYPES.mul:
                return `(${atomicToJsExpr(expr.left)} * ${atomicToJsExpr(expr.right)})`;
            case TYPES.div:
                return `(${atomicToJsExpr(expr.left)} / ${atomicToJsExpr(expr.right)})`;
            case TYPES.exp:
                return `Math.exp(${atomicToJsExpr(expr.value)})`;
            case TYPES.log:
                return `Math.log(${atomicToJsExpr(expr.value)})`;
            case TYPES.poly:
                return `${polyToJsExpr(expr)}`;
            case TYPES.ratioPoly:
                return `${ratioPolyToJsExpr(expr)}`;
            case TYPES.covector:
                return `[${expr.components.map(c => atomicToJsExpr(c)).join(", ")}]`;
            case TYPES.vector:
                return `[${expr.components.map(c => atomicToJsExpr(c)).join(", ")}]`;
            default:
                throw new Error(`Unsupported expression type in compile: ${expr.type}`);
        }
    }

    function polyToJsExpr(polyExpr) {
        const terms = [];

        const isRealValue = (expr, value) => expr?.type === TYPES.real && expr.value === value;

        if (polyExpr.varCombCoeffsMap.has("")) {
            const constantCoeff = polyExpr.varCombCoeffsMap.get("");
            if (!isRealValue(constantCoeff, 0)) {
                terms.push(atomicToJsExpr(constantCoeff));
            }
        }

        polyExpr.varCombCoeffsMap.forEach((coeff, varComb) => {
            if (varComb === "") return;

            const factors = [];
            if (!isRealValue(coeff, 1)) {
                factors.push(atomicToJsExpr(coeff));
            }
            const variablePowers = new Map();

            varComb.split("*").forEach((varName) => {
                variablePowers.set(varName, (variablePowers.get(varName) ?? 0) + 1);
            });

            variablePowers.forEach((pow, varName) => {
                if (polyExpr.atomicExprMap.has(varName)) {
                    const atomicExpr = atomicToJsExpr(polyExpr.atomicExprMap.get(varName));
                    factors.push(pow === 1 ? `(${atomicExpr})` : `(${atomicExpr} ** ${pow})`);
                    return;
                }
                if (!varIndexMap.has(varName)) {
                    throw new Error(`Variable ${varName} not found in compile variable map`);
                }
                const varExpr = `x[${JSON.stringify(varName)}]`;
                factors.push(pow === 1 ? varExpr : `(${varExpr} ** ${pow})`);
            });

            terms.push(factors.length === 1 ? factors[0] : factors.map(f => `(${f})`).join(" * "));
        });

        return terms.length > 0 ? terms.join(" + ") : "0";
    }

    function ratioPolyToJsExpr(ratioExpr) {
        const numeratorJsExpr = polyToJsExpr(ratioExpr.numeratorPoly);
        const denominatorJsExpr = polyToJsExpr(ratioExpr.denominatorPoly);
        return `(${numeratorJsExpr}) / (${denominatorJsExpr})`;
    }

    const jsExpr = expression.type === TYPES.ratioPoly
        ? ratioPolyToJsExpr(expression)
        : expression.type === TYPES.poly
            ? polyToJsExpr(expression)
            : atomicToJsExpr(expression);

    return new Function("x", `return ${jsExpr};`); // x: { [varName]: number }
}

// =============================================================================
// Public API
// =============================================================================


const Symbolic = {
    real,
    complex,
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
    vectorVar,
    covectorVar,
    matrixVar,
    TYPES,
    extractReal,
    compile,
};

export { Symbolic };