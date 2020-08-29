import Pair from "../../Pair/main/Pair";

export default class List {
  #list = new Pair();
  #size = -1;

  /**
   *
   * @param {*} head: Element
   * @param {*} tail: List<Element>
   */
  constructor(head, tail) {
    if (!head) return this;
    this.#list = new Pair(head, emptyTail(tail) ? new Pair() : tail);
  }

  head() {
    return this.#list.left();
  }

  tail() {
    return this.#list.right();
  }

  concat(list) {
    if (this.isEmpty()) return list;
    return new List(this.head(), this.tail().concat(list.tail()));
  }

  sum = this.concat;

  map(f) {}

  isEmpty() {
    return this.#list.isEmpty();
  }

  length() {
    if (this.isEmpty()) return 0;
    if (this.#size >= 0) return this.#size;
    this.#size = 1 + this.tail().length();
    return this.#size;
  }

  toArray() {
    return [this.head].concat(this.tail.toArray());
  }

  static fromArray([head, ...tail]) {
    return new List(head, List.fromArray(tail));
  }
}

function emptyTail(tail) {
  return !tail || !(tail instanceof List);
}
