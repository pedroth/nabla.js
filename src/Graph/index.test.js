import { expect, test } from "bun:test";
import { Graph } from "./index.js";

test("new graph has no vertices or edges", () => {
    const graph = new Graph();

    expect(graph.getVertices()).toEqual([]);
    expect(graph.getEdges()).toEqual([]);
    expect(graph.getNeighbors("missing")).toEqual([]);
});

test("vertices and directed edges can be added and retrieved", () => {
    const graph = new Graph();
    const vertex = { label: "first" };
    const edge = { weight: 3 };

    graph.addVertex("first", vertex).addVertex("second").addEdge("first", "second", edge);

    expect(graph.getVertex("first")).toEqual({ id: "first", label: "first" });
    expect(graph.getVertices()).toHaveLength(2);
    expect(graph.getEdge("first", "second")).toEqual({
        id: "first_second",
        weight: 3
    });
    expect(graph.getNeighbors("first")).toEqual(["second"]);
    expect(graph.getNeighbors("second")).toEqual([]);
    expect(graph.getEdges()).toHaveLength(1);
});

test("adding an edge requires both vertices to exist", () => {
    const graph = new Graph();
    graph.addVertex("first");

    expect(graph.addEdge("first", "missing")).toBeInstanceOf(Error);
    expect(graph.getEdges()).toEqual([]);
});

test("removing an edge clears it from edges and neighbors", () => {
    const graph = new Graph();
    graph.addVertex("first").addVertex("second").addEdge("first", "second");

    expect(graph.removeEdge("first", "second")).toBe(graph);
    expect(graph.getEdge("first", "second")).toBeUndefined();
    expect(graph.getNeighbors("first")).toEqual([]);
    expect(graph.vertexNeigh.first).toBeUndefined();
});

test("removing a vertex removes its incoming and outgoing edges", () => {
    const graph = new Graph();
    graph
        .addVertex("first")
        .addVertex("middle")
        .addVertex("last")
        .addEdge("first", "middle")
        .addEdge("first", "last")
        .addEdge("middle", "last");

    expect(graph.removeVertex("middle")).toBe(graph);
    expect(graph.getVertex("middle")).toBeUndefined();
    expect(graph.getVertices().map(vertex => vertex.id)).toEqual(["first", "last"]);
    expect(graph.getEdges()).toEqual([{ id: "first_last" }]);
    expect(graph.getNeighbors("first")).toEqual(["last"]);
    expect(graph.getNeighbors("middle")).toEqual([]);
    expect(graph.getNeighbors("last")).toEqual([]);
});

test("removing a missing vertex leaves the graph unchanged", () => {
    const graph = new Graph();
    graph.addVertex("first");

    expect(graph.removeVertex("missing")).toBe(graph);
    expect(graph.getVertices().map(vertex => vertex.id)).toEqual(["first"]);
});

test("knn creates directed weighted edges to each vertex's nearest neighbors", () => {
    const points = [0, 1, 3, 8];
    const graph = Graph.knn(points, 2, (left, right) => Math.abs(left - right));

    expect(graph.getVertices()).toHaveLength(4);
    expect(graph.getVertex(0).point).toBe(0);
    expect(graph.getNeighbors(0)).toEqual(["1", "2"]);
    expect(graph.getEdge(0, 1).weight).toBe(1);
    expect(graph.getEdge(0, 2).weight).toBe(3);
    expect(graph.getNeighbors(1)).toEqual(["0", "2"]);
    expect(graph.getEdge(1, 2).weight).toBe(2);
    expect(graph.getNeighbors(2)).toEqual(["0", "1"]);
    expect(graph.getNeighbors(3)).toEqual(["1", "2"]);
    expect(graph.getEdges()).toHaveLength(8);
});

test("knn caps k at available neighbors and supports zero", () => {
    const distance = (left, right) => Math.abs(left - right);
    const graph = Graph.knn([0, 1, 2], 10, distance);

    expect(graph.getNeighbors(0)).toEqual(["1", "2"]);
    expect(graph.getEdges()).toHaveLength(6);

    const empty = Graph.knn([0, 1, 2], 0, distance);
    expect(empty.getVertices()).toHaveLength(3);
    expect(empty.getEdges()).toEqual([]);
});

test("knn validates k and the distance function", () => {
    expect(() => Graph.knn([], -1, () => 0)).toThrow(RangeError);
    expect(() => Graph.knn([], 1.5, () => 0)).toThrow(RangeError);
    expect(() => Graph.knn([], 1, null)).toThrow(TypeError);
});

test("laplacian is D - W with weights computed from vertices", () => {
    const graph = Graph.knn([0, 1, 3], 1, (a, b) => Math.abs(a - b));
    const L = graph.laplacian((u, v) => Math.abs(u.point - v.point));

    expect(L.shape).toEqual([3, 3]);
    expect(L.data).toEqual([
        1, -1, 0,
        -1, 1, 0,
        0, -2, 2
    ]);
    for (let i = 0; i < 3; i++) {
        let rowSum = 0;
        for (let j = 0; j < 3; j++) rowSum += L.get(i, j);
        expect(rowSum).toBe(0);
    }
});

test("laplacian uses unit weights by default", () => {
    const graph = new Graph();
    graph.addVertex("a").addVertex("b").addEdge("a", "b").addEdge("b", "a");

    expect(graph.laplacian().data).toEqual([1, -1, -1, 1]);
});
