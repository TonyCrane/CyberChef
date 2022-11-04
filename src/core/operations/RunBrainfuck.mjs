/**
 * @author TonyCrane [tonycrane@foxmail.com]
 * @copyright Crown Copyright 2022
 * @license Apache-2.0
 */

import Operation from "../Operation.mjs";
import OperationError from "../errors/OperationError.mjs";

/**
 * Run brainfuck operation
 */
class RunBrainfuck extends Operation {

    /**
     * RunBrainfuck constructor
     */
    constructor() {
        super();

        this.name = "Run Brainfuck";
        this.module = "Esolang";
        this.description = "Run brainfuck language";
        this.infoURL = "https://esolangs.org/wiki/Brainfuck";
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
        const bfInput = args[0];

        return this.parse(input)(bfInput);
    }

    parse = (function () {
        let input;
        let output;
        let data;
        let ptr;

        const ops = {
            "+": function () {
                data[ptr] = data[ptr] || 0;
                data[ptr]++;
            },
            "-": function () {
                data[ptr] = data[ptr] || 0;
                data[ptr]--;
            },
            "<": function () {
                ptr--;
                if (ptr < 0) {
                    ptr = 0;
                }
            },
            ">": function () {
                ptr++;
            },
            ".": function () {
                const c = String.fromCharCode(data[ptr]);
                output.push(c);
            },
            ",": function () {
                const c = input.shift();
                if (typeof c == "string") {
                    data[ptr] = c.charCodeAt(0);
                }
                if (c === undefined) {
                    throw new OperationError("Input is not enough");
                }
            },
        };

        /**
         * @param {function[]} nodes
         * @returns {function}
         */
        function program(nodes) {
            return function (inputString) {
                output = [];
                data = [];
                ptr = 0;
                input = inputString && inputString.split("") || [];
                nodes.forEach(function (node) {
                    node();
                });
                return output.join("");
            };
        }

        /**
         * @param {function[]} nodes
         * @returns {function}
         */
        function loop(nodes) {
            return function () {
                let loopCounter = 0;

                while (data[ptr] > 0) {
                    if (loopCounter++ > 10000) {
                        throw new OperationError("Infinite loop detected");
                    }

                    nodes.forEach(function (node) {
                        node();
                    });
                }
            };
        }

        let programChars;

        /**
         * @returns {function}
         */
        function parseProgram() {
            const nodes = [];
            let nextChar;

            while (programChars.length > 0) {
                nextChar = programChars.shift();
                if (ops[nextChar]) {
                    nodes.push(ops[nextChar]);
                } else if (nextChar === "[") {
                    nodes.push(parseLoop());
                } else if (nextChar === "]") {
                    throw new OperationError("Missing opening bracket");
                }
            }

            return program(nodes);
        }

        /**
         * @returns {function}
         */
        function parseLoop() {
            const nodes = [];
            let nextChar;

            while (programChars[0] !== "]") {
                nextChar = programChars.shift();
                if (nextChar === undefined) {
                    throw OperationError("Missing closing bracket");
                } else if (ops[nextChar]) {
                    nodes.push(ops[nextChar]);
                } else if (nextChar === "[") {
                    nodes.push(parseLoop());
                }
            }
            programChars.shift(); // discard "]"

            return loop(nodes);
        }

        /**
         * @param {string} str
         * @returns {function}
         */
        function parse(str) {
            programChars = str.split("");
            return parseProgram();
        }

        return parse;
    })();

}

export default RunBrainfuck;
