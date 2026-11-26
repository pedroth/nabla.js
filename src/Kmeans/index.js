import { NMath } from "../NMath/index.js";

const { vec } = NMath;

const Kmeans = {};

// options.distance: (vec, vec) -> number, the dissimilarity used to assign points and compute the loss.
// Centers are always the arithmetic mean of their cluster, whatever the distance.
Kmeans.new = function (data, k, options = {}) {
  const { maxIterations = 100, initIterations = 0, distance = squaredDistance } = options;
  if (typeof distance !== "function") {
    throw new Error("distance must be a function");
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("data must be a non-empty array");
  }
  if (!Number.isInteger(k) || k <= 0) {
    throw new Error("k must be a positive integer");
  }
  if (!Number.isInteger(maxIterations) || maxIterations < 0) {
    throw new Error("maxIterations must be a non-negative integer");
  }
  if (!Number.isInteger(initIterations) || initIterations < 0) {
    throw new Error("initIterations must be a non-negative integer");
  }

  const points = data.map(toVector);
  const dim = points[0].dim;
  if (dim === 0 || points.some(point => point.dim !== dim)) {
    throw new Error("data vectors must have the same non-zero dimension");
  }

  let clusters;
  const ans = {};

  ans.init = () => {
    clusters = init(points, k, Math.random);
    return ans;
  };

  ans.update = () => {
    if (clusters === undefined || clusters === null) {
      clusters = init(points, k, Math.random);
    }
    clusters = update(points, clusters, dim, Math.random, distance);
    return ans;
  };

  ans.loss = () => {
    if (clusters === undefined || clusters === null) {
      clusters = init(points, k, Math.random);
    }
    return loss(points, clusters, distance);
  };

  ans.fit = () => {
    clusters = fit(points, k, dim, maxIterations, initIterations, Math.random, distance);
    return ans;
  };

  // vec -> index of the nearest cluster
  ans.predictIndex = x => {
    const point = toVector(x);
    if (point.dim !== dim) {
      throw new Error(`expected a vector of dimension ${dim}`);
    }
    if (clusters === undefined || clusters === null) {
      clusters = init(points, k, Math.random);
    }
    return predictIndex(point, clusters, distance);
  };

  // vec -> one-hot vector of the nearest cluster
  ans.predict = x => vec.e(k, ans.predictIndex(x));

  return ans;
};

// Default cost: squared Euclidean distance.
function squaredDistance(a, b) {
  return a.sub(b).squareLength();
}

function toVector(value) {
  if (value && value.type === "vector") {
    return value;
  }
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    return vec.fromArray(Array.from(value));
  }
  throw new Error("data points must be arrays or NMath vectors");
}

function init(data, k, random) {
  const clusters = [];
  for (let i = 0; i < k; i++) {
    clusters[i] = data[Math.floor(random() * data.length)];
  }
  return clusters;
}

function clusterData(data, clusters, distance) {
  const clusterIndices = Array.from({ length: clusters.length }, () => []);
  for (let i = 0; i < data.length; i++) {
    clusterIndices[predictIndex(data[i], clusters, distance)].push(i);
  }
  return clusterIndices;
}

function updateParameters(clusterIndices, data, dim, random) {
  return clusterIndices.map(indices => {
    if (indices.length === 0) {
      return data[Math.floor(random() * data.length)];
    }

    let mean = vec.zero(dim);
    for (const index of indices) {
      mean = mean.add(data[index]);
    }
    return mean.scale(1 / indices.length);
  });
}

function update(data, clusters, dim, random, distance) {
  return updateParameters(clusterData(data, clusters, distance), data, dim, random);
}

function loss(data, clusters, distance) {
  let totalLoss = 0;
  for (const point of data) {
    totalLoss += distance(point, clusters[predictIndex(point, clusters, distance)]);
  }
  return totalLoss;
}

function fit(data, k, dim, maxIterations, initIterations, random, distance) {
  let bestClusters = init(data, k, random);
  let minLoss = loss(data, bestClusters, distance);
  for (let i = 1; i < initIterations; i++) {
    const clusters = init(data, k, random);
    const actualLoss = loss(data, clusters, distance);
    if (actualLoss < minLoss) {
      minLoss = actualLoss;
      bestClusters = clusters;
    }
  }
  for (let i = 0; i < maxIterations; i++) {
    bestClusters = update(data, bestClusters, dim, random, distance);
  }
  return bestClusters;
}

function predictIndex(point, clusters, distance) {
  let kIndex = 0;
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < clusters.length; i++) {
    const d = distance(point, clusters[i]);
    if (d < minDistance) {
      minDistance = d;
      kIndex = i;
    }
  }
  return kIndex;
}

export { Kmeans };
