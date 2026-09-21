import { expect, test } from "bun:test";
import { NeuralNet } from "./index.js";

test("positional encoding expands each coordinate with Fourier features", () => {
    const network = NeuralNet.builder()
        .input(2)
        .positionalEncoding(0)
        .layer(1, NeuralNet.ACTIVATIONS.linear)
        .build();
    const weights = Object.fromEntries(
        Object.keys(network.weightsMap).map(key => [key, 0])
    );

    expect(Object.keys(weights).filter(key => key.startsWith("W1")).length).toBe(6);

    weights["W1_{0}^{0}"] = 1;
    weights["W1_{0}^{1}"] = 2;
    weights["W1_{0}^{2}"] = 3;
    network.setWeights(weights);

    expect(network.eval([0.5, 0])).toBeCloseTo(0.5 + 2);
});

test("positional encoding validates its frequency count", () => {
    expect(() => NeuralNet.builder().positionalEncoding(-1)).toThrow(
        "Number of positional encoding frequency bands must be a non-negative integer"
    );
});