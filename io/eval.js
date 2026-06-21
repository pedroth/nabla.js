
import * as nabla from "../src/index.js";
import { parse, render } from "https://cdn.jsdelivr.net/npm/nabladown.js/dist/web/index.js";

function returnLastExpression(code) {
    const lines = code.trimEnd().split("\n");
    let i = lines.length - 1;
    while (i >= 0 && lines[i].trim() === "") i--;
    if (i < 0) return code;
    const last = lines[i].trim();
    const noReturn = ["return ", "if ", "for ", "while ", "do ", "switch ",
        "try ", "throw ", "const ", "let ", "var ", "function ", "class ", "{", "}"];
    if (!noReturn.some(p => last.startsWith(p))) {
        lines[i] = "return " + lines[i];
    }
    return lines.join("\n");
}

export async function codeEval(code) {
    const declarations = Object.entries(nabla)
        .map(([name]) => `var ${name} = nabla["${name}"];`)
        .join("\n");
    code = `(async () => {
    var IO = await import("./io.js");
    IO = IO.default;
    ${declarations}
    ${returnLastExpression(code)}
    })()`;
    let evaluation;
    try {
        evaluation = await eval(code);
    } catch (e) {
        evaluation = e.message;
    }
    return serializeEvaluation(evaluation);
}

function serializeEvaluation(evaluation) {
    if (typeof evaluation !== "object") return String(evaluation);
    if (typeof evaluation?.toVisual === "function") {
        const visual = evaluation.toVisual();
        return renderType(visual);
    }
    return evaluation.toString();
}

const renderHandlers = {
    latex: (value) => render(parse(`$${value}$\n`)),
    canvas: (value) => value.DOM,
};

async function renderType(visualObj) {
    const handler = renderHandlers[visualObj.type];
    if (handler) return handler(visualObj.value);
    return String(visualObj.value);
}