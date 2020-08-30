import Pair from "../../Pair/main/Pair";

export default class List {
  #list = new Pair();
  // cache
  #last = null;
  #size = -1;

  /**
   *
   * @param {*} head: Element
   * @param {*} tail: List<Element>
   */
  constructor(head, tail = List.EMPTY_LIST) {
    if (head === null || head === undefined) return this;
    this.#list = new Pair(head, emptyTail(tail) ? new List() : tail);
    this.#last = this.getLast();
  }

  head() {
    return this.#list.left();
  }

  tail() {
    return this.#list.right();
  }

  concat(list) {
    if (this.isEmpty()) return list;
    return new List(this.head(), this.tail().concat(list));
  }

  concatTail(list, result = this) {
    if (this.isEmpty()) return list;
    if (list.isEmpty()) return result;
    return this.concatTail(list.tail(), result.push(list.head()));
  }

  push(element) {
    if (this.isEmpty()) return new List(element);
    return new List(this.head(), this.tail().push(element));
  }

  sum = this.concat;

  map(f) {}

  isEmpty() {
    return this.#list.isEmpty();
  }

  length() {
    if (this.#size >= 0) return this.#size;
    if (this.isEmpty()) return 0;
    this.#size = 1 + this.tail().length();
    return this.#size;
  }

  getLast() {
    if (this.#last !== null) return this.#last;
    if (this.tail().isEmpty()) return this;
    this.#last = this.tail().getLast();
    return this.#last;
  }

  toArray() {
    if (this.isEmpty()) return [];
    return [this.head()].concat(this.tail().toArray());
  }

  toString() {
    if (this.isEmpty()) return "[]";
    return `[${this.toStringRecursive()}]`;
  }

  toStringRecursive() {
    if (this.isEmpty()) return "";
    return `${this.head()}, ${this.tail().toStringRecursive()}`;
  }

  static fromArray([head, ...tail]) {
    if (!head) return new List();
    return new List(head, List.fromArray(tail));
  }

  static of(...array) {
    return List.fromArray(array);
  }
  static EMPTY_LIST = new List();

  static range = (init = 0) => (end, step = 1) =>
    init < end
      ? new List(init, List.range(init + step)(end, step))
      : List.EMPTY_LIST;
  static range0 = List.range(0);

  static rangeR = (init = 0) => (end, step = 1) =>
    List.rangeTail(init, end, step, new List());
  static rangeTail(init, end, step, result) {
    if (init >= end) return result;
    return List.rangeTail(
      init + step,
      end,
      step,
      result.concat(new List(init))
    );
  }
}

function emptyTail(tail) {
  return !tail || !(tail instanceof List);
}
