import { Try } from "../Try/index.js";

class Parser {
    constructor(rules) {
        const [startRule, ...otherRules] = rules;
        if (!startRule) throw Error("No start rule")
        this.startSymbol = startRule.symbol.id;
        this.symbol2rule = {};
        this.symbol2rule[this.startSymbol] = startRule.rule;
        otherRules.forEach((aRule) => {
            this.symbol2rule[aRule.symbol.id] = aRule.rule;
        })
    }

    parse(inputTree) {
        return this.symbol2rule[this.startSymbol]
            .parse(inputTree, this).map(x => symbol(this.startSymbol, x)).orCatch((e) => new Error(e))
    }

    static builder() {
        return new ParserBuilder();
    }
}

class ParserBuilder {
    constructor() {
        this._rules = [];
    }

    addRule(rule) {
        this._rules.push(rule);
        return this;
    }

    build() {
        return new Parser(this._rules);
    }
}

function rule(symbol, rule) {
    if ("symbol" !== symbol.type) throw Error("left arg not a symbol");
    return {
        type: "rule",
        symbol,
        rule,
        parse: (inputTree, parser) => {
            return rule.parse(inputTree, parser);
        }
    };
}

function or(left, right) {
    return {
        type: "or",
        left,
        right,
        parse: (inputTree, parser) => {
            return Try.success()
                .flatMap(() => {
                    return left.parse(inputTree, parser);
                })
                .failMap(() => {
                    return right.parse(inputTree, parser);
                })
        }
    };
}

function dot(left, right) {
    return {
        type: "dot",
        left,
        right,
        parse: (inputTree, parser) => {
            const inType = inputTree.type;
            if (inType !== "dot") return Try.failure("Not a dot input");
            const leftMaybe = left.parse(inputTree.left, parser);
            if (!leftMaybe.isSuccess()) return Try.failure("Fail to parse left");
            const rightMaybe = right.parse(inputTree.right, parser);
            if (!rightMaybe.isSuccess()) return Try.failure("Fail to parse right");
            return leftMaybe.flatMap(l => rightMaybe.map(r => dot(l, r)));
        }
    };
}

function symbol(s, value) {
    return {
        type: "symbol",
        id: s,
        value,
        parse: (inputTree, parser) => {
            return parser.symbol2rule[s]
                .parse(inputTree, parser)
                .map(x => symbol(s, x))
        }
    };
}

function token(s) {
    return {
        type: "token",
        id: s,
        parse: (inputTree, parser) => {
            const inType = inputTree.type;
            if (inType !== "token") return Try.failure("Not a token input");
            if (inputTree.id === s) return Try.success(token(s));
            return Try.failure("fail to parse token");
        }
    };
}

function tokenize(s) {
    if (!s || s.length === 0) return;
    if (s.length === 1) return token(s[0]);
    const [head, ...tail] = s;
    return dot(token(head), tokenize(tail));
}

function stringify(tree) {
    if (tree.type === "token") return tree.id;
    if (tree.type === "dot") return `${stringify(tree.left)}${stringify(tree.right)}`;
    if (tree.type === "or") return `${stringify(tree.left)}|${stringify(tree.right)}`;
    if (tree.type === "symbol") return `${stringify(tree.value)}`;
}

// const parser = Parser
//     .builder()
//     .addRule(
//         rule(
//             symbol("S"),
//             or(
//                 dot(
//                     symbol("S"),
//                     token("a")
//                 ),
//                 token("b")
//             )
//         )
//     )
//     .build();

// console.log("AST: ",
//     parser.parse(
//         // dot(
//         //     token("b"),
//         //     dot(
//         //         token("a"),
//         //         token("a")
//         //     )
//         // )
//         dot(
//             dot(dot(token("b"), token("a")), token("a")),
//             token("a")
//         )
//     )
// );
const parser = Parser
    .builder()
    .addRule(
        rule(
            symbol("S"),
            or(
                dot(token("("), dot(symbol("S"), token(")"))),
                or(
                    dot(symbol("S"), symbol("S")),
                    token("1")
                )
            )
        )
    )
    .build();

const expected = dot(
    token("("),
    dot(
        dot(
            dot(
                token("("),
                dot(
                    token("1"),
                    token(")")
                )
            )
            ,
            dot(
                token("("),
                dot(
                    token("1"),
                    token(")")
                )
            )
        ),
        token(")")
    )
);
const actual = tokenize("((1)(1))");
console.log("AST: \n",
    stringify(parser.parse(expected))
);
