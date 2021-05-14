export default class Pair {
  #left = null;
  #right = null;

  constructor(left = null, right = null) {
    this.#left = left;
    this.#right = right;
  }

  left() {
    return this.#left;
  }

  right() {
    return this.#right;
  }

  key = this.left;
  val = this.right;

  first = this.left;
  second = this.right;

  car = this.left;
  cdr = this.right;

  map(f) {
    return new Pair(f(this.#left), f(this.#right));
  }

  reduce(fold, identity) {
    return fold(fold(identity, this.#left), this.#right);
  }

  fold = this.reduce;
  foldLeft = this.fold;

  op(pair, operation) {
    return Pair.of(
      operation(this.#left, pair.#left),
      operation(this.#right, pair.#right)
    );
  }

  isEmpty() {
    return !this.#left && !this.#right;
  }

  toArray() {
    return [this.#left, this.#right];
  }

  copy() {
    return new Pair(this.#left, this.#right);
  }

  static of(key, value) {
    return new Pair(key, value);
  }

  static fromArray([a, b]) {
    return new Pair(a, b);
  }

  static cons = Pair.of;
}
