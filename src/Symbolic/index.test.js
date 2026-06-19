import { expect, test } from "bun:test";
import { Symbolic } from "./index.js";


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

test("gaussian sum derivative simplifies without recursion errors", () => {
	const { gaussian } = gaussian2d();

	expect(gaussian.add(gaussian).derivative().simplify().toString()).toBe(
		"covec(-4exp(-x^{2} - y^{2})x, -4exp(-x^{2} - y^{2})y)",
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