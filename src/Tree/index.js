import { Maybe } from "../Maybe";

// TreeNode :: () |
//             { 
//                  key: comparable, 
//                  value: any, 
//                  left: TreeNode, 
//                  right: TreeNode, 
//                  size: number
//             }
function createNode(key, value) {
    return {
        type: "TreeNode",
        key: key,
        value: value,
        left: null,
        right: null,
        size: 1
    };
}

function computeSize(treeNode) {
    if (treeNode === null || treeNode.size === 0) {
        return 0;
    }
    return 1 + (treeNode.left?.size ?? 0) + (treeNode.right?.size ?? 0);
}

// Split treeNode T into:
// leftTree  = keys <= x
// rightTree = keys > x
function split(T, x, compareFunc) {
    if (T === null || T.size === 0) {
        return [null, null];
    }
    
    if (compareFunc(x, T.key) <= 0) {
        // if x <= T.key, then T.right keeps constant
        // need to split left subtree
        const [leftTree, middleTree] = split(T.left, x, compareFunc);

        // T will be the right split, hence its T.left should be > x
        T.left = middleTree;
        T.size = computeSize(T);

        return [leftTree, T];
    } else {
        // if x > T.key, then T.left keeps constant
        // need to split right subtree
        const [middleTree, rightTree] = split(T.right, x, compareFunc);

        // T will be the left split, hence its T.right should be < x
        T.right = middleTree;
        T.size = computeSize(T);

        return [T, rightTree];
    }
}

function put(treeNode, key, value, opts) {
    const {compareFunc, random} = opts;
    if (treeNode === null || treeNode.size === 0) {
        return createNode(key, value);
    }

    const n = treeNode.size;
    const coin = Math.floor(random() * (n + 1)) === 0;
    if(coin) {
      // Enters with probability = 1 / (n + 1)
      const [leftT, rightT] = split(treeNode, key, compareFunc);
      const newNode = createNode(key, value);
      newNode.left = leftT;
      newNode.right = rightT;
      newNode.size = computeSize(newNode);
      return newNode;
    }

    if (compareFunc(key, treeNode.key) < 0) {
        treeNode.left = put(treeNode.left, key, value, opts);
        treeNode.size = computeSize(treeNode);
    } else if (compareFunc(key, treeNode.key) > 0) {
        treeNode.right = put(treeNode.right, key, value, opts);
        treeNode.size = computeSize(treeNode);
    } else {
        treeNode.value = value;
    }
    return treeNode;
}

function get(treeNode, key, compareFunc) {
    if (treeNode === null || treeNode.size === 0) {
        return Maybe.none();
    }
    if (compareFunc(key, treeNode.key) < 0) {
        return get(treeNode.left, key, compareFunc);
    } else if (compareFunc(key, treeNode.key) > 0) {
        return get(treeNode.right, key, compareFunc);
    } else {
        return Maybe.some(treeNode.value);
    }
}

export class Tree {
    constructor(compareFunc = (a, b) => a - b, random = Math.random) {
        this.root = null;
        this._size = 0;
        // compareFunc < 0 means a < b
        // compareFunc > 0 means a > b
        // compareFunc === 0 means a == b
        this.compareFunc = compareFunc;
        this.random = random; // for unit tests
    }

    // ========== Core State Operations ==========

    isEmpty() {
        return this.root === null;
    }

    size() {
        return this._size;
    }

    // ========== Read Operations ==========

    get(key) {
      return get(this.root, key, this.compareFunc);
    }

    has(key) {
        return get(this.root, key, this.compareFunc).isSome();
    }

    getEntries() {
        // TODO in future
    }

    // ========== Write Operations ==========

    put(key, value) {
        this.root = put(this.root, key, value, {compareFunc: this.compareFunc, random: this.random});
        this._size = this.root ? this.root.size : 0;
        return this;

    }

    del() {
        // TODO in future
    }
}