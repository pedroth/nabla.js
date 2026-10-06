import { PQueue } from "../PQueue/index.js";
import { NMath } from "../NMath/index.js";

const smat = NMath.smat;
const mat = NMath.mat;
const matrix = smat;

export class Graph {
    constructor() {
        this.vertices = {}; // vertices map<id, vertex>
        this.edges = {}; // edges map<"i_j", edge>
        this.vertexNeigh = {}; // neighbor map<id, map<id, bool>>
    }

    getVertices() {
        return Object.values(this.vertices);
    }

    getEdges() {
        return Object.values(this.edges);
    }

    addVertex(id, vertex = {}) {
        this.vertices[id] = vertex;
        this.vertices[id].id = id;
        return this;
    }

    getVertex(id) {
        return this.vertices[id];
    }

    addEdge(i, j, edge = {}) {
        const edgeIDs = [i, j];
        if (!this.getVertex(i)) return new Error(`Vertex ${i} needs to be created before adding an edge`);
        if (!this.getVertex(j)) return new Error(`Vertex ${j} needs to be created before adding an edge`);
        edgeIDs.forEach(id => {
            if (!this.vertexNeigh[id]) this.vertexNeigh[id] = {};
        })
        const edgeKeyID = Graph.edgeKey(i, j);
        this.edges[edgeKeyID] = edge;
        this.edges[edgeKeyID].id = edgeKeyID;
        this.vertexNeigh[i][j] = true;
        return this;
    }

    getEdge(i, j) {
        return this.edges[Graph.edgeKey(i, j)];
    }

    getNeighbors(i) {
        return Object.keys(this.vertexNeigh[i] ?? {});
    }

    removeVertex(i) {
        if (!this.vertices[i]) return this;
        // Remove all edges connected to this vertex
        Object.keys(this.vertexNeigh).forEach(source => {
            if (i in this.vertexNeigh[source]) {
                this.removeEdge(source, i);
            }
        })
        // Remove all edges where this vertex is the source
        this.getNeighbors(i).forEach(j => {
            this.removeEdge(i, j);
        })
        delete this.vertexNeigh[i];
        delete this.vertices[i];
        return this;
    }

    removeEdge(i, j) {
        const edgeKeyID = Graph.edgeKey(i, j);
        if (!this.edges[edgeKeyID]) return this;
        delete this.edges[edgeKeyID];
        delete this.vertexNeigh[i]?.[j];
        if (Object.keys(this.vertexNeigh[i] ?? {}).length === 0) {
            delete this.vertexNeigh[i];
        }
        return this;
    }

    // Graph Laplacian L = D - W, rows/columns follow the order of getVertices().
    // weightFn: (vertexI, vertexJ) => edge weight, defaults to 1
    laplacian(weightFn = () => 1) {
        const ids = Object.keys(this.vertices);
        const n = ids.length;
        const W = _create_W(this, n, weightFn);
        const D = _create_D(n, W);
        return D.sub(W);
    }

    static edgeKey(i, j) {
        return `${i}_${j}`;
    }

    // Static method to compute k-nearest neighbors for a set of vertices
    // vertices: array of points
    // k: the number of nearest neighbors to connect each vertex to
    // distanceFn: a function that computes the distance between two points
    static knn(vertices, k, distanceFn) {
        if (!Number.isInteger(k) || k < 0) {
            throw new RangeError("k must be a non-negative integer");
        }
        if (typeof distanceFn !== "function") {
            throw new TypeError("distanceFn must be a function");
        }

        const graph = new Graph();
        for (let i = 0; i < vertices.length; i++) {
            graph.addVertex(i, { vertex: vertices[i] });
        }

        for (let i = 0; i < vertices.length; i++) {
            // max heap: root is the farthest of the current k nearest candidates
            const nearest = new PQueue((a, b) => b.distance - a.distance);
            for (let j = 0; j < vertices.length && k > 0; j++) {
                if (i === j) continue;
                const distance = distanceFn(vertices[i], vertices[j]);
                if (nearest.size() < k) {
                    nearest.push({ j, distance });
                } else if (distance < nearest.peek().distance) {
                    nearest.pop();
                    nearest.push({ j, distance });
                }
            }
            // pop yields farthest first, so add edges from the back to keep nearest first
            const neighbors = [];
            while (nearest.size() > 0) neighbors.push(nearest.pop());
            for (let n = neighbors.length - 1; n >= 0; n--) {
                graph.addEdge(i, neighbors[n].j, { weight: neighbors[n].distance });
                graph.addEdge(neighbors[n].j, i, { weight: neighbors[n].distance });
            }
        }

        return graph;
    }
}


function _create_D(n, W) {
    const D = matrix.builder(n, n);
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            if (i !== j) {
                sum += W.get(i, j);
            }
        }
        D.set(i, i, sum);
    }
    return D.build();
}

function _create_W(graph, n, weightFn) {
    const W = matrix.builder(n, n);
    const ids = Object.keys(graph.vertices);
    const index = {};
    // usually ids are consecutive integers starting from 0, here for safety we map them to indices explicitly
    for (let i = 0; i < n; i++) index[ids[i]] = i; 
    for (let i = 0; i < n; i++) {
        const neighbors = graph.getNeighbors(ids[i]);
        for (let k = 0; k < neighbors.length; k++) {
            const w = weightFn(graph.vertices[ids[i]], graph.vertices[neighbors[k]]);
            W.set(i, index[neighbors[k]], w);
        }
    }
    return W.build();
}