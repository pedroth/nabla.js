import { Stack } from "../Stack/index.js";
import { Maybe } from "../Maybe/index.js";

export class Queue {
    constructor() {
        this.inStack = new Stack();
        this.outStack = new Stack();
    }

    // ========== Core State Operations ==========

    isEmpty() {
        return this.inStack.isEmpty() && this.outStack.isEmpty();
    }

    size() {
        return this.inStack.size() + this.outStack.size();
    }

    // ========== Private Helper ==========

    transfer() {
        if (!this.outStack.isEmpty()) return;

        while (!this.inStack.isEmpty()) {
            const value = this.inStack.pop().orElse();
            this.outStack.push(value);
        }
    }

    // ========== Queue Operations ==========

    enqueue(x) {
        this.inStack.push(x);
        return this;
    }

    dequeue() {
        this.transfer();

        if (this.outStack.isEmpty()) {
            return Maybe.none();
        }

        return this.outStack.pop();
    }

    peek() {
        this.transfer();

        if (this.outStack.isEmpty()) {
            return Maybe.none();
        }

        return this.outStack.peek();
    }
}