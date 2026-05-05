import { Array } from "../Array/index.js";

export class Stack {
    constructor() {
        this.stack = new Array();
    }

    size() {
        return this.stack.size();
    }

    isEmpty() {
        return this.stack.isEmpty();
    }

    push(x) {
        this.stack.push(x);
        return this;
    }

    pop() {
        return this.stack.pop();
    }

    peek() {
        return this.stack.get(this.stack.size() - 1);
    }
}