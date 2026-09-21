
import * as nabla from "../src/index.js";
import { parse, render } from "https://cdn.jsdelivr.net/npm/nabladown.js/dist/web/index.js";
import DOM from "./DomBuilder.js";

function returnLastExpression(code) {
    const lines = code.trimEnd().split("\n");
    let i = lines.length - 1;
    // Walk back past empty lines
    while (i >= 0 && lines[i].trim() === "") i--;
    if (i < 0) return code;
    // Walk back past method chain continuation lines
    while (i > 0 && lines[i].trim().startsWith(".")) i--;
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
    // Wrap object destructuring assignment statements in parens to avoid SyntaxError
    // e.g.  {a, b} = expr  →  ({a, b} = expr)
    code = code.split('\n').map(line => {
        if (/^\s*\{[^{}]*\}\s*=(?!=)/.test(line)) {
            const indent = line.match(/^\s*/)[0];
            return indent + '(' + line.trimStart() + ')';
        }
        return line;
    }).join('\n');
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

function renderMaps(map) {
    const entries = Array.from(map.entries());
    const renderedEntries = entries.map(([key, value]) => {
        const renderedValue = (typeof value?.toVisual === "function")
            ? renderType(value.toVisual())
            : String(value);
        return `${key}: ${renderedValue}`;
    });
    return `{ ${renderedEntries.join(", ")} }`;
}

export function serializeEvaluation(evaluation) {
    if (evaluation instanceof Map) return renderMaps(evaluation);
    if (Array.isArray(evaluation)) return formatArray(evaluation);
    if (typeof evaluation !== "object") return String(evaluation);
    if (typeof evaluation?.toVisual === "function") {
        const visual = evaluation.toVisual();
        return renderType(visual);
    }
    return evaluation.toString();
}

function formatArray(array) {
    const formatValue = value => Array.isArray(value)
        ? `(${value.map(formatValue).join(",")})`
        : String(value);
    return array.map(formatValue).join(", ");
}

const renderHandlers = {
    latex: (value) => render(parse(`$${value}$\n`)),
    canvas: (value) => {
        const canvas = value();
        if (canvas?.DOM) return canvas.DOM;
        if (typeof canvas?.toVisual === "function") return renderType(canvas.toVisual());
        return canvas;
    },
    canvases: (value) => {
        const container = document.createElement("div");
        container.className = "canvas-output";
        container.append(...value().map(canvas => canvas.DOM));
        return container;
    },
    ui: (value) => {
        const container = DOM.of("div").addClass("ui-output");
        value().forEach(control => {
            if (control.type === "canvas") {
                container.appendChild(renderHandlers.canvas(control.value));
                return;
            }
            if (control.type === "slider") {
                const options = control.value();
                const slider = DOM.of("input")
                    .attr("type", "range")
                    .attr("min", options.min ?? 0)
                    .attr("max", options.max ?? 1)
                    .attr("step", options.step ?? 0.01)
                    .event("input", event => options.onChange?.(Number(event.target.value)));
                if (options.value != null) slider.attr("value", options.value);
                container.appendChild(slider);
            }
        });
        return container.build();
    },
};

function renderType(visualObj) {
    const handler = renderHandlers[visualObj.type];
    if (handler) return handler(visualObj.value);
    return String(visualObj.value);
}