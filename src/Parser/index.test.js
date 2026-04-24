import { expect, test } from "bun:test";
import { Parser, rule, symbol, or, dot, token, tokenize, epsilon } from "./index.js";

test("Parse S => bS | a", () => {
    const parser = Parser.builder()
        .addRule(
            rule(
                symbol("S"),
                or(
                    dot(
                        token("b"),
                        symbol("S")
                    ),
                    token("a")
                )
            )
        )
        .build();
    const expectedResult = {
        type: "rule",
        symbol: "S",
        value: {
            type: "dot",
            elements: [
                { type: "token", token: "b" },
                {
                    type: "rule",
                    symbol: "S",
                    value: {
                        type: "dot",
                        elements: [
                            { type: "token", token: "b" },
                            {
                                type: "rule",
                                symbol: "S",
                                value: {
                                    type: "dot",
                                    elements: [
                                        { type: "token", token: "b" },
                                        {
                                            type: "rule",
                                            symbol: "S",
                                            value: {
                                                type: "rule",
                                                symbol: "S",
                                                value: {
                                                    type: "token",
                                                    token: "a"
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        }
    };
    const result = parser.parse(tokenize("bbba"));
    expect(result).toEqual(expectedResult);
});

test("Parse S => (S)S| epsilon ", () => {
    const parser = Parser.builder()
        .addRule(
            rule(
                symbol("S"),
                or(
                    dot(
                        token("("),
                        symbol("S"),
                        token(")"),
                        symbol("S")
                    ),
                    epsilon()
                )
            )
        )
        .build();
    const expectedResult = {
        type: "rule",
        symbol: "S",
        value: {
            type: "dot",
            elements: [
                { type: "token", token: "(" },
                {
                    type: "rule",
                    symbol: "S",
                    value: {
                        type: "dot",
                        elements: [
                            { type: "token", token: "(" },
                            { type: "rule", symbol: "S", value: { type: "epsilon" } },
                            { type: "token", token: ")" },
                            {
                                type: "rule",
                                symbol: "S",
                                value: {
                                    type: "dot",
                                    elements: [
                                        { type: "token", token: "(" },
                                        { type: "rule", symbol: "S", value: { type: "epsilon" } },
                                        { type: "token", token: ")" },
                                        { type: "rule", symbol: "S", value: { type: "epsilon" } }
                                    ]
                                }
                            }
                        ]
                    }
                },
                { type: "token", token: ")" },
                {
                    type: "rule",
                    symbol: "S",
                    value: {
                        type: "dot",
                        elements: [
                            { type: "token", token: "(" },
                            { type: "rule", symbol: "S", value: { type: "epsilon" } },
                            { type: "token", token: ")" },
                            { type: "rule", symbol: "S", value: { type: "epsilon" } }
                        ]
                    }
                }
            ]
        }
    };
    const result = parser.parse(tokenize("(()())()"));
    expect(result).toEqual(expectedResult);
});


test("Calculator test", () => {
    // S -> N (+ | -) S | N (+ | -) F | F (+ | -) S | F
    // F -> N (* | /) F | N (* | /) E | E (* | /) F | E
    // E -> (S) | N | Var
    // N -> D.D | -D.D | D | -D
    // D ->  0D | 1D | epsilon
    const parser = Parser.builder()
        .addRule(
            rule(
                symbol("S"),
                or(
                    dot(
                        symbol("N"),
                        or(token("+"), token("-")),
                        symbol("S")
                    ),
                    dot(
                        symbol("N"),
                        or(token("+"), token("-")),
                        symbol("F")
                    ),
                    dot(
                        symbol("F"),
                        or(token("+"), token("-")),
                        symbol("S")
                    ),
                    symbol("F")
                )
            )
        )
        .addRule(
            rule(
                symbol("F"),
                or(
                    dot(
                        symbol("N"),
                        or(token("*"), token("/")),
                        symbol("F")
                    ),
                    dot(
                        symbol("N"),
                        or(token("*"), token("/")),
                        symbol("E")
                    ),
                    dot(
                        symbol("E"),
                        or(token("*"), token("/")),
                        symbol("F")
                    ),
                    symbol("E")
                )
            )
        )
        .addRule(
            rule(
                symbol("E"),
                or(
                    dot(token("("), symbol("S"), token(")")),
                    symbol("N"),
                    token("x")
                )
            )
        )
        .addRule(
            rule(
                symbol("N"),
                or(
                    dot(symbol("D"), token("."), symbol("D")),
                    dot(token("-"), symbol("D"), token("."), symbol("D")),
                    symbol("D"),
                    dot(token("-"), symbol("D"))
                )
            )
        )
        .addRule(
            rule(
                symbol("D"),
                or(
                    dot(token("0"), symbol("D")),
                    dot(token("1"), symbol("D")),
                    epsilon()
                )
            )
        )
        .build();
    const result = parser.parse(tokenize("(1.10+10-1)*101"));
    const expectedResult = {
        type: "rule",
        symbol: "S",
        value: {
            type: "rule",
            symbol: "F",
            value: {
                type: "dot",
                elements: [
                    {
                        type: "rule",
                        symbol: "E",
                        value: {
                            type: "dot",
                            elements: [
                                { type: "token", token: "(" },
                                {
                                    type: "rule",
                                    symbol: "S",
                                    value: {
                                        type: "dot",
                                        elements: [
                                            {
                                                type: "rule",
                                                symbol: "N",
                                                value: {
                                                    type: "dot",
                                                    elements: [
                                                        {
                                                            type: "rule",
                                                            symbol: "D",
                                                            value: {
                                                                type: "dot",
                                                                elements: [
                                                                    { type: "token", token: "1" },
                                                                    { type: "rule", symbol: "D", value: { type: "epsilon" } }
                                                                ]
                                                            }
                                                        },
                                                        { type: "token", token: "." },
                                                        {
                                                            type: "rule",
                                                            symbol: "D",
                                                            value: {
                                                                type: "dot",
                                                                elements: [
                                                                    { type: "token", token: "1" },
                                                                    {
                                                                        type: "rule",
                                                                        symbol: "D",
                                                                        value: {
                                                                            type: "dot",
                                                                            elements: [
                                                                                { type: "token", token: "0" },
                                                                                { type: "rule", symbol: "D", value: { type: "epsilon" } }
                                                                            ]
                                                                        }
                                                                    }
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            { type: "token", token: "+" },
                                            {
                                                type: "rule",
                                                symbol: "S",
                                                value: {
                                                    type: "dot",
                                                    elements: [
                                                        {
                                                            type: "rule",
                                                            symbol: "N",
                                                            value: {
                                                                type: "rule",
                                                                symbol: "D",
                                                                value: {
                                                                    type: "dot",
                                                                    elements: [
                                                                        { type: "token", token: "1" },
                                                                        {
                                                                            type: "rule",
                                                                            symbol: "D",
                                                                            value: {
                                                                                type: "dot",
                                                                                elements: [
                                                                                    { type: "token", token: "0" },
                                                                                    { type: "rule", symbol: "D", value: { type: "epsilon" } }
                                                                                ]
                                                                            }
                                                                        }
                                                                    ]
                                                                }
                                                            }
                                                        },
                                                        { type: "token", token: "-" },
                                                        {
                                                            type: "rule",
                                                            symbol: "S",
                                                            value: {
                                                                type: "rule",
                                                                symbol: "F",
                                                                value: {
                                                                    type: "rule",
                                                                    symbol: "E",
                                                                    value: {
                                                                        type: "rule",
                                                                        symbol: "N",
                                                                        value: {
                                                                            type: "rule",
                                                                            symbol: "D",
                                                                            value: {
                                                                                type: "dot",
                                                                                elements: [
                                                                                    { type: "token", token: "1" },
                                                                                    { type: "rule", symbol: "D", value: { type: "epsilon" } }
                                                                                ]
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                },
                                { type: "token", token: ")" }
                            ]
                        }
                    },
                    { type: "token", token: "*" },
                    {
                        type: "rule",
                        symbol: "F",
                        value: {
                            type: "rule",
                            symbol: "E",
                            value: {
                                type: "rule",
                                symbol: "N",
                                value: {
                                    type: "rule",
                                    symbol: "D",
                                    value: {
                                        type: "dot",
                                        elements: [
                                            { type: "token", token: "1" },
                                            {
                                                type: "rule",
                                                symbol: "D",
                                                value: {
                                                    type: "dot",
                                                    elements: [
                                                        { type: "token", token: "0" },
                                                        {
                                                            type: "rule",
                                                            symbol: "D",
                                                            value: {
                                                                type: "dot",
                                                                elements: [
                                                                    { type: "token", token: "1" },
                                                                    { type: "rule", symbol: "D", value: { type: "epsilon" } }
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        }
    };
    expect(result).toEqual(expectedResult);
    expect(result).not.toBeInstanceOf(Error);
});
