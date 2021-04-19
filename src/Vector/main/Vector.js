//immutable class, not managing exceptions
export default class Vector {
  #vec;
  #n;
  constructor(...arrayOfNumbers) {
    const finalArray = arrayOfNumbers.map(z =>
      z === null || z === undefined ? 0 : z
    );
    this.#vec = type2constructor.Float64Array(finalArray);
    this.#n = this.#vec.length;
  }

  get n() {
    return this.#n;
  }

  get(i) {
    return this.#vec[i - 1];
  }

  size() {
    return this.#n;
  }

  toArray() {
    return [...this.#vec];
  }

  toString() {
    return "[" + this.#vec.join(", ") + "]";
  }

  add(y) {
    return this.op(y, (a, b) => a + b);
  }

  sub(y) {
    return this.op(y, (a, b) => a - b);
  }

  mul(y) {
    return this.op(y, (a, b) => a * b);
  }

  div(y) {
    return this.op(y, (a, b) => a / b);
  }

  dot(y) {
    return this.#vec.reduce((acc, v, i) => acc + v * y.#vec[i], 0);
  }

  length() {
    return Math.sqrt(this.dot(this));
  }

  squareLength() {
    return this.dot(this);
  }

  normalize() {
    return this.scale(1 / this.length());
  }

  scale(r) {
    return this.map(z => z * r);
  }

  map(lambda) {
    return Vector.fromArray(this.#vec.map(lambda));
  }

  /**
   *
   * @param {*} y: Vec
   * @param {*} operation: (a,b) => op(a,b)
   */
  op(y, operation) {
    sameSizeOrError(this, y);
    return Vector.fromArray(this.#vec.map((v, i) => operation(v, y.#vec[i])));
  }

  reduce(fold, init) {
    return this.#vec.reduce(fold, init);
  }

  fold(foldMap, init) {
    return this.reduce(foldMap, init);
  }

  equals(y, precision = 1e-5) {
    if (!(y instanceof Vector)) return false;
    return this.sub(y).length() < precision;
  }

  take(n) {
    return new Vector(...this.#vec.slice(0, n));
  }

  static fromArray(array) {
    return new Vector(...array);
  }

  static of(...values) {
    return new Vector(...values);
  }

  static ZERO = n => new Vector(...new Array(n).fill(0));
  static e = n => i =>
    new Vector(...new Array(n).fill(0).map((x, j) => (j === i - 1 ? 1 : 0)));
}

const type2constructor = {
  Float32Array: array => new Float32Array(array),
  Float64Array: array => new Float64Array(array)
};

function sameSizeOrError(a, b) {
  if (a.n === b.n) {
    return true;
  }
  throw new Error("Vector must have same size");
}
