import { expect, test } from "bun:test";
import { complex, constant, real, variable } from ".";

function numericField(value) {
	return {
		value,
		add(other) {
			return numericField(this.value + other.value);
		},
		toString() {
			return this.value.toString();
		},
	};
}

test("variable expressions compose to strings", () => {
	const x = variable("x");
	const y = variable("y");

	expect(x.add(y).toString()).toBe("(x + y)");
	expect(x.sub(y).toString()).toBe("(x - y)");
	expect(x.mul(y).toString()).toBe("(x * y)");
	expect(x.div(y).toString()).toBe("(x / y)");
});

test("renders nested expressions to string and latex", () => {
	const x = variable("x");
	const y = variable("y");
	const expression = x.add(y).mul(x.sub(y));

	expect(expression.toString()).toBe("((x + y) * (x - y))");
	expect(expression.toVisual()).toEqual({
		type: "latex",
		value: "((x + y) \\cdot (x - y))",
	});
});

test("real and complex values render as symbolic leaves", () => {
	expect(real(2).toString()).toBe("2");
	expect(real(2).toVisual()).toEqual({ type: "latex", value: "2" });

	const z = complex(real(2), real(3));
	expect(z.toString()).toBe("(2 + 3i)");
	expect(z.toVisual()).toEqual({ type: "latex", value: "(2 + 3i)" });
});

test("scale nests constants inside division output", () => {
	const x = variable("x");
	const y = variable("y");
	const expression = x.scale(3).div(y.add(x));

	expect(expression.toString()).toBe("((3 * x) / (y + x))");
	expect(expression.toVisual()).toEqual({
		type: "latex",
		value: "\\frac{(3 \\cdot x)}{(y + x)}",
	});
});

test("constant expressions keep structure until simplified", () => {
	const one = constant(numericField(1));
	const two = constant(numericField(2));

	expect(one.add(two).toString()).toBe("(1 + 2)");
});

test("constant expressions simplify when both sides are constants", () => {
	const one = constant(numericField(1));
	const two = constant(numericField(2));
	const three = one.add(two).simplify();

	expect(three.toString()).toBe("3");
	expect(three.toVisual()).toEqual({
		type: "latex",
		value: "3",
	});
});
