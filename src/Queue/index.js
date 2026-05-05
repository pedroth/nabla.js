import { List } from "../List/index.js";
import { Maybe } from "../Maybe/index.js";

export class Queue {
    constructor() {
        this.head = null;
        this.tail = null;
        this.queue = new List();
    }

    // ========== Core State Operations ==========

    isEmpty() {
        return this.queue.isEmpty();
    }

    size() {
        return this.queue.size();
    }

    // ========== Queue Operations ==========

    enqueue(x) {
        if (this.head == null) {
            this.head = x;
            this.tail = x;
            this.queue.push(x);
        } else {
            this.tail = x;
            this.queue.push(x);
        }
    }

    dequeue() {
        if (this.isEmpty()) return Maybe.none();
        const ans = this.head;
        if (this.head === this.tail) {
            this.head = null;
            this.tail = null;
            this.queue = new List();
            return Maybe.some(ans);
        }
        // !! Mutation !!
        this.queue = this.queue.tail;
        this.head = this.queue.head;
        return Maybe.some(ans);
    }

    peek() {
        if (this.isEmpty()) return Maybe.none();
        return Maybe.some(this.head);
    }
}