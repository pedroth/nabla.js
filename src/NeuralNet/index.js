import { Symbolic } from "../Symbolic/index.js";
const { vectorVar, matrixVar, div, real, add, exp, log, vec, extractReal } = Symbolic;

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
            this.symbolicNN = weights.prod(this.symbolicNN).add(biases).map(layer.activation.symbolic);
        });
        this.symbolicNN = this.symbolicNN.dim === 1 ? this.symbolicNN.components[0] : this.symbolicNN;
        this.symbolicNN = this.symbolicNN.simplify();
        this.derivativeNN = this.symbolicNN.derivative().simplify();
        this.weightsMap = {};
        this.symbolicNN.vars.forEach((v) => {
            if (!v.isParam) {
                this.weightsMap[v.name] = 0;
            }
        });
    }

    eval(input) {
        return this.symbolicNN.eval(input);
    }

    evalStar(input) {
        const argMap = buildInput(input);
        const weightsValues = Object.fromEntries(
            Object.entries(this.weightsMap).map(([k, v]) => [k, v.value])
        );
        const mergedMap = { ...argMap, ...weightsValues };
        return this.compiledNN(mergedMap);
    }

    // X: array of input vectors, Y: array of output vectors
    fitData(X, Y, params = { learningRate: 0.1, epochs: 100, batch: 10 }) {

        for (let epoch = 0; epoch < params.epochs; epoch++) {
            let symGrad = null;
            for (let i = 0; i < (params.batch || 1); i++) {
                const index = Math.floor(Math.random() * X.length);
                const input = buildInput(X[index]);
                const output = buildOutput(Y[index]);
                let diff = this.eval(input).sub(output);
                diff = diff.mul(diff);
                if (symGrad === null) {
                    symGrad = this.derivativeNN.mul(diff).simplify();
                } else {
                    symGrad = symGrad.add(this.derivativeNN.mul(diff)).simplify();
                }
            }
            const weightsValues = Object.fromEntries(
                Object.entries(this.weightsMap).map(([k, v]) => [k, v.value])
            );
            const gradEval = symGrad.eval(weightsValues).simplify();
            Object.keys(this.weightsMap).forEach(k => {
                extractReal(gradEval.components[this.weightsMap[k].index])
                    .forEach(realValue => {
                        this.weightsMap[k].value -= params.learningRate * realValue.value;
                    })
            })
            console.log(`Epoch ${epoch + 1}/${params.epochs}, Loss: ${Object.values(weightsValues).join(", ")}`);
        }
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
    }
}


// input: array of numbers | number
function buildInput(input) {
    const argMap = {};
    if (!Array.isArray(input)) {
        argMap["x_0"] = real(input);
        return argMap;
    }
    for (let i = 0; i < input.length; i++) {
        argMap[`x_${i}`] = real(input[i]);
    }
    return argMap;
}

function buildOutput(output) {
    if (!Array.isArray(output)) {
        return real(output);
    }
    return vec(...output.map(value => real(value)));
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
