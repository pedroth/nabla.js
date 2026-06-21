import Symbolic from "../Symbolic/index.js";

const LAYER_TYPES_TO_SYM = {
    input: ,
    fully_connected: Symbolic.symbol("fully_connected"),
};


class NeuralNet {
    constructor(layers) {
        this.layers = layers;
        for(let i = 0; i < layers.length; i++) {
            const layer = layers[i]; 
        }
    }

    static fromJSON(json) {
        return new NeuralNet(json.layers);
    }

    static builder() {
        return new NeuralNetBuilder();
    }

    static ACTIVATIONS = {
        sigmoid: "sigmoid",
        relu: "relu",
        tanh: "tanh",
        linear: "linear",
    }
}

class NeuralNetBuilder {
    constructor() {
        this._layers = [];
    }

    addInputLayer(numberOfNeurons) {
        this._layers.push({
            type: "input",
            numberOfNeurons,
        });
        return this;
    }

    addFullyConnect(numberOfNeurons, activation = NeuralNet.ACTIVATIONS.relu) {
        this._layers.push({
            type: "fully_connected",
            numberOfNeurons,
            activation,
        });
        return this; 
    }

    build() {
        return new NeuralNet(this._layers);
    }
}
