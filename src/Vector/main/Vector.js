//immutable class, not managing exceptions
//for is faster than reduce, forEach, maps, perf here: https://replit.com/@pedroth/forVsForEach#index.js
//didn't use private vars because of performance
export default class Vector {
  constructor(array) {
    this._vec = BUILD_VEC(array.length);
    for (let i = 0; i < array.length; i++) {
      const z = array[i];
      const zIsNumber =
        (z !== null) & (z !== undefined) & (typeof z === "number");
      this._vec[i] = zIsNumber ? z : 0;
    }
    this._n = this._vec.length;
  }

  get n() {
    return this._n;
  }

  size = () => this._n;
  shape = () => [this._n];

  /**index starts at zero */
  get(i) {
    return this._vec[i];
  }

  toArray() {
    const v = BUILD_VEC(this._n);
    for (let i = 0; i < v.length; i++) {
      v[i] = this._vec[i];
    }
    return v;
  }

  toString() {
    return "[" + this._vec.join(", ") + "]";
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
    // didn't use reduce because this is faster
    let acc = 0;
    for (let i = 0; i < this._n; i++) {
      acc += this._vec[i] * y._vec[i];
    }
    return acc;
  }

  squareLength() {
    return this.dot(this);
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
    const ans = BUILD_VEC(this._n);
    for (let i = 0; i < this._n; i++) {
      ans[i] = lambda(this._vec[i], i);
    }
    return new Vector(ans);
  }

  /**
   *
   * @param {*} y: Vec
   * @param {*} operation: (a,b) => op(a,b)
   */
  op(y, operation) {
    sameSizeOrError(this, y);
    const ans = BUILD_VEC(this._n);
    for (let i = 0; i < this._n; i++) {
      ans[i] = operation(this._vec[i], y._vec[i]);
    }
    return new Vector(ans);
  }

  reduce(fold, init) {
    let acc = init;
    for (let i = 0; i < this._n; i++) {
      acc = fold(acc, this._vec[i], i);
    }
    return acc;
  }

  fold = this.reduce;
  foldLeft = this.fold;

  equals(y, precision = 1e-5) {
    if (!(y instanceof Vector)) return false;
    return this.sub(y).length() < precision;
  }

  take(n) {
    return new Vector(this._vec.slice(0, n));
  }

  static fromArray(array) {
    return new Vector(array);
  }

  static of(...values) {
    return new Vector(values);
  }

  static ZERO = n => new Vector(BUILD_VEC(n));
  static e = n => i => {
    const vec = BUILD_VEC(n);
    if (i >= 0 && i < n) {
      vec[i] = 1;
    }
    return new Vector(vec);
  };
}

const type2constructor = {
  Float32Array: n => new Float32Array(n),
  Float64Array: n => new Float64Array(n)
};

function sameSizeOrError(a, b) {
  if (a.n === b.n) {
    return true;
  }
  throw new VectorException("Vector must have same size");
}

export const BUILD_VEC = n => type2constructor.Float64Array(n);
export class VectorException extends Error {}
