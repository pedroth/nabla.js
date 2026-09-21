import { expect, test } from "bun:test";
import { Symbolic } from "./index.js";

test("pullbacks are memoized per expression node", () => {
	const x = Symbolic.realVar("x");
	const y = Symbolic.realVar("y");
	const nodes = [
		Symbolic.real(2),
		x,
		Symbolic.complex(x, y),
		x.add(y),
		x.sub(y),
		x.mul(y),
		x.div(y),
		Symbolic.vec(x, y),
		Symbolic.covec(x, y),
		Symbolic.exp(x),
		Symbolic.log(x),
	];

	for (const node of nodes) {
		const pullback = node.pullback();
		expect(node._pullback).toBe(pullback);
		expect(node.pullback()).toBe(pullback);
	}
});

test("derivatives are memoized per expression node", () => {
	const x = Symbolic.realVar("x");
	const expression = Symbolic.exp(x.mul(x));
	const derivative = expression.derivative();

	expect(expression._derivative).toBe(derivative);
	expect(expression.derivative()).toBe(derivative);
});


function gaussian2d() {
	const x = Symbolic.realVar("x");
	const y = Symbolic.realVar("y");
	const r = Symbolic.vec(x, y);
	return { x, y, gaussian: Symbolic.exp(r.dot(r).mul(Symbolic.real(-1))) };
}


test("exp derivative keeps atomic visual metadata after simplification", () => {
	const x = Symbolic.realVar("x");

	expect(Symbolic.exp(x).simplify().derivative().simplify().toVisual().value).toBe("e^{x}");
});

test("exp derivative simplifies to the original exponential", () => {
	const x = Symbolic.realVar("x");

	expect(Symbolic.exp(x).simplify().derivative().simplify().toString()).toBe("exp(x)");
});

test("trigonometric functions simplify zero and expose LaTeX", () => {
	expect(Symbolic.cos(Symbolic.real(0)).toString()).toBe("1");
	expect(Symbolic.sin(Symbolic.real(0)).toString()).toBe("0");
	expect(Symbolic.tan(Symbolic.real(0)).toString()).toBe("0");
	expect(Symbolic.sin(Symbolic.realVar("x")).toVisual().value).toBe("\\sin(x)");
});

test("trigonometric functions differentiate using the chain rule", () => {
	const x = Symbolic.realVar("x");

	expect(Symbolic.cos(x).derivative().simplify().toString()).toBe("-sin(x)");
	expect(Symbolic.sin(x).derivative().simplify().toString()).toBe("cos(x)");
	expect(Symbolic.tan(x).derivative().simplify().toString()).toBe("(1) / (\\left(cos(x)\\right)^{2})");
});

test("trigonometric functions evaluate and compile numerically", () => {
	const x = Symbolic.realVar("x");
	const input = Math.PI / 4;

	for (const [func, nativeFunc] of [
		[Symbolic.cos, Math.cos],
		[Symbolic.sin, Math.sin],
		[Symbolic.tan, Math.tan],
	]) {
		const expression = func(x);
		expect(expression.eval({ x: input }).value).toBeCloseTo(nativeFunc(input));
		expect(Symbolic.compile(expression)({ x: input })).toBeCloseTo(nativeFunc(input));
	}
});

test("gaussian sum derivative simplifies without recursion errors", () => {
	const { gaussian } = gaussian2d();

	expect(gaussian.add(gaussian).derivative().simplify().toString()).toBe(
		"covec(-4xexp(-x^{2} - y^{2}), -4yexp(-x^{2} - y^{2}))",
	);
});

test("identical gaussian expressions simplify to zero", () => {
	const { gaussian } = gaussian2d();

	expect(gaussian.sub(gaussian).simplify().toString()).toBe("0");
});

test("exp derivative keeps atomic visual metadata after simplification", () => {
	const x = Symbolic.realVar("x");

	expect(Symbolic.exp(x).simplify().derivative().simplify().toVisual().value).toBe("e^{x}");
});

test("triple derivative of r^3 contracted with unit vectors equals 48", () => {
	const { realVar, real, vec } = Symbolic;
	const r = realVar("x").add(realVar("y"));

	const result = r.mul(r).mul(r)
		.derivative().derivative().derivative()
		.simplify()
		.prod(vec(real(1), real(1)))
		.prod(vec(real(1), real(1)))
		.prod(vec(real(1), real(1)));

	expect(result.toString()).toBe("48");
});

test("poly derivative differentiates monomials directly", () => {
	const x = Symbolic.realVar("x");
	const y = Symbolic.realVar("y");
	const expr = x.mul(x).mul(y).simplify();

	expect(expr.type).toBe("poly");
	expect(expr.derivative().simplify().toString()).toBe("covec(2xy, x^{2})");
});

test("poly derivative preserves chain rule for atomic flattened factors", () => {
	const x = Symbolic.realVar("x");
	const expr = Symbolic.exp(x).mul(x).simplify();

	expect(expr.type).toBe("poly");
	expect(expr.derivative().simplify().toString()).toBe("xexp(x) + exp(x)");
});

test("poly eval computes numeric values directly", () => {
	const x = Symbolic.realVar("x");
	const y = Symbolic.realVar("y");
	const expr = x.mul(x).mul(y).simplify();

	expect(expr.type).toBe("poly");
	expect(expr.eval({ x: 3, y: 2 }).toString()).toBe("18");
});

test("poly eval supports partial substitution with atomic factors", () => {
	const x = Symbolic.realVar("x");
	const y = Symbolic.realVar("y");
	const expr = Symbolic.exp(x).mul(y).simplify();

	expect(expr.type).toBe("poly");
	expect(expr.eval({ y: 2 }).simplify().toString()).toBe("2exp(x)");
});

test("ratioPoly derivative uses quotient rule directly", () => {
	const x = Symbolic.realVar("x");
	const y = Symbolic.realVar("y");
	const expr = x.div(y).simplify();

	expect(expr.type).toBe("ratioPoly");
	expect(expr.derivative().simplify().toString()).toBe("covec((y) / (y^{2}), (-x) / (y^{2}))");
});

test("ratioPoly eval computes numeric values directly", () => {
	const x = Symbolic.realVar("x");
	const y = Symbolic.realVar("y");
	const expr = x.div(y).simplify();

	expect(expr.type).toBe("ratioPoly");
	expect(expr.eval({ x: 6, y: 2 }).toString()).toBe("3");
});

test("ratioPoly eval supports partial substitution with atomic denominator", () => {
	const x = Symbolic.realVar("x");
	const y = Symbolic.realVar("y");
	const expr = y.div(Symbolic.exp(x)).simplify();

	expect(expr.type).toBe("ratioPoly");
	expect(expr.eval({ y: 2 }).simplify().toString()).toBe("(2) / (exp(x))");
});

test("complex product derivative does not crash and returns a covector", () => {
	const x = Symbolic.realVar("x");
	const y = Symbolic.realVar("y");
	const z = Symbolic.realVar("z");
	const w = Symbolic.realVar("w");
	const expr = Symbolic.complex(x, y).mul(Symbolic.complex(z, w));

	const grad = expr.derivative().simplify();
	expect(grad.type).toBe("covector");
	expect(grad.components.length).toBe(4);
});

test("single-variable complex derivative returns a complex scalar", () => {
	const x = Symbolic.realVar("x");
	const expr = Symbolic.complex(x.mul(x), x);

	const grad = expr.derivative().simplify();
	expect(grad.type).toBe("complex");
});