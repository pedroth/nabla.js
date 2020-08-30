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
    this.#list = new Pair(head, emptyTail(tail) ? new List() : tail);
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
    if (this.isEmpty()) return [];
    return [this.head()].concat(this.tail().toArray());
  }

  toString() {
    if (this.isEmpty()) return "";
    return `[${this.head()}, ${this.tail().toString()}]`;
  }

  static fromArray([head, ...tail]) {
    if (!head) return new List();
    return new List(head, List.fromArray(tail));
  }

  static of(...array) {
    return List.fromArray(array);
  }
}

function emptyTail(tail) {
  return !tail || !(tail instanceof List);
}
