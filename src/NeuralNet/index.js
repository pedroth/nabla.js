import { Symbolic } from "../Symbolic/index.js";
import { DataScience } from "../DataScience/index.js";
const { buildInput } = DataScience;
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
        this.compiledNN = Symbolic.compile(this.symbolicNN);
        this.model = this.symbolicNN;


        this.weightsMap = {};
        this.symbolicNN.vars.forEach((v) => {
            if (!v.isParam) {
                this.weightsMap[v.name] = (2 * Math.random() - 1) * 0.01;
            }
        });
    }

    setWeights(weights) {
        Object.keys(weights).forEach((key) => {
            if (this.weightsMap[key] !== undefined) {
                this.weightsMap[key] = weights[key];
            }
        });
    }

    eval(input) {
        const argMap = buildInput(input, this.symbolicNN);
        return this.compiledNN({ ...argMap, ...this.weightsMap });
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
