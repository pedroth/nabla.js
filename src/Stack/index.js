
import { Maybe } from "../Maybe/index.js";

// Immutable Stack Implementation
export class Stack {
    constructor(head, tail) {
        this.head = head || null;
        this.tail = tail || null;
        this._size = head ? (tail ? tail._size + 1 : 1) : 0;
    }

    size() {
        return this._size;
    }

    isEmpty() {
        return this._size === 0;
    }

    push(x) {
        const previousStack = new Stack(this.head, this.tail);
        this.head = x;
        this.tail = previousStack;
        this._size = previousStack._size + 1;
        return this;
    }

    pop() {
        if (this.isEmpty()) return Maybe.none();
        const popValue = this.head;
        const nextStack = this.tail;
        this.head = nextStack.head;
        this.tail = nextStack.tail;
        this._size = nextStack._size;
        return Maybe.of(popValue);
    }

    peek() {
        return Maybe.of(this.head);
    }
}