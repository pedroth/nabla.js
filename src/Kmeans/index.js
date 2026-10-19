import { NMath } from "../NMath/index.js";
const { vec } = NMath;

export class Kmeans {
  constructor(k, dim) {
    if (k === undefined || dim === undefined) {
      throw new Error("undefined constructor parameters");
    }
    this.k = k;
    this.dim = dim;
    this.clusters = [];
    this._initialized = false;
    for (let i = 0; i < k; i++) {
      this.clusters[i] = vec.random(dim);
    }
  }

  _takeRandomDataPointFromCluster(clustersIndexes) {
    const k = Math.floor(Math.random() * this.k);
    if (clustersIndexes[k].length > 0) {
      const sampleIndex = Math.floor(Math.random() * clustersIndexes[k].length);
      return clustersIndexes[k][sampleIndex];
    }
    return this._takeRandomDataPointFromCluster(clustersIndexes);
  }

  /** @param {Array<vec>} data @returns {Array<int>} */
  _clusterData(data) {
    const clusterIndex = [];
    for (let i = 0; i < this.k; i++) {
      clusterIndex[i] = [];
    }
    for (let i = 0; i < data.length; i++) {
      const kIndex = this.predictIndex(data[i]);
      const j = clusterIndex[kIndex].length;
      clusterIndex[kIndex][j] = i;
    }
    // force clusters to have at least one data point
    for (let i = 0; i < this.k; i++) {
      if (clusterIndex[i].length === 0) {
        clusterIndex[i][0] = this._takeRandomDataPointFromCluster(clusterIndex);
      }
    }
    return clusterIndex;
  }

  _updateParameters(dataByClusters, data) {
    for (let i = 0; i < this.k; i++) {
      const clusterDataIndex = dataByClusters[i];
      const n = clusterDataIndex.length;
      let mu = vec.zero(this.dim);
      for (let j = 0; j < n; j++) {
        const rgb = data[clusterDataIndex[j]];
        mu = mu.add(rgb);
      }
      this.clusters[i] = mu.scale(1.0 / n);
    }
  }

  // Public API

  /** Seeds the centroids with k random data points. @param {Array<vec>} data @returns {Kmeans} */
  init(data) {
    for (let i = 0; i < this.k; i++) {
      this.clusters[i] = data[Math.floor(Math.random() * data.length)];
    }
    this._initialized = true;
    return this;
  }

  /** @param {Array<vec>} data @returns {Kmeans} */
  update(data) {
    if (!this._initialized) {
      this.init(data);
    }
    const dataByClusters = this._clusterData(data);
    this._updateParameters(dataByClusters, data);
    return this;
  }

  /** @param {vec} x @returns {number} index of the nearest cluster */
  predictIndex(x) {
    let kIndex = 0;
    let minDistance = Number.MAX_VALUE;
    for (let i = 0; i < this.k; i++) {
      let dist = x.sub(this.clusters[i]).squareLength();
      if (minDistance > dist) {
        minDistance = dist;
        kIndex = i;
      }
    }
    return kIndex;
  }

  /** @param {vec} x @returns {vec} one-hot vector of the nearest cluster */
  predict(x) {
    return vec.e(this.k, this.predictIndex(x));
  }
}
