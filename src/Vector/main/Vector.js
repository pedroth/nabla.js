//immutable class, not managing exceptions
export default class Vector {
  constructor(...arrayOfNumbers) {
    this.vec = arrayOfNumbers.map(z => (z === null || z === undefined ? 0 : z));
  }

  toArray() {
    return [...this.vec];
  }

  toString() {
    return "[" + this.vec.join(", ") + "]";
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
    return this.vec.reduce((acc, v, i) => acc + v * y.vec[i], 0);
  }

  length() {
    return Math.sqrt(this.dot(this));
  }

  normalize() {
    return this.scale(1 / this.length());
  }

  scale(r) {
    return this.map(z => z * r);
  }

  map(lambda) {
    return Vector.fromArray(this.vec.map(lambda));
  }

  /**
   *
   * @param {*} y: Vec
   * @param {*} operation: (a,b) => op(a,b)
   */
  op(y, operation) {
    return Vector.fromArray(this.vec.map((v, i) => operation(v, y.vec[i])));
  }

  reduce(fold, init) {
    return this.vec.reduce(fold, init);
  }

  equals(y, precision = 1e-5) {
    if (!(y instanceof Vector)) return false;
    return this.sub(y).length() < precision;
  }

  static fromArray(array) {
    return new Vector(...array);
  }

  static of(...values) {
    return new Vector(...values);
  }

  static ZERO = n => new Vector(...new Array(n).fill(0));
  static e = n => i =>
    new Vector(...new Array(n).fill(0).map((x, j) => (j === i ? 1 : 0)));
}
