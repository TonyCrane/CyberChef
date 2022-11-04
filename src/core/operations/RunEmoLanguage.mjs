/**
 * @author TonyCrane [tonycrane@foxmail.com]
 * @copyright Crown Copyright 2022
 * @license Apache-2.0
 */

import Operation from "../Operation.mjs";
import OperationError from "../errors/OperationError.mjs";

/**
 * Run Emo Language operation
 */
class RunEmoLanguage extends Operation {

    /**
     * RunEmoLanguage constructor
     */
    constructor() {
        super();

        this.name = "Run Emo Language";
        this.module = "Esolang";
        this.description = "Run emo language";
        this.infoURL = "https://esolangs.org/wiki/Emo";
        this.inputType = "string";
        this.outputType = "string";
        this.args = [
            {
                name: "Input (optional)",
                type: "string",
                value: ""
            },
        ];
    }

    /**
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    run(input, args) {
        const programInput = args[0];
        this.check(input);
        return this.emulate(input, programInput);
    }

    /**
     * @param {string} input
     * @throws {OperationError}
     */
    check(input) {
        const lines = input.split("\n");
        let i = 0;
        let nestedLoopCount = 0;
        const errors = [];
        for (let index = 0; index < lines.length; index++) {
            const l = lines[index];
            const line = l.split("~")[0].trim();
            if (line.length === 0) continue;
            const len = line.length - 1;
            if (line[0] !== ":" && line[0] !== ";" && line[0] !== "<" && line[0] !== "=") {
                errors.push(`Line(${i}): Line must begin with :, ;, =, or <`);
            }
            if (line[len] !== ")" && line[len] !== "(" && line[len] !== ">" && line[len] !== "|" && line[len] !== "@" && line[len] !== "}" && line[len] !== "{") {
                errors.push(`Line(${i}): Line must end with (, ), |, @, {, }, or >`);
            }
            if (line.indexOf(";") < 0 && line.indexOf(":") < 0 && line.indexOf("=") < 0) {
                errors.push(`Line(${i}): Line must contain :, ;, or =`);
            }
            if (line.indexOf(")") < 0 && line.indexOf("(") < 0 && line.indexOf("|") < 0 && line.indexOf("@") < 0 && line[len] !== "}" && line[len] !== "{") {
                errors.push(`Line(${i}): Line must contain (, ), @, }, {, or |`);
            }
            if (line.indexOf("<") >= 0) {
                nestedLoopCount++;
            }
            if (line.indexOf(">") >= 0) {
                nestedLoopCount--;
            }
            i++;
        }
        if (nestedLoopCount !== 0) {
            errors.push("Incorrect nested loops, missing opening or closing bracket");
        }
        if (errors.length > 0) {
            throw new OperationError(errors.join("\n"));
        }
    }

    /**
     * @param {string} code
     * @param {string} inputString
     * @returns {string}
     */
    emulate(code, inputString) {
        const lines = code.split("\n");
        const input = inputString && inputString.split("") || [];
        const output = [];
        const memory = [];
        const loopBegin = [];
        const loopEnd = [];
        const stack = [];
        let ptrOrValue = false;
        let justLooped = false;
        let register = 0;
        let workingLocation = 0;
        let currentMemoryPtr = 0;
        let loopIndex = 0;
        let c;

        for (let index = 0; index < lines.length; index++) {
            const l = lines[index];
            const line = l.split("~")[0].trim();
            const len = line.length;
            for (let i = 0; i < len; i++) {
                switch (line[i]) {
                    case ";":
                        workingLocation = memory[currentMemoryPtr];
                        ptrOrValue = true;
                        break;
                    case ":":
                        workingLocation = register;
                        ptrOrValue = false;
                        break;
                    case ")":
                        register = workingLocation;
                        break;
                    case "}":
                        register = memory[currentMemoryPtr] || 0;
                        break;
                    case "{":
                        memory[currentMemoryPtr] = register;
                        break;
                    case "(":
                        memory[currentMemoryPtr] = workingLocation;
                        break;
                    case "^":
                        if (ptrOrValue) {
                            currentMemoryPtr++;
                        } else {
                            workingLocation++;
                        }
                        break;
                    case "-":
                        if (ptrOrValue) {
                            currentMemoryPtr--;
                        } else {
                            workingLocation--;
                        }
                        break;
                    case "o":
                        if (ptrOrValue) {
                            currentMemoryPtr = currentMemoryPtr << 1;
                        } else {
                            workingLocation = workingLocation << 1;
                        }
                        break;
                    case "c":
                        if (ptrOrValue) {
                            currentMemoryPtr = currentMemoryPtr >> 1;
                        } else {
                            workingLocation = workingLocation >> 1;
                        }
                        break;
                    case "=":
                        c = input.shift();
                        if (typeof c == "string") {
                            workingLocation = c.charCodeAt(0);
                        }
                        if (c === undefined) {
                            throw new OperationError("Input is not enough");
                        }
                        break;
                    case "|":
                        break;
                    case "@":
                        c = String.fromCharCode(workingLocation);
                        output.push(c);
                        break;
                    case "<":
                        if (justLooped) {
                            justLooped = false;
                        } else {
                            loopIndex++;
                            loopBegin[loopIndex] = index;
                        }
                        break;
                    case ">":
                        loopEnd[loopIndex] = index;
                        if (memory[currentMemoryPtr] === 0) {
                            loopIndex--;
                        } else {
                            index = loopBegin[loopIndex] - 1;
                            justLooped = true;
                            continue;
                        }
                        break;
                    case "P":
                        stack.push(workingLocation);
                        break;
                    case "X":
                        workingLocation = stack.pop();
                        break;
                    default:
                        break;
                }
            }
        }
        return output.join("");
    }

}

export default RunEmoLanguage;
