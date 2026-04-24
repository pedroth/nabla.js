import { Try } from "../Try/index.js";
import { Pair } from "../Pair/index.js";

/**
 * Top down parser combinator library for non-left recursive context free grammars.
 */
export class Parser {
    // parser is a collection of rules
    // a rule := (symbol, ruleExpression)
    // ruleExpression := or | dot | token | symbol | epsilon
    // symbol(a: string)
    // token(a: string)
    // epsilon
    // dot(rulesExpr: list<ruleExpression>)
    // or(rulesExpr: list<ruleExpression>)
    constructor(rules) {
        const [startRule, ...otherRules] = rules;
        if (!startRule) throw Error("No start rule")
        this.startSymbol = startRule.symbol.id;
        this.symbol2rule = {};
        this.symbol2rule[this.startSymbol] = startRule.ruleExpr;
        otherRules.forEach((aRule) => {
            this.symbol2rule[aRule.symbol.id] = aRule.ruleExpr;
        })
    }

    parse(tokens) {
        const startRule = this.symbol2rule[this.startSymbol];
        if (!startRule) return Try.fail("No start rule found for symbol " + this.startSymbol);
        return startRule.parse(this, tokens)
            .map((res) => {
                return { type: "rule", symbol: this.startSymbol, value: res.left() };
            })
            .orCatch((e) => new Error(e));
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

export function rule(symbol, ruleExpr) {
    if ("symbol" !== symbol.type) throw Error("left arg not a symbol");
    return {
        type: "rule",
        symbol,
        ruleExpr,
        // parse: (parser: Parser, tokens: list<token>) => Success(Pair(ruleObj, nextTokens: list<token>)) | Failure()
        parse: (parser, tokens) => {
            const result = ruleExpr.parse(parser, tokens);
            return result
                .map((res) => {
                    return Pair.of({ type: "rule", symbol: symbol.id, value: res.left() }, res.right());
                })
                .orCatch(() => "failed to parse rule " + symbol.id);
        }
    };
}

export function or(...rulesExpr) {
    const ans = {};
    ans.type = "or";
    ans.rulesExpr = rulesExpr;
    ans.parse = (parser, tokens) => {
        let ans = Try.fail("no rule matched");
        for (let i = 0; i < rulesExpr.length; i++) {
            ans = ans.orCatch(() => rulesExpr[i].parse(parser, tokens));
            if (ans.isSuccess()) break;
        }
        return ans;
    };
    return ans;
}

export function dot(...rulesExpr) {
    const ans = {};
    ans.type = "dot";
    ans.rulesExpr = rulesExpr;
    ans.parse = (parser, tokens) => {
        const results = [];
        let tokenStream = tokens;
        for (let i = 0; i < rulesExpr.length; i++) {
            const result = rulesExpr[i].parse(parser, tokenStream);
            if (result.isFailure()) {
                return Try.fail("failed to parse dot rule at index " + i);
            }
            tokenStream = result.orCatch(x => x).right();
            results.push(result.orCatch(x => x).left());
        }
        return Try.success(Pair.of({ type: "dot", elements: results }, tokenStream));
    };
    return ans;
}

export function symbol(s) {
    const ans = {};
    ans.type = "symbol";
    ans.id = s;
    ans.parse = (parser, tokens) => {
        const ruleFromSymbol = parser.symbol2rule[s];
        if (!ruleFromSymbol) return Try.fail("no rule for symbol " + s);
        return ruleFromSymbol.parse(parser, tokens).map((x) => {
            const parsedValue = x.left();
            const value = parsedValue.type === "token"
                ? { type: "rule", symbol: s, value: parsedValue }
                : parsedValue;
            return Pair.of({ type: "rule", symbol: s, value }, x.right());
        });
    }
    return ans;
}

export function token(s) {
    const ans = {}
    ans.type = "token";
    ans.id = s;
    ans.equals = (otherToken) => otherToken.type === "token" && otherToken.id === s;
    ans.parse = (parser, tokens) => {
        const [token, ...restTokens] = tokens;
        if (token && ans.equals(token)) {
            return Try.success(Pair.of({ type: "token", token: s }, restTokens));
        } else {
            return Try.fail("expected token " + s + " but got " + token);
        }
    }
    return ans;
}


export function epsilon() {
    return {
        type: "epsilon",
        parse: (parser, tokens) => {
            return Try.success(Pair.of({ type: "epsilon" }, tokens));
        }
    };
}

export function tokenize(inputString) {
    return inputString.split("").map((s) => token(s));
}

