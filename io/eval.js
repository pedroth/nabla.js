
import * as nabla from "../src/index.js";
 import { parse, render } from "https://cdn.jsdelivr.net/npm/nabladown.js/dist/web/index.js";

export async function codeEval(code) {
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
    if(typeof evaluation === "object" && typeof evaluation?.toVisual === "function") {
        evaluation = evaluation.toVisual();
        if(evaluation.type === "latex") {
            evaluation = await render(parse(`$${evaluation.value}$\n`));
        } 
    }
    else if(typeof evaluation === "object" && typeof evaluation?.toString === "function") {
        evaluation = evaluation.toString();
    } else {
        evaluation = String(evaluation);
    }
    return evaluation;
}