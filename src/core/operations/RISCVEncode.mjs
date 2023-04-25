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
            "<strong>Note: </strong>Can't use pseudo-instructions and labels now",
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
        const insts = commands.split(/\n+/);
        const instBytecode = [];
        const instBytes = [];
        const ret = [];
        if (insts[0] === "") {
            insts.shift();
        }
        if (insts[insts.length - 1] === "") {
            insts.pop();
        }
        const instNum = insts.length;
        const addrLength = Math.ceil(Math.log(instNum * 4) / Math.log(16));
        for (let i = 0; i < instNum; ++i) {
            let inst;
            try {
                inst = new Instruction(insts[i], { ISA: isa });
            } catch (error) {
                if (ignoreIllegal) {
                    inst = Object({hex: "ffffffff"});
                } else {
                    throw new OperationError(`Error at line ${i + 1}: ${error.message}`);
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
                } else if (showAddr) {
                    ret.push(`0x${(i * 4).toString(16).padStart(addrLength, "0")}: ${instStr}`);
                } else if (showInput) {
                    ret.push(`${instStr} [ ${insts[i].trim()} ]`);
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

}

export default RISCVEncode;
