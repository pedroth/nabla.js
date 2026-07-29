import { Symbolic } from "../Symbolic/index.js";
const { vectorVar, matrixVar, div, real, add, exp, log } = Symbolic;

export class NeuralNet {
    constructor(inputDim, hiddenLayers) {
        this.inputDim = inputDim;
        this.hiddenLayers = hiddenLayers;
        this.outputDim = hiddenLayers[hiddenLayers.length - 1].numberOfNeurons;
        this.symbolicNN = vectorVar("x", this.inputDim);
        this.symbolicNN.components.forEach(realVar => {
            realVar.isParam = true;
        });
        this.hiddenLayers.forEach((layer, index) => {
            const inDim = index === 0 ? this.inputDim : hiddenLayers[index - 1].numberOfNeurons;
            const weights = matrixVar(`W${index}`, layer.numberOfNeurons, inDim);
            const biases = vectorVar(`b${index}`, layer.numberOfNeurons);
            this.symbolicNN = weights.prod(this.symbolicNN).add(biases).map(layer.activation.symbolic).simplify();
        });
        this.symbolicNN = this.symbolicNN.dim === 1 ? this.symbolicNN.components[0] : this.symbolicNN;
        this.symbolicNN = this.symbolicNN.simplify();
        this.derivativeNN = this.symbolicNN.derivative().simplify();

        this.compiledNN = Symbolic.compile(this.symbolicNN);
        this.compiledDerivativeNN = Symbolic.compile(this.derivativeNN);

        this.weightsMap = {};
        let nonParamIndex = 0;      
        this.symbolicNN.vars.forEach((v) => {
            if (!v.isParam) {
                // Small init to avoid exp() overflow in activation functions
                this.weightsMap[v.name] = { value: (2 * Math.random() - 1) * 0.01, index: nonParamIndex };
                nonParamIndex++;
            }
        });
    }

    eval(input) {
        return this.symbolicNN.eval(input);
    }

    evalStar(input) {
        const argMap = buildInput(input);
        const weightsValues = Object.keys(this.weightsMap).reduce((acc, k) => {
            acc[k] = this.weightsMap[k].value;
            return acc;
        }, {});
        const mergedMap = { ...argMap, ...weightsValues };
        return this.compiledNN(mergedMap);
    }

    // X: array of input vectors, Y: array of output vectors
    fitData(X, Y, params = { learningRate: 0.1, epochs: 100, batch: 10, gradClip: 1.0 }) {
        const { learningRate = 0.1, epochs = 1000, batch = 10, gradClip = 1.0 } = params;
        const weightsValues = Object.keys(this.weightsMap).reduce((acc, k) => {
            acc[k] = this.weightsMap[k].value;
            return acc;
        }, {});
        for (let epoch = 0; epoch < epochs; epoch++) {
            let symGrad = null;
            let validSamples = 0;
            let lossSum = 0;
            for (let i = 0; i < (batch || 1); i++) {
                const index = Math.floor(Math.random() * X.length);
                const input = buildInput(X[index]);
                const output = buildOutput(Y[index]);
                const inputPlusWeights = { ...input, ...weightsValues };
                const diff = this.compiledNN(inputPlusWeights) - output;
                if (!isFinite(diff)) continue;
                validSamples++;
                lossSum += diff * diff;
                const grad = this.compiledDerivativeNN(inputPlusWeights);
                if (symGrad === null) {
                    symGrad = grad.map(v => (isFinite(v) ? v : 0) * diff);
                } else {
                    symGrad = grad.map((v, k) => symGrad[k] + (isFinite(v) ? v : 0) * diff);
                }
            }
            if (symGrad === null || validSamples === 0) continue;
            let gradEval = symGrad.map(v => v / validSamples);
            // Gradient norm clipping
            if (gradClip > 0) {
                const gradNorm = Math.sqrt(gradEval.reduce((s, g) => s + g * g, 0));
                if (gradNorm > gradClip) gradEval = gradEval.map(g => g * gradClip / gradNorm);
            }
            Object.keys(this.weightsMap).forEach((key) => {
                const varIndex = this.weightsMap[key].index;
                weightsValues[key] -= learningRate * gradEval[varIndex];
            });
            console.log(`Epoch ${epoch + 1}/${epochs}, Loss: ${lossSum / validSamples}`);
        }
        Object.keys(this.weightsMap).forEach((key) => {
            this.weightsMap[key].value = weightsValues[key];
        });
        return this;
    }

    toString() {
        return `NeuralNet(inputDim=${this.inputDim}, hiddenLayers=${JSON.stringify(this.hiddenLayers)})`;
    }

    toVisual() {
        return {
            type: "latex",
            value: this.symbolicNN.toVisual().value,
        };
    }

    static fromJSON(json) {
        return new NeuralNet(json.inputLayer, json.hiddenLayers);
    }

    static builder() {
        return new NeuralNetBuilder();
    }

    static ACTIVATIONS = {
        sigmoid: {
            name: "sigmoid",
            symbolic: x => div(real(1), add(real(1), exp(x.mul(real(-1))))),
        },
        relu: {
            name: "relu",
            symbolic: x => real(1 / 10).mul(log(real(1).add(exp(x.mul(real(10)))))),
        },
        linear: {
            name: "linear",
            symbolic: x => x,
        },
    }
}


// input: array of numbers | number
function buildInput(input) {
    const argMap = {};
    if (!Array.isArray(input)) {
        argMap["x_0"] = input;
        return argMap;
    }
    for (let i = 0; i < input.length; i++) {
        argMap[`x_${i}`] = input[i];
    }
    return argMap;
}

function buildOutput(output) {
    return output;
}

class NeuralNetBuilder {
    constructor() {
        this.inputLayer = null;
        this.hiddenLayers = [];
    }

    input(numberOfNeurons) {
        this.inputLayer = numberOfNeurons;
        return this;
    }

    layer(numberOfNeurons, activation = NeuralNet.ACTIVATIONS.relu) {
        this.hiddenLayers.push({
            numberOfNeurons,
            activation,
        });
        return this;
    }

    build() {
        if (this.inputLayer === null) {
            throw new Error("Input layer must be defined");
        }
        return new NeuralNet(this.inputLayer, this.hiddenLayers);
    }
}
