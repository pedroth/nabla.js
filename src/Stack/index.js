import { List } from "../List/index.js";
import { Maybe } from "../Maybe/index.js";

export class Stack {
    constructor() {
        this.head = null;
        this.tail = null;
        this.stack = new List();
    }

    size() {
        return this.stack.size();
    }

    isEmpty() {
        return this.stack.isEmpty();
    }

    push(x) {
        if (this.head == null) {
            this.head = x;
            this.tail = x;
            this.stack.push(x);
        } else {
            this.tail = x;
            this.stack.push(x);
        }
    }

    pop() {
        if (this.isEmpty()) return Maybe.none();
        const ans = this.tail;
        if (this.head === this.tail) {
            this.head = null;
            this.tail = null;
            this.stack = new List();
            return Maybe.some(ans);
        }
        // !! Mutation !!
        this.stack = this.stack.tail;
        this.tail = this.stack.tail === null ? this.stack.head : this.stack.tail.head;
        return Maybe.some(ans);
    }

    peek() {
        if (this.isEmpty()) return Maybe.none();
        return Maybe.some(this.head);   
    }
}