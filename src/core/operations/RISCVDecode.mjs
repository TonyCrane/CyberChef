/**
 * @author TonyCrane [tonycrane@foxmail.com]
 * @copyright Crown Copyright 2023
 * @license Apache-2.0
 */

import Operation from "../Operation.mjs";
import OperationError from "../errors/OperationError.mjs";
import { Instruction } from "../lib/RISCV.mjs";
import { toHexFast } from "../lib/Hex.mjs";

/**
 * RISC-V Decode operation
 */
class RISCVDecode extends Operation {

    /**
     * RISCVDecode constructor
     */
    constructor() {
        super();

        this.name = "RISC-V Decode";
        this.module = "RISCV";
        this.description = [
            "Decode RISC-V instructions (Just decode, not disassemble)",
            "<br/><br/>",
            "Improved from <a href='https://gitlab.com/luplab/rvcodecjs/'>gitlab.com/luplab/rvcodecjs<a/>",
            "<br/>",
            "Support RV32I, RV64I, RV128I with Zifencei, Zicsr, MAFDQC extensions",
            "<br/><br/>",
            "<strong>Note: </strong>Input is raw bytes, maybe you need 'From Hex'",
        ].join("\n");
        this.infoURL = "https://riscv.org/technical/specifications/";
        this.inputType = "byteArray";
        this.outputType = "string";
        this.args = [
            {
                name: "ISA",
                type: "option",
                value: ["AUTO", "RV32I", "RV64I", "RV128I"]
            },
            {
                name: "Show regs as ABI",
                type: "boolean",
                value: false
            },
            {
                name: "Show inst address",
                type: "boolean",
                value: false
            },
            {
                name: "Show bytecode",
                type: "boolean",
                value: false
            },
            {
                name: "Show imm as hex",
                type: "boolean",
                value: false
            },
            {
                name: "Ignore illegal inst",
                type: "boolean",
                value: false
            }
        ];
    }

    /**
     * @param {byteArray} insts
     * @param {Object[]} args
     * @returns {string}
     */
    run(insts, args) {
        const [isa, abi, showAddr, showBytecode, showImmAsHex, ignoreIllegal] = args;
        if (insts.length % 4 !== 0) {
            throw new OperationError("Instruction's length is not a multiple of 4.");
        }
        const instNum = insts.length / 4;
        const addrLength = Math.ceil(Math.log(instNum * 4) / Math.log(16));
        const ret = [];
        for (let i = 0; i < instNum; ++i) {
            const instBytes = insts.slice(i * 4, i * 4 + 4);
            const instHex = toHexFast(instBytes);
            let inst;
            try {
                inst = new Instruction(instHex, { ISA: isa, ABI: abi, immAsHex: showImmAsHex });
            } catch (error) {
                if (ignoreIllegal) {
                    inst = Object({asm: "*** illegal instruction ***"});
                } else {
                    throw new OperationError(`Error at 0x${(i * 4).toString(16).padStart(addrLength, "0")}: ${error.message}`);
                }
            }
            if (showAddr && showBytecode) {
                ret.push(`0x${(i * 4).toString(16).padStart(addrLength, "0")} (${instHex}): ${inst.asm}`);
            } else if (showAddr) {
                ret.push(`0x${(i * 4).toString(16).padStart(addrLength, "0")}: ${inst.asm}`);
            } else if (showBytecode) {
                ret.push(`${instHex}: ${inst.asm}`);
            } else {
                ret.push(inst.asm);
            }
        }
        return ret.join("\n");
    }

}

export default RISCVDecode;
