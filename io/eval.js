
import * as nabla from "../src/index.js";

export function codeEval(code) {
    const declarations = Object.entries(nabla)
        .map(([name]) => `var ${name} = nabla["${name}"];`)
        .join("\n");
    code = `
    ${declarations}
    ${code}
    `;
    let evaluation;
    try {
        evaluation = eval(code);
    } catch (e) {
        evaluation = e.message;
    }
    evaluation = evaluation == null ?
        "undefined" :
        evaluation?.toString == null ?
            evaluation :
            evaluation.toString()
    return JSON.stringify(evaluation, null, 2);
}