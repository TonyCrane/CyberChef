/**
 * @author TonyCrane [tonycrane@foxmail.com]
 * @copyright Crown Copyright 2023
 * @license Apache-2.0
 */

import Operation from "../Operation.mjs";
import OperationError from "../errors/OperationError.mjs";
import { Instruction } from "../lib/RISCV.mjs";
import { fromHex } from "../lib/Hex.mjs";
import Utils from "../Utils.mjs";

/**
 * RISC-V Encode operation
 */
class RISCVEncode extends Operation {

    /**
     * RISCVEncode constructor
     */
    constructor() {
        super();

        this.name = "RISC-V Encode";
        this.module = "RISCV";
        this.description = [
            "Encode RISC-V instructions (Just encode, not assemble)",
            "<br/><br/>",
            "Improved from <a href='https://gitlab.com/luplab/rvcodecjs/'>gitlab.com/luplab/rvcodecjs<a/>",
            "<br/>",
            "Support RV32I, RV64I, RV128I with Zifencei, Zicsr, MAFDQC extensions",
            "<br/><br/>",
            "<strong>Note: </strong>Can't use pseudo-instructions",
            "<br/>",
            "<strong>Note: </strong>Only support simple labels (not well-tested, unstable)",
        ].join("\n");
        this.infoURL = "https://riscv.org/technical/specifications/";
        this.inputType = "string";
        this.outputType = "byteArray";
        this.args = [
            {
                name: "ISA",
                type: "option",
                value: ["AUTO", "RV32I", "RV64I", "RV128I"]
            },
            {
                name: "Output Mode",
                type: "argSelector",
                value: [
                    {
                        name: "Raw bytes",
                        off: [3, 4]
                    },
                    {
                        name: "Hex string",
                        on: [3, 4]
                    },
                    {
                        name: "Binary string",
                        on: [3, 4]
                    },
                ]
            },
            {
                name: "Ignore illegal inst",
                type: "boolean",
                value: false
            },
            {
                name: "Show inst address",
                type: "boolean",
                value: false
            },
            {
                name: "Show inst input",
                type: "boolean",
                value: false
            }
        ];
    }

    /**
     * @param {string} commands
     * @param {Object[]} args
     * @returns {byteArray}
     */
    run(commands, args) {
        const [isa, outputMode, ignoreIllegal, showAddr, showInput] = args;
        const [insts, refList, lineMap] = this.parseRef(commands);
        const invRefList = this.invRef(refList);
        const instBytecode = [];
        const instBytes = [];
        const ret = [];
        const instNum = insts.length;
        const addrLength = Math.ceil(Math.log(instNum * 4) / Math.log(16));
        for (let i = 0; i < instNum; ++i) {
            let inst;
            const instDeref = this.deref(insts[i], refList, lineMap[i], i * 4);
            try {
                inst = new Instruction(instDeref, { ISA: isa });
            } catch (error) {
                if (ignoreIllegal) {
                    inst = {hex: "ffffffff", bin: "11111111111111111111111111111111"};
                } else {
                    throw new OperationError(`Error at line ${lineMap[i]}: ${error.message}`);
                }
            }
            instBytecode.push(inst.hex);
            instBytes.push(...fromHex(inst.hex));
            if (outputMode !== "Raw bytes") {
                let instStr;
                if (outputMode === "Hex string") {
                    instStr = inst.hex;
                } else if (outputMode === "Binary string") {
                    instStr = inst.bin;
                }
                if (showAddr && showInput) {
                    ret.push(`0x${(i * 4).toString(16).padStart(addrLength, "0")}: ${instStr} [ ${insts[i].trim()} ]`);
                    if (invRefList[i * 4] !== undefined) {
                        ret[ret.length - 1] += ` (label: ${invRefList[i * 4].join(", ")})`;
                    }
                } else if (showAddr) {
                    ret.push(`0x${(i * 4).toString(16).padStart(addrLength, "0")}: ${instStr}`);
                } else if (showInput) {
                    ret.push(`${instStr} [ ${insts[i].trim()} ]`);
                    if (invRefList[i * 4] !== undefined) {
                        ret[ret.length - 1] += ` (label: ${invRefList[i * 4].join(", ")})`;
                    }
                } else {
                    ret.push(instStr);
                }
            }
        }
        if (outputMode === "Raw bytes") {
            return instBytes;
        } else {
            return Utils.strToByteArray(ret.join("\n"));
        }
    }

    /**
     * @param {string} commands
     * @returns {Array, Array}
     */
    parseRef(commands) {
        const codes = commands.split(/\n+/);
        if (codes[0] === "") {
            codes.shift();
        }
        if (codes[codes.length - 1] === "") {
            codes.pop();
        }
        const codeLength = codes.length;
        const refList = {};
        const insts = [];
        const lineMap = {};
        for (let i = 0; i < codeLength; ++i) {
            if (!codes[i].includes(":")) {
                lineMap[insts.length] = i + 1;
                insts.push(codes[i].trim());
                continue;
            }
            const refName = codes[i].trim().split(":")[0];
            if (refList[refName] !== undefined) {
                throw new OperationError(`Error at line ${i + 1}: Duplicate label name "${refName}"`);
            }
            if (/^\d/.test(refName)) {
                throw new OperationError(`Error at line ${i + 1}: label name (${refName}) can't start with number`);
            }
            refList[refName] = insts.length * 4;
            if (!codes[i].trim().endsWith(":")) {
                lineMap[insts.length] = i + 1;
                insts.push(codes[i].trim().split(":")[1].trim());
            }
        }
        return [insts, refList, lineMap];
    }

    /**
     * @param {string} inst
     * @param {Array} refList
     * @param {Number} lineNum
     * @param {Number} instAddr
     * @returns {string}
     */
    deref(inst, refList, lineNum, instAddr) {
        const tokens = inst.split(/[ ,()]+/);
        console.log(tokens);
        const mneList = [
            "jal",
            "beq", "bne", "blt", "bge", "bltu", "bgeu",
        ];
        if (!mneList.includes(tokens[0].toLowerCase())) return inst;
        const target = tokens[tokens.length - 1];
        console.log(target);
        if ((target.includes("0x") && !isNaN(parseInt(target, 16))) || !isNaN(parseInt(target, 10))) return inst;
        if (refList[target] === undefined) {
            throw new OperationError(`Error at line ${lineNum}: Undefined label "${target}"`);
        }
        const offset = refList[target] - instAddr;
        tokens.pop();
        return tokens.join(" ") + " " + offset;
    }

    /**
     * @param {Array} refList
     * @returns {Array}
     */
    invRef(refList) {
        const invRefList = {};
        for (const ref in refList) {
            const dest = refList[ref];
            if (invRefList[dest] === undefined) {
                invRefList[dest] = [ref];
            } else {
                invRefList[dest].push(ref);
            }
        }
        return invRefList;
    }

}

export default RISCVEncode;
