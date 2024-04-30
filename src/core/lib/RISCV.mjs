/**
 * @author LupLab
 * @from https://gitlab.com/luplab/rvcodecjs
 * @license AGPL-3.0
 */

import OperationError from "../errors/OperationError.mjs";

const BASE = {
    bin: 2,
    dec: 10,
    hex: 16
}

// Width of an integer register
const XLEN = {
    rv32:  32,
    rv64:  64,
    rv128: 128,
}

const XLEN_MASK = {
    rv32:  0b001,
    rv64:  0b010,
    rv128: 0b100,
    all:   0b111,
}

// Width of a floating-point register
// const FLEN = {
//   F: 32,
//   D: 64
// }

// Encoding for floating-point register width
const FP_WIDTH = {
    S: '010',
    D: '011',
    Q: '100',
}

// Encoding for value width of floatint-point operations
const FP_FMT = {
    S: '00',  //  32-bit
    D: '01',  //  64-bit
/*H: '10',  //  16-bit */ // Unused in G extension
    Q: '11',  // 128-bit
}

/*
 * Instruction fields
 */

// Definition of fields shared by most instruction types
const FIELDS = {
    // Fields common to multiple instruction types
    opcode: { pos: [6, 7],  name: 'opcode' },
    rd:     { pos: [11, 5], name: 'rd' },
    funct3: { pos: [14, 3], name: 'funct3' },
    rs1:    { pos: [19, 5], name: 'rs1' },
    rs2:    { pos: [24, 5], name: 'rs2' },

    // R-type
    r_funct5: { pos: [31, 5], name: 'funct5' },
    r_funct7: { pos: [31, 7], name: 'funct7' },

    // R-type: AMO acquire/release bits
    r_aq: { pos: [26, 1], name: 'aq' },
    r_rl: { pos: [25, 1], name: 'rl' },

    // R-type: FP specific fields
    r_fp_fmt: { pos: [26, 2], name: 'fmt' },
    r_fp_rm:  { pos: [14, 3], name: 'rm' },

    // I-type
    i_imm_11_0: { pos: [31, 12], name: 'imm[11:0]' },

    // I-type: shift instructions
    i_shtyp_11_7: { pos: [31, 5], name: 'shtyp[11:7]'},
    i_shtyp_11_6: { pos: [31, 6], name: 'shtyp[11:6]'},
    i_shtyp_11_5: { pos: [31, 7], name: 'shtyp[11:5]'},
    i_shtyp:      { pos: [30, 1], name: 'shtyp' },
    i_shamt_6:    { pos: [26, 1], name: 'shamt[6]' },
    i_shamt_6_0:  { pos: [26, 7], name: 'shamt[6:0]' },
    i_shamt_5:    { pos: [25, 1], name: 'shamt[5]' },
    i_shamt_5_0:  { pos: [25, 6], name: 'shamt[5:0]' },
    i_shamt:      { pos: [24, 5], name: 'shamt[4:0]' },

    // I-type: trap instructions
    i_funct12: { pos: [31, 12], name: 'funct12' },

    // I-type: CSR instructions
    i_csr:     { pos: [31, 12], name: 'csr' },
    i_imm_4_0: { pos: [19, 5],  name: 'imm[4:0]' },

    // I-type: fence instructions
    i_fm:   { pos: [31, 4], name: 'fm' },
    i_pred: { pos: [27, 4], name: 'pred' },
    i_succ: { pos: [23, 4], name: 'succ' },

    // S-type
    s_imm_4_0:  { pos: [11, 5], name: 'imm[4:0]' },
    s_imm_11_5: { pos: [31, 7], name: 'imm[11:5]' },

    // B-type
    b_imm_4_1:  { pos: [11, 4], name: 'imm[4:1]' },
    b_imm_11:   { pos: [7, 1],  name: 'imm[11]' },
    b_imm_10_5: { pos: [30, 6], name: 'imm[10:5]' },
    b_imm_12:   { pos: [31, 1], name: 'imm[12]' },

    // U-type
    u_imm_31_12 : { pos: [31, 20], name: 'imm[31:12]' },

    // J-type
    j_imm_20:     { pos: [31, 1],  name: 'imm[20]' },
    j_imm_10_1:   { pos: [30, 10], name: 'imm[10:1]' },
    j_imm_11:     { pos: [20, 1],  name: 'imm[11]' },
    j_imm_19_12:  { pos: [19, 8],  name: 'imm[19:12]' },

    // ISA_C: general
    c_opcode:     { pos: [1, 2],   name: 'opcode' },
    c_funct6:     { pos: [15, 6],  name: 'funct6' },
    c_funct4:     { pos: [15, 4],  name: 'funct4' },
    c_funct3:     { pos: [15, 3],  name: 'funct3' },
    c_funct2:     { pos: [6, 2],   name: 'funct2' },
    c_funct2_cb:  { pos: [11, 2],  name: 'funct2' },

    // ISA_C: registers
    c_rd:             { pos: [11, 5],  name: 'rd' },
    c_rs1:            { pos: [11, 5],  name: 'rs1' },
    c_rd_rs1:         { pos: [11, 5],  name: 'rd/rs1' },
    c_rs2:            { pos: [6, 5],   name: 'rs2' },
    c_rd_prime:       { pos: [4, 3],   name: 'rd\'' },
    c_rs2_prime:      { pos: [4, 3],   name: 'rs2\'' },
    c_rs1_prime:      { pos: [9, 3],   name: 'rs1\'' },
    c_rd_rs1_prime:   { pos: [9, 3],   name: 'rd\'/rs1\'' },

    // ISA_C: immediates
    // - referenced by inst format type and index starting from MSB
    c_imm_ci_0:   { pos: [12, 1],  name: 'imm' },
    c_imm_ci_1:   { pos: [6, 5],   name: 'imm' },
    c_imm_css:    { pos: [12, 6],  name: 'imm' },
    c_imm_ciw:    { pos: [12, 8],  name: 'imm' },
    c_imm_cl_0:   { pos: [12, 3],  name: 'imm' },
    c_imm_cl_1:   { pos: [6, 2],   name: 'imm' },
    c_imm_cs_0:   { pos: [12, 3],  name: 'imm' },
    c_imm_cs_1:   { pos: [6, 2],   name: 'imm' },
    c_imm_cb_0:   { pos: [12, 3],  name: 'imm' },
    c_imm_cb_1:   { pos: [6, 5],   name: 'imm' },
    c_imm_cj:     { pos: [12, 11], name: 'imm' },
    c_shamt_0:    { pos: [12, 1],  name: 'shamt' },
    c_shamt_1:    { pos: [6, 5],   name: 'shamt' },
}


/*
 * Instruction opcodes
 */

// RVG base opcode map (assuming inst[1:0] = '11')
const OPCODE = {
    LOAD:     '0000011',
    LOAD_FP:  '0000111',
    MISC_MEM: '0001111',
    OP_IMM:   '0010011',
    AUIPC:    '0010111',
    OP_IMM_32:'0011011',
    STORE:    '0100011',
    STORE_FP: '0100111',
    AMO:      '0101111',
    OP:       '0110011',
    OP_32:    '0111011',
    LUI:      '0110111',
    MADD:     '1000011',
    MSUB:     '1000111',
    NMSUB:    '1001011',
    NMADD:    '1001111',
    OP_FP:    '1010011',
    OP_IMM_64:'1011011',
    BRANCH:   '1100011',
    JALR:     '1100111',
    JAL:      '1101111',
    SYSTEM:   '1110011',
    OP_64:    '1111011',
}

// RVC base opcode map (assuming inst[1:0] =/= '11')
const C_OPCODE = {
    C0:   '00',
    C1:   '01',
    C2:   '10',
}


/*
 * ISA
 */

// RV32I instruction set
const ISA_RV32I = {
    lui:    { isa: 'RV32I', fmt: 'U-type', opcode: OPCODE.LUI },
    auipc:  { isa: 'RV32I', fmt: 'U-type', opcode: OPCODE.AUIPC },

    jal:    { isa: 'RV32I', fmt: 'J-type', opcode: OPCODE.JAL },

    jalr:   { isa: 'RV32I', fmt: 'I-type', funct3: '000', opcode: OPCODE.JALR },

    beq:    { isa: 'RV32I', fmt: 'B-type', funct3: '000', opcode: OPCODE.BRANCH },
    bne:    { isa: 'RV32I', fmt: 'B-type', funct3: '001', opcode: OPCODE.BRANCH },
    blt:    { isa: 'RV32I', fmt: 'B-type', funct3: '100', opcode: OPCODE.BRANCH },
    bge:    { isa: 'RV32I', fmt: 'B-type', funct3: '101', opcode: OPCODE.BRANCH },
    bltu:   { isa: 'RV32I', fmt: 'B-type', funct3: '110', opcode: OPCODE.BRANCH },
    bgeu:   { isa: 'RV32I', fmt: 'B-type', funct3: '111', opcode: OPCODE.BRANCH },

    lb:     { isa: 'RV32I', fmt: 'I-type', funct3: '000', opcode: OPCODE.LOAD },
    lh:     { isa: 'RV32I', fmt: 'I-type', funct3: '001', opcode: OPCODE.LOAD },
    lw:     { isa: 'RV32I', fmt: 'I-type', funct3: '010', opcode: OPCODE.LOAD },
    lbu:    { isa: 'RV32I', fmt: 'I-type', funct3: '100', opcode: OPCODE.LOAD },
    lhu:    { isa: 'RV32I', fmt: 'I-type', funct3: '101', opcode: OPCODE.LOAD },

    sb:     { isa: 'RV32I', fmt: 'S-type', funct3: '000', opcode: OPCODE.STORE },
    sh:     { isa: 'RV32I', fmt: 'S-type', funct3: '001', opcode: OPCODE.STORE },
    sw:     { isa: 'RV32I', fmt: 'S-type', funct3: '010', opcode: OPCODE.STORE },

    addi:   { isa: 'RV32I', fmt: 'I-type', funct3: '000', opcode: OPCODE.OP_IMM },
    slti:   { isa: 'RV32I', fmt: 'I-type', funct3: '010', opcode: OPCODE.OP_IMM },
    sltiu:  { isa: 'RV32I', fmt: 'I-type', funct3: '011', opcode: OPCODE.OP_IMM },
    xori:   { isa: 'RV32I', fmt: 'I-type', funct3: '100', opcode: OPCODE.OP_IMM },
    ori:    { isa: 'RV32I', fmt: 'I-type', funct3: '110', opcode: OPCODE.OP_IMM },
    andi:   { isa: 'RV32I', fmt: 'I-type', funct3: '111', opcode: OPCODE.OP_IMM },

    slli:   { isa: 'RV32I', fmt: 'I-type', shtyp: '0', funct3: '001', opcode: OPCODE.OP_IMM },
    srli:   { isa: 'RV32I', fmt: 'I-type', shtyp: '0', funct3: '101', opcode: OPCODE.OP_IMM },
    srai:   { isa: 'RV32I', fmt: 'I-type', shtyp: '1', funct3: '101', opcode: OPCODE.OP_IMM },

    add:    { isa: 'RV32I', fmt: 'R-type', funct7: '0000000', funct3: '000', opcode: OPCODE.OP },
    sub:    { isa: 'RV32I', fmt: 'R-type', funct7: '0100000', funct3: '000', opcode: OPCODE.OP },
    sll:    { isa: 'RV32I', fmt: 'R-type', funct7: '0000000', funct3: '001', opcode: OPCODE.OP },
    slt:    { isa: 'RV32I', fmt: 'R-type', funct7: '0000000', funct3: '010', opcode: OPCODE.OP },
    sltu:   { isa: 'RV32I', fmt: 'R-type', funct7: '0000000', funct3: '011', opcode: OPCODE.OP },
    xor:    { isa: 'RV32I', fmt: 'R-type', funct7: '0000000', funct3: '100', opcode: OPCODE.OP },
    srl:    { isa: 'RV32I', fmt: 'R-type', funct7: '0000000', funct3: '101', opcode: OPCODE.OP },
    sra:    { isa: 'RV32I', fmt: 'R-type', funct7: '0100000', funct3: '101', opcode: OPCODE.OP },
    or:     { isa: 'RV32I', fmt: 'R-type', funct7: '0000000', funct3: '110', opcode: OPCODE.OP },
    and:    { isa: 'RV32I', fmt: 'R-type', funct7: '0000000', funct3: '111', opcode: OPCODE.OP },

    fence:  { isa: 'RV32I', fmt: 'I-type', funct3: '000', opcode: OPCODE.MISC_MEM },

    ecall:  { isa: 'RV32I', fmt: 'I-type', funct12: '000000000000', funct3: '000', opcode: OPCODE.SYSTEM },
    ebreak: { isa: 'RV32I', fmt: 'I-type', funct12: '000000000001', funct3: '000', opcode: OPCODE.SYSTEM },
}

// RV64I instruction set
const ISA_RV64I = {
    addiw:  { isa: 'RV64I', fmt: 'I-type', funct3: '000', opcode: OPCODE.OP_IMM_32 },

    slliw:  { isa: 'RV64I', fmt: 'I-type', shtyp: '0', funct3: '001', opcode: OPCODE.OP_IMM_32 },
    srliw:  { isa: 'RV64I', fmt: 'I-type', shtyp: '0', funct3: '101', opcode: OPCODE.OP_IMM_32 },
    sraiw:  { isa: 'RV64I', fmt: 'I-type', shtyp: '1', funct3: '101', opcode: OPCODE.OP_IMM_32 },

    addw:   { isa: 'RV64I', fmt: 'R-type', funct7: '0000000', funct3: '000', opcode: OPCODE.OP_32 },
    subw:   { isa: 'RV64I', fmt: 'R-type', funct7: '0100000', funct3: '000', opcode: OPCODE.OP_32 },
    sllw:   { isa: 'RV64I', fmt: 'R-type', funct7: '0000000', funct3: '001', opcode: OPCODE.OP_32 },
    srlw:   { isa: 'RV64I', fmt: 'R-type', funct7: '0000000', funct3: '101', opcode: OPCODE.OP_32 },
    sraw:   { isa: 'RV64I', fmt: 'R-type', funct7: '0100000', funct3: '101', opcode: OPCODE.OP_32 },

    ld:     { isa: 'RV64I', fmt: 'I-type', funct3: '011', opcode: OPCODE.LOAD },
    lwu:    { isa: 'RV64I', fmt: 'I-type', funct3: '110', opcode: OPCODE.LOAD },

    sd:     { isa: 'RV64I', fmt: 'S-type', funct3: '011', opcode: OPCODE.STORE },
}

// RV6128I instruction set
const ISA_RV128I = {
    addid:  { isa: 'RV128I', fmt: 'I-type', funct3: '000', opcode: OPCODE.OP_IMM_64 },

    sllid:  { isa: 'RV128I', fmt: 'I-type', shtyp: '0', funct3: '001', opcode: OPCODE.OP_IMM_64 },
    srlid:  { isa: 'RV128I', fmt: 'I-type', shtyp: '0', funct3: '101', opcode: OPCODE.OP_IMM_64 },
    sraid:  { isa: 'RV128I', fmt: 'I-type', shtyp: '1', funct3: '101', opcode: OPCODE.OP_IMM_64 },

    addd:   { isa: 'RV128I', fmt: 'R-type', funct7: '0000000', funct3: '000', opcode: OPCODE.OP_64 },
    subd:   { isa: 'RV128I', fmt: 'R-type', funct7: '0100000', funct3: '000', opcode: OPCODE.OP_64 },
    slld:   { isa: 'RV128I', fmt: 'R-type', funct7: '0000000', funct3: '001', opcode: OPCODE.OP_64 },
    srld:   { isa: 'RV128I', fmt: 'R-type', funct7: '0000000', funct3: '101', opcode: OPCODE.OP_64 },
    srad:   { isa: 'RV128I', fmt: 'R-type', funct7: '0100000', funct3: '101', opcode: OPCODE.OP_64 },

    lq:     { isa: 'RV128I', fmt: 'I-type', funct3: '010', opcode: OPCODE.MISC_MEM },
    ldu:    { isa: 'RV128I', fmt: 'I-type', funct3: '111', opcode: OPCODE.LOAD },

    sq:     { isa: 'RV128I', fmt: 'S-type', funct3: '100', opcode: OPCODE.STORE },
}

// Zifencei instruction set
const ISA_Zifencei = {
    'fence.i':  { isa: 'Zifencei', fmt: 'I-type', funct3: '001', opcode: OPCODE.MISC_MEM },
}

// Zicsr instruction set
const ISA_Zicsr = {
    csrrw:  { isa: 'Zicsr', fmt: 'I-type', funct3: '001', opcode: OPCODE.SYSTEM },
    csrrs:  { isa: 'Zicsr', fmt: 'I-type', funct3: '010', opcode: OPCODE.SYSTEM },
    csrrc:  { isa: 'Zicsr', fmt: 'I-type', funct3: '011', opcode: OPCODE.SYSTEM },
    csrrwi: { isa: 'Zicsr', fmt: 'I-type', funct3: '101', opcode: OPCODE.SYSTEM },
    csrrsi: { isa: 'Zicsr', fmt: 'I-type', funct3: '110', opcode: OPCODE.SYSTEM },
    csrrci: { isa: 'Zicsr', fmt: 'I-type', funct3: '111', opcode: OPCODE.SYSTEM },
}

// M instruction set
const ISA_M = {
    mul:    { isa: 'RV32M', fmt: 'R-type', funct7: '0000001', funct3: '000', opcode: OPCODE.OP },
    mulh:   { isa: 'RV32M', fmt: 'R-type', funct7: '0000001', funct3: '001', opcode: OPCODE.OP },
    mulhsu: { isa: 'RV32M', fmt: 'R-type', funct7: '0000001', funct3: '010', opcode: OPCODE.OP },
    mulhu:  { isa: 'RV32M', fmt: 'R-type', funct7: '0000001', funct3: '011', opcode: OPCODE.OP },
    div:    { isa: 'RV32M', fmt: 'R-type', funct7: '0000001', funct3: '100', opcode: OPCODE.OP },
    divu:   { isa: 'RV32M', fmt: 'R-type', funct7: '0000001', funct3: '101', opcode: OPCODE.OP },
    rem:    { isa: 'RV32M', fmt: 'R-type', funct7: '0000001', funct3: '110', opcode: OPCODE.OP },
    remu:   { isa: 'RV32M', fmt: 'R-type', funct7: '0000001', funct3: '111', opcode: OPCODE.OP },

    mulw:   { isa: 'RV64M', fmt: 'R-type', funct7: '0000001', funct3: '000', opcode: OPCODE.OP_32 },
    divw:   { isa: 'RV64M', fmt: 'R-type', funct7: '0000001', funct3: '100', opcode: OPCODE.OP_32 },
    divuw:  { isa: 'RV64M', fmt: 'R-type', funct7: '0000001', funct3: '101', opcode: OPCODE.OP_32 },
    remw:   { isa: 'RV64M', fmt: 'R-type', funct7: '0000001', funct3: '110', opcode: OPCODE.OP_32 },
    remuw:  { isa: 'RV64M', fmt: 'R-type', funct7: '0000001', funct3: '111', opcode: OPCODE.OP_32 },

    muld:   { isa: 'RV128M', fmt: 'R-type', funct7: '0000001', funct3: '000', opcode: OPCODE.OP_64 },
    divd:   { isa: 'RV128M', fmt: 'R-type', funct7: '0000001', funct3: '100', opcode: OPCODE.OP_64 },
    divud:  { isa: 'RV128M', fmt: 'R-type', funct7: '0000001', funct3: '101', opcode: OPCODE.OP_64 },
    remd:   { isa: 'RV128M', fmt: 'R-type', funct7: '0000001', funct3: '110', opcode: OPCODE.OP_64 },
    remud:  { isa: 'RV128M', fmt: 'R-type', funct7: '0000001', funct3: '111', opcode: OPCODE.OP_64 },
}

// A instruction set
const ISA_A = {
    'lr.w':      { isa: 'RV32A', fmt: 'R-type', funct5: '00010', funct3: '010', opcode: OPCODE.AMO },
    'sc.w':      { isa: 'RV32A', fmt: 'R-type', funct5: '00011', funct3: '010', opcode: OPCODE.AMO },
    'amoswap.w': { isa: 'RV32A', fmt: 'R-type', funct5: '00001', funct3: '010', opcode: OPCODE.AMO },
    'amoadd.w':  { isa: 'RV32A', fmt: 'R-type', funct5: '00000', funct3: '010', opcode: OPCODE.AMO },
    'amoxor.w':  { isa: 'RV32A', fmt: 'R-type', funct5: '00100', funct3: '010', opcode: OPCODE.AMO },
    'amoand.w':  { isa: 'RV32A', fmt: 'R-type', funct5: '01100', funct3: '010', opcode: OPCODE.AMO },
    'amoor.w':   { isa: 'RV32A', fmt: 'R-type', funct5: '01000', funct3: '010', opcode: OPCODE.AMO },
    'amomin.w':  { isa: 'RV32A', fmt: 'R-type', funct5: '10000', funct3: '010', opcode: OPCODE.AMO },
    'amomax.w':  { isa: 'RV32A', fmt: 'R-type', funct5: '10100', funct3: '010', opcode: OPCODE.AMO },
    'amominu.w': { isa: 'RV32A', fmt: 'R-type', funct5: '11000', funct3: '010', opcode: OPCODE.AMO },
    'amomaxu.w': { isa: 'RV32A', fmt: 'R-type', funct5: '11100', funct3: '010', opcode: OPCODE.AMO },

    'lr.d':      { isa: 'RV64A', fmt: 'R-type', funct5: '00010', funct3: '011', opcode: OPCODE.AMO },
    'sc.d':      { isa: 'RV64A', fmt: 'R-type', funct5: '00011', funct3: '011', opcode: OPCODE.AMO },
    'amoswap.d': { isa: 'RV64A', fmt: 'R-type', funct5: '00001', funct3: '011', opcode: OPCODE.AMO },
    'amoadd.d':  { isa: 'RV64A', fmt: 'R-type', funct5: '00000', funct3: '011', opcode: OPCODE.AMO },
    'amoxor.d':  { isa: 'RV64A', fmt: 'R-type', funct5: '00100', funct3: '011', opcode: OPCODE.AMO },
    'amoand.d':  { isa: 'RV64A', fmt: 'R-type', funct5: '01100', funct3: '011', opcode: OPCODE.AMO },
    'amoor.d':   { isa: 'RV64A', fmt: 'R-type', funct5: '01000', funct3: '011', opcode: OPCODE.AMO },
    'amomin.d':  { isa: 'RV64A', fmt: 'R-type', funct5: '10000', funct3: '011', opcode: OPCODE.AMO },
    'amomax.d':  { isa: 'RV64A', fmt: 'R-type', funct5: '10100', funct3: '011', opcode: OPCODE.AMO },
    'amominu.d': { isa: 'RV64A', fmt: 'R-type', funct5: '11000', funct3: '011', opcode: OPCODE.AMO },
    'amomaxu.d': { isa: 'RV64A', fmt: 'R-type', funct5: '11100', funct3: '011', opcode: OPCODE.AMO },

    'lr.q':      { isa: 'RV128A', fmt: 'R-type', funct5: '00010', funct3: '100', opcode: OPCODE.AMO },
    'sc.q':      { isa: 'RV128A', fmt: 'R-type', funct5: '00011', funct3: '100', opcode: OPCODE.AMO },
    'amoswap.q': { isa: 'RV128A', fmt: 'R-type', funct5: '00001', funct3: '100', opcode: OPCODE.AMO },
    'amoadd.q':  { isa: 'RV128A', fmt: 'R-type', funct5: '00000', funct3: '100', opcode: OPCODE.AMO },
    'amoxor.q':  { isa: 'RV128A', fmt: 'R-type', funct5: '00100', funct3: '100', opcode: OPCODE.AMO },
    'amoand.q':  { isa: 'RV128A', fmt: 'R-type', funct5: '01100', funct3: '100', opcode: OPCODE.AMO },
    'amoor.q':   { isa: 'RV128A', fmt: 'R-type', funct5: '01000', funct3: '100', opcode: OPCODE.AMO },
    'amomin.q':  { isa: 'RV128A', fmt: 'R-type', funct5: '10000', funct3: '100', opcode: OPCODE.AMO },
    'amomax.q':  { isa: 'RV128A', fmt: 'R-type', funct5: '10100', funct3: '100', opcode: OPCODE.AMO },
    'amominu.q': { isa: 'RV128A', fmt: 'R-type', funct5: '11000', funct3: '100', opcode: OPCODE.AMO },
    'amomaxu.q': { isa: 'RV128A', fmt: 'R-type', funct5: '11100', funct3: '100', opcode: OPCODE.AMO },
}

// F instruction set
const ISA_F = {
    'flw':       { isa: 'RV32F', fmt: 'I-type', funct3: FP_WIDTH.S, opcode: OPCODE.LOAD_FP },
    'fsw':       { isa: 'RV32F', fmt: 'S-type', funct3: FP_WIDTH.S, opcode: OPCODE.STORE_FP },

    'fmadd.s':   { isa: 'RV32F', fmt: 'R4-type', fp_fmt: FP_FMT.S, opcode: OPCODE.MADD },
    'fmsub.s':   { isa: 'RV32F', fmt: 'R4-type', fp_fmt: FP_FMT.S, opcode: OPCODE.MSUB },
    'fnmadd.s':  { isa: 'RV32F', fmt: 'R4-type', fp_fmt: FP_FMT.S, opcode: OPCODE.NMADD },
    'fnmsub.s':  { isa: 'RV32F', fmt: 'R4-type', fp_fmt: FP_FMT.S, opcode: OPCODE.NMSUB },

    'fadd.s':    { isa: 'RV32F', fmt: 'R-type', funct5: '00000', fp_fmt: FP_FMT.S, opcode: OPCODE.OP_FP },
    'fsub.s':    { isa: 'RV32F', fmt: 'R-type', funct5: '00001', fp_fmt: FP_FMT.S, opcode: OPCODE.OP_FP },
    'fmul.s':    { isa: 'RV32F', fmt: 'R-type', funct5: '00010', fp_fmt: FP_FMT.S, opcode: OPCODE.OP_FP },
    'fdiv.s':    { isa: 'RV32F', fmt: 'R-type', funct5: '00011', fp_fmt: FP_FMT.S, opcode: OPCODE.OP_FP },

    'fsqrt.s':   { isa: 'RV32F', fmt: 'R-type', funct5: '01011', fp_fmt: FP_FMT.S, rs2: '00000', opcode: OPCODE.OP_FP },

    'fsgnj.s':   { isa: 'RV32F', fmt: 'R-type', funct5: '00100', fp_fmt: FP_FMT.S, funct3: '000', opcode: OPCODE.OP_FP },
    'fsgnjn.s':  { isa: 'RV32F', fmt: 'R-type', funct5: '00100', fp_fmt: FP_FMT.S, funct3: '001', opcode: OPCODE.OP_FP },
    'fsgnjx.s':  { isa: 'RV32F', fmt: 'R-type', funct5: '00100', fp_fmt: FP_FMT.S, funct3: '010', opcode: OPCODE.OP_FP },
    'fmin.s':    { isa: 'RV32F', fmt: 'R-type', funct5: '00101', fp_fmt: FP_FMT.S, funct3: '000', opcode: OPCODE.OP_FP },
    'fmax.s':    { isa: 'RV32F', fmt: 'R-type', funct5: '00101', fp_fmt: FP_FMT.S, funct3: '001', opcode: OPCODE.OP_FP },

    'feq.s':     { isa: 'RV32F', fmt: 'R-type', funct5: '10100', fp_fmt: FP_FMT.S, funct3: '010', opcode: OPCODE.OP_FP },
    'flt.s':     { isa: 'RV32F', fmt: 'R-type', funct5: '10100', fp_fmt: FP_FMT.S, funct3: '001', opcode: OPCODE.OP_FP },
    'fle.s':     { isa: 'RV32F', fmt: 'R-type', funct5: '10100', fp_fmt: FP_FMT.S, funct3: '000', opcode: OPCODE.OP_FP },

    'fcvt.w.s':  { isa: 'RV32F', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.S, rs2: '00000', opcode: OPCODE.OP_FP },
    'fcvt.wu.s': { isa: 'RV32F', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.S, rs2: '00001', opcode: OPCODE.OP_FP },
    'fcvt.s.w':  { isa: 'RV32F', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.S, rs2: '00000', opcode: OPCODE.OP_FP },
    'fcvt.s.wu': { isa: 'RV32F', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.S, rs2: '00001', opcode: OPCODE.OP_FP },

    'fclass.s':  { isa: 'RV32F', fmt: 'R-type', funct5: '11100', fp_fmt: FP_FMT.S, rs2: '00000', funct3: '001', opcode: OPCODE.OP_FP },

    'fmv.x.w':   { isa: 'RV32F', fmt: 'R-type', funct5: '11100', fp_fmt: FP_FMT.S, rs2: '00000', funct3: '000', opcode: OPCODE.OP_FP },
    'fmv.w.x':   { isa: 'RV32F', fmt: 'R-type', funct5: '11110', fp_fmt: FP_FMT.S, rs2: '00000', funct3: '000', opcode: OPCODE.OP_FP },

    'fcvt.l.s':  { isa: 'RV64F', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.S, rs2: '00010', opcode: OPCODE.OP_FP },
    'fcvt.lu.s': { isa: 'RV64F', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.S, rs2: '00011', opcode: OPCODE.OP_FP },
    'fcvt.s.l':  { isa: 'RV64F', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.S, rs2: '00010', opcode: OPCODE.OP_FP },
    'fcvt.s.lu': { isa: 'RV64F', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.S, rs2: '00011', opcode: OPCODE.OP_FP },

    'fcvt.t.s':  { isa: 'RV128F', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.S, rs2: '00100', opcode: OPCODE.OP_FP },
    'fcvt.tu.s': { isa: 'RV128F', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.S, rs2: '00101', opcode: OPCODE.OP_FP },
    'fcvt.s.t':  { isa: 'RV128F', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.S, rs2: '00100', opcode: OPCODE.OP_FP },
    'fcvt.s.tu': { isa: 'RV128F', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.S, rs2: '00101', opcode: OPCODE.OP_FP },
}

// D instruction set
const ISA_D = {
    'fld':       { isa: 'RV32D', fmt: 'I-type', funct3: FP_WIDTH.D, opcode: OPCODE.LOAD_FP },
    'fsd':       { isa: 'RV32D', fmt: 'S-type', funct3: FP_WIDTH.D, opcode: OPCODE.STORE_FP },

    'fmadd.d':   { isa: 'RV32D', fmt: 'R4-type', fp_fmt: FP_FMT.D, opcode: OPCODE.MADD },
    'fmsub.d':   { isa: 'RV32D', fmt: 'R4-type', fp_fmt: FP_FMT.D, opcode: OPCODE.MSUB },
    'fnmadd.d':  { isa: 'RV32D', fmt: 'R4-type', fp_fmt: FP_FMT.D, opcode: OPCODE.NMADD },
    'fnmsub.d':  { isa: 'RV32D', fmt: 'R4-type', fp_fmt: FP_FMT.D, opcode: OPCODE.NMSUB },

    'fadd.d':    { isa: 'RV32D', fmt: 'R-type', funct5: '00000', fp_fmt: FP_FMT.D, opcode: OPCODE.OP_FP },
    'fsub.d':    { isa: 'RV32D', fmt: 'R-type', funct5: '00001', fp_fmt: FP_FMT.D, opcode: OPCODE.OP_FP },
    'fmul.d':    { isa: 'RV32D', fmt: 'R-type', funct5: '00010', fp_fmt: FP_FMT.D, opcode: OPCODE.OP_FP },
    'fdiv.d':    { isa: 'RV32D', fmt: 'R-type', funct5: '00011', fp_fmt: FP_FMT.D, opcode: OPCODE.OP_FP },

    'fsqrt.d':   { isa: 'RV32D', fmt: 'R-type', funct5: '01011', fp_fmt: FP_FMT.D, rs2: '00000', opcode: OPCODE.OP_FP },

    'fsgnj.d':   { isa: 'RV32D', fmt: 'R-type', funct5: '00100', fp_fmt: FP_FMT.D, funct3: '000', opcode: OPCODE.OP_FP },
    'fsgnjn.d':  { isa: 'RV32D', fmt: 'R-type', funct5: '00100', fp_fmt: FP_FMT.D, funct3: '001', opcode: OPCODE.OP_FP },
    'fsgnjx.d':  { isa: 'RV32D', fmt: 'R-type', funct5: '00100', fp_fmt: FP_FMT.D, funct3: '010', opcode: OPCODE.OP_FP },
    'fmin.d':    { isa: 'RV32D', fmt: 'R-type', funct5: '00101', fp_fmt: FP_FMT.D, funct3: '000', opcode: OPCODE.OP_FP },
    'fmax.d':    { isa: 'RV32D', fmt: 'R-type', funct5: '00101', fp_fmt: FP_FMT.D, funct3: '001', opcode: OPCODE.OP_FP },

    'feq.d':     { isa: 'RV32D', fmt: 'R-type', funct5: '10100', fp_fmt: FP_FMT.D, funct3: '010', opcode: OPCODE.OP_FP },
    'flt.d':     { isa: 'RV32D', fmt: 'R-type', funct5: '10100', fp_fmt: FP_FMT.D, funct3: '001', opcode: OPCODE.OP_FP },
    'fle.d':     { isa: 'RV32D', fmt: 'R-type', funct5: '10100', fp_fmt: FP_FMT.D, funct3: '000', opcode: OPCODE.OP_FP },

    'fcvt.w.d':  { isa: 'RV32D', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.D, rs2: '00000', opcode: OPCODE.OP_FP },
    'fcvt.wu.d': { isa: 'RV32D', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.D, rs2: '00001', opcode: OPCODE.OP_FP },
    'fcvt.d.w':  { isa: 'RV32D', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.D, rs2: '00000', opcode: OPCODE.OP_FP },
    'fcvt.d.wu': { isa: 'RV32D', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.D, rs2: '00001', opcode: OPCODE.OP_FP },

    'fcvt.s.d':  { isa: 'RV32D', fmt: 'R-type', funct5: '01000', fp_fmt: FP_FMT.S, rs2: '000'+FP_FMT.D, opcode: OPCODE.OP_FP },
    'fcvt.d.s':  { isa: 'RV32D', fmt: 'R-type', funct5: '01000', fp_fmt: FP_FMT.D, rs2: '000'+FP_FMT.S, opcode: OPCODE.OP_FP },

    'fclass.d':  { isa: 'RV32D', fmt: 'R-type', funct5: '11100', fp_fmt: FP_FMT.D, rs2: '00000', funct3: '001', opcode: OPCODE.OP_FP },

    'fmv.x.d':   { isa: 'RV64D', fmt: 'R-type', funct5: '11100', fp_fmt: FP_FMT.D, rs2: '00000', funct3: '000', opcode: OPCODE.OP_FP },
    'fmv.d.x':   { isa: 'RV64D', fmt: 'R-type', funct5: '11110', fp_fmt: FP_FMT.D, rs2: '00000', funct3: '000', opcode: OPCODE.OP_FP },

    'fcvt.l.d':  { isa: 'RV64D', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.D, rs2: '00010', opcode: OPCODE.OP_FP },
    'fcvt.lu.d': { isa: 'RV64D', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.D, rs2: '00011', opcode: OPCODE.OP_FP },
    'fcvt.d.l':  { isa: 'RV64D', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.D, rs2: '00010', opcode: OPCODE.OP_FP },
    'fcvt.d.lu': { isa: 'RV64D', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.D, rs2: '00011', opcode: OPCODE.OP_FP },

    'fcvt.t.d':  { isa: 'RV128D', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.D, rs2: '00100', opcode: OPCODE.OP_FP },
    'fcvt.tu.d': { isa: 'RV128D', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.D, rs2: '00101', opcode: OPCODE.OP_FP },
    'fcvt.d.t':  { isa: 'RV128D', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.D, rs2: '00100', opcode: OPCODE.OP_FP },
    'fcvt.d.tu': { isa: 'RV128D', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.D, rs2: '00101', opcode: OPCODE.OP_FP },
}

// Q instruction set
const ISA_Q = {
    'flq':       { isa: 'RV32Q', fmt: 'I-type', funct3: FP_WIDTH.Q, opcode: OPCODE.LOAD_FP },
    'fsq':       { isa: 'RV32Q', fmt: 'S-type', funct3: FP_WIDTH.Q, opcode: OPCODE.STORE_FP },

    'fmadd.q':   { isa: 'RV32Q', fmt: 'R4-type', fp_fmt: FP_FMT.Q, opcode: OPCODE.MADD },
    'fmsub.q':   { isa: 'RV32Q', fmt: 'R4-type', fp_fmt: FP_FMT.Q, opcode: OPCODE.MSUB },
    'fnmadd.q':  { isa: 'RV32Q', fmt: 'R4-type', fp_fmt: FP_FMT.Q, opcode: OPCODE.NMADD },
    'fnmsub.q':  { isa: 'RV32Q', fmt: 'R4-type', fp_fmt: FP_FMT.Q, opcode: OPCODE.NMSUB },

    'fadd.q':    { isa: 'RV32Q', fmt: 'R-type', funct5: '00000', fp_fmt: FP_FMT.Q, opcode: OPCODE.OP_FP },
    'fsub.q':    { isa: 'RV32Q', fmt: 'R-type', funct5: '00001', fp_fmt: FP_FMT.Q, opcode: OPCODE.OP_FP },
    'fmul.q':    { isa: 'RV32Q', fmt: 'R-type', funct5: '00010', fp_fmt: FP_FMT.Q, opcode: OPCODE.OP_FP },
    'fdiv.q':    { isa: 'RV32Q', fmt: 'R-type', funct5: '00011', fp_fmt: FP_FMT.Q, opcode: OPCODE.OP_FP },

    'fsqrt.q':   { isa: 'RV32Q', fmt: 'R-type', funct5: '01011', fp_fmt: FP_FMT.Q, rs2: '00000', opcode: OPCODE.OP_FP },

    'fsgnj.q':   { isa: 'RV32Q', fmt: 'R-type', funct5: '00100', fp_fmt: FP_FMT.Q, funct3: '000', opcode: OPCODE.OP_FP },
    'fsgnjn.q':  { isa: 'RV32Q', fmt: 'R-type', funct5: '00100', fp_fmt: FP_FMT.Q, funct3: '001', opcode: OPCODE.OP_FP },
    'fsgnjx.q':  { isa: 'RV32Q', fmt: 'R-type', funct5: '00100', fp_fmt: FP_FMT.Q, funct3: '010', opcode: OPCODE.OP_FP },
    'fmin.q':    { isa: 'RV32Q', fmt: 'R-type', funct5: '00101', fp_fmt: FP_FMT.Q, funct3: '000', opcode: OPCODE.OP_FP },
    'fmax.q':    { isa: 'RV32Q', fmt: 'R-type', funct5: '00101', fp_fmt: FP_FMT.Q, funct3: '001', opcode: OPCODE.OP_FP },

    'feq.q':     { isa: 'RV32Q', fmt: 'R-type', funct5: '10100', fp_fmt: FP_FMT.Q, funct3: '010', opcode: OPCODE.OP_FP },
    'flt.q':     { isa: 'RV32Q', fmt: 'R-type', funct5: '10100', fp_fmt: FP_FMT.Q, funct3: '001', opcode: OPCODE.OP_FP },
    'fle.q':     { isa: 'RV32Q', fmt: 'R-type', funct5: '10100', fp_fmt: FP_FMT.Q, funct3: '000', opcode: OPCODE.OP_FP },

    'fcvt.w.q':  { isa: 'RV32Q', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.Q, rs2: '00000', opcode: OPCODE.OP_FP },
    'fcvt.wu.q': { isa: 'RV32Q', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.Q, rs2: '00001', opcode: OPCODE.OP_FP },
    'fcvt.q.w':  { isa: 'RV32Q', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.Q, rs2: '00000', opcode: OPCODE.OP_FP },
    'fcvt.q.wu': { isa: 'RV32Q', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.Q, rs2: '00001', opcode: OPCODE.OP_FP },

    'fcvt.s.q':  { isa: 'RV32Q', fmt: 'R-type', funct5: '01000', fp_fmt: FP_FMT.S, rs2: '000'+FP_FMT.Q, opcode: OPCODE.OP_FP },
    'fcvt.q.s':  { isa: 'RV32Q', fmt: 'R-type', funct5: '01000', fp_fmt: FP_FMT.Q, rs2: '000'+FP_FMT.S, opcode: OPCODE.OP_FP },
    'fcvt.d.q':  { isa: 'RV32Q', fmt: 'R-type', funct5: '01000', fp_fmt: FP_FMT.D, rs2: '000'+FP_FMT.Q, opcode: OPCODE.OP_FP },
    'fcvt.q.d':  { isa: 'RV32Q', fmt: 'R-type', funct5: '01000', fp_fmt: FP_FMT.Q, rs2: '000'+FP_FMT.D, opcode: OPCODE.OP_FP },

    'fclass.q':  { isa: 'RV32Q', fmt: 'R-type', funct5: '11100', fp_fmt: FP_FMT.Q, rs2: '00000', funct3: '001', opcode: OPCODE.OP_FP },

    'fcvt.l.q':  { isa: 'RV64Q', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.Q, rs2: '00010', opcode: OPCODE.OP_FP },
    'fcvt.lu.q': { isa: 'RV64Q', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.Q, rs2: '00011', opcode: OPCODE.OP_FP },
    'fcvt.q.l':  { isa: 'RV64Q', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.Q, rs2: '00010', opcode: OPCODE.OP_FP },
    'fcvt.q.lu': { isa: 'RV64Q', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.Q, rs2: '00011', opcode: OPCODE.OP_FP },

    'fmv.x.q':   { isa: 'RV128Q', fmt: 'R-type', funct5: '11100', fp_fmt: FP_FMT.Q, rs2: '00000', funct3: '000', opcode: OPCODE.OP_FP },
    'fmv.q.x':   { isa: 'RV128Q', fmt: 'R-type', funct5: '11110', fp_fmt: FP_FMT.Q, rs2: '00000', funct3: '000', opcode: OPCODE.OP_FP },

    'fcvt.t.q':  { isa: 'RV128Q', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.Q, rs2: '00100', opcode: OPCODE.OP_FP },
    'fcvt.tu.q': { isa: 'RV128Q', fmt: 'R-type', funct5: '11000', fp_fmt: FP_FMT.Q, rs2: '00101', opcode: OPCODE.OP_FP },
    'fcvt.q.t':  { isa: 'RV128Q', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.Q, rs2: '00100', opcode: OPCODE.OP_FP },
    'fcvt.q.tu': { isa: 'RV128Q', fmt: 'R-type', funct5: '11010', fp_fmt: FP_FMT.Q, rs2: '00101', opcode: OPCODE.OP_FP },
}

// C instruction set
const ISA_C = {
// Load and Store Instructions
    // Stack-Pointer Based Loads and Stores
    'c.lwsp':   { isa: 'C',  xlens: 0b111, fmt: 'CI-type', funct3: '010', rdRs1Mask: 0b10, rdRs1Excl: [0], uimm: true, immBits: [[5], [[4,2],[7,6]]], opcode: C_OPCODE.C2 },
    'c.ldsp':   { isa: 'C',  xlens: 0b110, fmt: 'CI-type', funct3: '011', rdRs1Mask: 0b10, rdRs1Excl: [0], uimm: true, immBits: [[5], [[4,3],[8,6]]], opcode: C_OPCODE.C2 },
    'c.lqsp':   { isa: 'C',  xlens: 0b100, fmt: 'CI-type', funct3: '001', rdRs1Mask: 0b10, rdRs1Excl: [0], uimm: true, immBits: [[5], [4,[9,6]]],     opcode: C_OPCODE.C2 },
    'c.flwsp':  { isa: 'FC', xlens: 0b001, fmt: 'CI-type', funct3: '011', rdRs1Mask: 0b10,                 uimm: true, immBits: [[5], [[4,2],[7,6]]], opcode: C_OPCODE.C2 },
    'c.fldsp':  { isa: 'DC', xlens: 0b011, fmt: 'CI-type', funct3: '001', rdRs1Mask: 0b10,                 uimm: true, immBits: [[5], [[4,3],[8,6]]], opcode: C_OPCODE.C2 },

    'c.swsp':   { isa: 'C',  xlens: 0b111, fmt: 'CSS-type', funct3: '110', uimm: true, immBits: [[5,2],[7,6]], opcode: C_OPCODE.C2 },
    'c.sdsp':   { isa: 'C',  xlens: 0b110, fmt: 'CSS-type', funct3: '111', uimm: true, immBits: [[5,3],[8,6]], opcode: C_OPCODE.C2 },
    'c.sqsp':   { isa: 'C',  xlens: 0b100, fmt: 'CSS-type', funct3: '101', uimm: true, immBits: [[5,4],[9,6]], opcode: C_OPCODE.C2 },
    'c.fswsp':  { isa: 'FC', xlens: 0b001, fmt: 'CSS-type', funct3: '111', uimm: true, immBits: [[5,2],[7,6]], opcode: C_OPCODE.C2 },
    'c.fsdsp':  { isa: 'DC', xlens: 0b011, fmt: 'CSS-type', funct3: '101', uimm: true, immBits: [[5,3],[8,6]], opcode: C_OPCODE.C2 },

    // Register Based Loads and Stores
    'c.lw':     { isa: 'C',  xlens: 0b111, fmt: 'CL-type', funct3: '010', uimm: true, immBits: [[[5,3]],   [2,6]],   opcode: C_OPCODE.C0 },
    'c.ld':     { isa: 'C',  xlens: 0b110, fmt: 'CL-type', funct3: '011', uimm: true, immBits: [[[5,3]],   [[7,6]]], opcode: C_OPCODE.C0 },
    'c.lq':     { isa: 'C',  xlens: 0b100, fmt: 'CL-type', funct3: '001', uimm: true, immBits: [[[5,4],8], [[7,6]]], opcode: C_OPCODE.C0 },
    'c.flw':    { isa: 'FC', xlens: 0b001, fmt: 'CL-type', funct3: '011', uimm: true, immBits: [[[5,3]],   [2,6]],   opcode: C_OPCODE.C0 },
    'c.fld':    { isa: 'DC', xlens: 0b011, fmt: 'CL-type', funct3: '001', uimm: true, immBits: [[[5,3]],   [[7,6]]], opcode: C_OPCODE.C0 },

    'c.sw':     { isa: 'C',  xlens: 0b111, fmt: 'CS-type', funct3: '110', uimm: true, immBits: [[[5,3]],   [2,6]],   opcode: C_OPCODE.C0 },
    'c.sd':     { isa: 'C',  xlens: 0b110, fmt: 'CS-type', funct3: '111', uimm: true, immBits: [[[5,3]],   [[7,6]]], opcode: C_OPCODE.C0 },
    'c.sq':     { isa: 'C',  xlens: 0b100, fmt: 'CS-type', funct3: '101', uimm: true, immBits: [[[5,4],8], [[7,6]]], opcode: C_OPCODE.C0 },
    'c.fsw':    { isa: 'FC', xlens: 0b001, fmt: 'CS-type', funct3: '111', uimm: true, immBits: [[[5,3]],   [2,6]],   opcode: C_OPCODE.C0 },
    'c.fsd':    { isa: 'DC', xlens: 0b011, fmt: 'CS-type', funct3: '101', uimm: true, immBits: [[[5,3]],   [[7,6]]], opcode: C_OPCODE.C0 },

// Control Transfer Instructions
    'c.j':      { isa: 'C', xlens: 0b101, fmt: 'CJ-type', funct3: '101', immBits: [11,4,[9,8],10,6,7,[3,1],5], opcode: C_OPCODE.C1 },
    'c.jal':    { isa: 'C', xlens: 0b001, fmt: 'CJ-type', funct3: '001', immBits: [11,4,[9,8],10,6,7,[3,1],5], opcode: C_OPCODE.C1 },

    'c.jr':     { isa: 'C', xlens: 0b111, fmt: 'CR-type', funct4: '1000', rdRs1Mask: 0b01, rdRs1Excl: [0], rs2Val: 0, opcode: C_OPCODE.C2 },
    'c.jalr':   { isa: 'C', xlens: 0b111, fmt: 'CR-type', funct4: '1001', rdRs1Mask: 0b01, rdRs1Excl: [0], rs2Val: 0, opcode: C_OPCODE.C2 },

    'c.beqz':   { isa: 'C', xlens: 0b111, fmt: 'CB-type', funct3: '110', immBits: [[8,[4,3]], [[7,6],[2,1],5]], opcode: C_OPCODE.C1 },
    'c.bnez':   { isa: 'C', xlens: 0b111, fmt: 'CB-type', funct3: '111', immBits: [[8,[4,3]], [[7,6],[2,1],5]], opcode: C_OPCODE.C1 },

// Integer Computational Instructions
    // Integer Constant-Generator Instructions
    'c.li':       { isa: 'C', xlens: 0b111, fmt: 'CI-type', funct3: '010', rdRs1Mask: 0b10, rdRs1Excl: [0],                immBits: [[5], [[4,0]]],                                   opcode: C_OPCODE.C1 },
    'c.lui':      { isa: 'C', xlens: 0b111, fmt: 'CI-type', funct3: '011', rdRs1Mask: 0b10, rdRs1Excl: [0,2], nzimm: true, immBits: [[5], [[4,0]]], immBitsLabels: [[17], [[16,12]]], opcode: C_OPCODE.C1 },

    // Integer Register-Immediate Operations
    'c.addi':     { isa: 'C', xlens: 0b111, fmt: 'CI-type', funct3: '000', rdRs1Mask: 0b11, rdRs1Excl: [0], nzimm: true,             immBits: [[5], [[4,0]]],       opcode: C_OPCODE.C1 },
    'c.addiw':    { isa: 'C', xlens: 0b110, fmt: 'CI-type', funct3: '001', rdRs1Mask: 0b11, rdRs1Excl: [0],                          immBits: [[5], [[4,0]]],       opcode: C_OPCODE.C1 },
    'c.addi16sp': { isa: 'C', xlens: 0b111, fmt: 'CI-type', funct3: '011', rdRs1Mask: 0b00, rdRs1Val: 2,    nzimm: true,             immBits: [[9], [4,6,[8,7],5]], opcode: C_OPCODE.C1 },
    'c.slli':     { isa: 'C', xlens: 0b111, fmt: 'CI-type', funct3: '000', rdRs1Mask: 0b11, rdRs1Excl: [0], nzimm: true, uimm: true, immBits: [[5], [[4,0]]],       opcode: C_OPCODE.C2 },
    'c.slli64':   { isa: 'C', xlens: 0b100, fmt: 'CI-type', funct3: '000', rdRs1Mask: 0b11, rdRs1Excl: [0], immVal: 0,               immBits: [[5], [[4,0]]],       opcode: C_OPCODE.C2 },

    'c.addi4spn': { isa: 'C', xlens: 0b111, fmt: 'CIW-type', funct3: '000', uimm: true, nzimm: true, immBits: [[5,4],[9,6],2,3], opcode: C_OPCODE.C0 },

    'c.srli':     { isa: 'C', xlens: 0b111, fmt: 'CB-type', funct3: '100', funct2: '00', nzimm: true, uimm: true, immBits: [[5], [[4,0]]], opcode: C_OPCODE.C1 },
    'c.srli64':   { isa: 'C', xlens: 0b100, fmt: 'CB-type', funct3: '100', funct2: '00', immVal: 0,               immBits: [[5], [[4,0]]], opcode: C_OPCODE.C1 },
    'c.srai':     { isa: 'C', xlens: 0b111, fmt: 'CB-type', funct3: '100', funct2: '01', nzimm: true, uimm: true, immBits: [[5], [[4,0]]], opcode: C_OPCODE.C1 },
    'c.srai64':   { isa: 'C', xlens: 0b100, fmt: 'CB-type', funct3: '100', funct2: '01', immVal: 0,               immBits: [[5], [[4,0]]], opcode: C_OPCODE.C1 },
    'c.andi':     { isa: 'C', xlens: 0b111, fmt: 'CB-type', funct3: '100', funct2: '10',                          immBits: [[5], [[4,0]]], opcode: C_OPCODE.C1 },

    // Integer Register-Register Operations
    'c.mv':     { isa: 'C', xlens: 0b111, fmt: 'CR-type', funct4: '1000', rdRs1Mask: 0b10, rdRs1Excl: [0], rs2Excl: [0], opcode: C_OPCODE.C2 },
    'c.add':    { isa: 'C', xlens: 0b111, fmt: 'CR-type', funct4: '1001', rdRs1Mask: 0b11, rdRs1Excl: [0], rs2Excl: [0], opcode: C_OPCODE.C2 },

    'c.and':    { isa: 'C', xlens: 0b111, fmt: 'CA-type', funct6: '100011', funct2: '11', opcode: C_OPCODE.C1 },
    'c.or':     { isa: 'C', xlens: 0b111, fmt: 'CA-type', funct6: '100011', funct2: '10', opcode: C_OPCODE.C1 },
    'c.xor':    { isa: 'C', xlens: 0b111, fmt: 'CA-type', funct6: '100011', funct2: '01', opcode: C_OPCODE.C1 },
    'c.sub':    { isa: 'C', xlens: 0b111, fmt: 'CA-type', funct6: '100011', funct2: '00', opcode: C_OPCODE.C1 },
    'c.subw':   { isa: 'C', xlens: 0b110, fmt: 'CA-type', funct6: '100111', funct2: '00', opcode: C_OPCODE.C1 },
    'c.addw':   { isa: 'C', xlens: 0b110, fmt: 'CA-type', funct6: '100111', funct2: '01', opcode: C_OPCODE.C1 },

// Other Instructions
    'c.nop':    { isa: 'C', xlens: 0b111, fmt: 'CI-type', funct3: '000', rdRs1Mask: 0b00, rdRs1Val: 0, immVal: 0, immBits: [[5], [[4,0]]], opcode: C_OPCODE.C1 },

    'c.ebreak': { isa: 'C', xlens: 0b111, fmt: 'CR-type', funct4: '1001', rdRs1Mask: 0b00, rdRs1Val: 0, rs2Val: 0, opcode: C_OPCODE.C2 },
}

// Privileged instruction set
export const ISA_Priv = {
    // Trap-Return Instructions
    sret: { isa: 'Priv', fmt: 'I-type', funct12: '000100000010', funct3: '000', opcode: OPCODE.SYSTEM },
    mret: { isa: 'Priv', fmt: 'I-type', funct12: '001100000010', funct3: '000', opcode: OPCODE.SYSTEM },
  
    // Interrupt-Management Instructions
    wfi: { isa: 'Priv', fmt: 'I-type', funct12: '000100000101', funct3: '000', opcode: OPCODE.SYSTEM },
}
  

// ISA per opcode
const ISA_OP = {
    // RV32I
    [ISA_RV32I['add'].funct7  + ISA_RV32I['add'].funct3]:   'add',
    [ISA_RV32I['sub'].funct7  + ISA_RV32I['sub'].funct3]:   'sub',
    [ISA_RV32I['sll'].funct7  + ISA_RV32I['sll'].funct3]:   'sll',
    [ISA_RV32I['slt'].funct7  + ISA_RV32I['slt'].funct3]:   'slt',
    [ISA_RV32I['sltu'].funct7 + ISA_RV32I['sltu'].funct3]:  'sltu',
    [ISA_RV32I['xor'].funct7  + ISA_RV32I['xor'].funct3]:   'xor',
    [ISA_RV32I['srl'].funct7  + ISA_RV32I['srl'].funct3]:   'srl',
    [ISA_RV32I['sra'].funct7  + ISA_RV32I['sra'].funct3]:   'sra',
    [ISA_RV32I['or'].funct7   + ISA_RV32I['or'].funct3]:    'or',
    [ISA_RV32I['and'].funct7  + ISA_RV32I['and'].funct3]:   'and',
    // RV32M
    [ISA_M['mul'].funct7    + ISA_M['mul'].funct3]:     'mul',
    [ISA_M['mulh'].funct7   + ISA_M['mulh'].funct3]:    'mulh',
    [ISA_M['mulhsu'].funct7 + ISA_M['mulhsu'].funct3]:  'mulhsu',
    [ISA_M['mulhu'].funct7  + ISA_M['mulhu'].funct3]:   'mulhu',
    [ISA_M['div'].funct7    + ISA_M['div'].funct3]:     'div',
    [ISA_M['divu'].funct7   + ISA_M['divu'].funct3]:    'divu',
    [ISA_M['rem'].funct7    + ISA_M['rem'].funct3]:     'rem',
    [ISA_M['remu'].funct7   + ISA_M['remu'].funct3]:    'remu',
}

const ISA_OP_32 = {
    // RV64I
    [ISA_RV64I['addw'].funct7 + ISA_RV64I['addw'].funct3]: 'addw',
    [ISA_RV64I['subw'].funct7 + ISA_RV64I['subw'].funct3]: 'subw',
    [ISA_RV64I['sllw'].funct7 + ISA_RV64I['sllw'].funct3]: 'sllw',
    [ISA_RV64I['srlw'].funct7 + ISA_RV64I['srlw'].funct3]: 'srlw',
    [ISA_RV64I['sraw'].funct7 + ISA_RV64I['sraw'].funct3]: 'sraw',
    // RV64M
    [ISA_M['mulw'].funct7  + ISA_M['mulw'].funct3]:   'mulw',
    [ISA_M['divw'].funct7  + ISA_M['divw'].funct3]:   'divw',
    [ISA_M['divuw'].funct7 + ISA_M['divuw'].funct3]:  'divuw',
    [ISA_M['remw'].funct7  + ISA_M['remw'].funct3]:   'remw',
    [ISA_M['remuw'].funct7 + ISA_M['remuw'].funct3]:  'remuw',
}

const ISA_OP_64 = {
    // RV128I
    [ISA_RV128I['addd'].funct7 + ISA_RV128I['addd'].funct3]: 'addd',
    [ISA_RV128I['subd'].funct7 + ISA_RV128I['subd'].funct3]: 'subd',
    [ISA_RV128I['slld'].funct7 + ISA_RV128I['slld'].funct3]: 'slld',
    [ISA_RV128I['srld'].funct7 + ISA_RV128I['srld'].funct3]: 'srld',
    [ISA_RV128I['srad'].funct7 + ISA_RV128I['srad'].funct3]: 'srad',
    // RV128M
    [ISA_M['muld'].funct7  + ISA_M['muld'].funct3]:   'muld',
    [ISA_M['divd'].funct7  + ISA_M['divd'].funct3]:   'divd',
    [ISA_M['divud'].funct7 + ISA_M['divud'].funct3]:  'divud',
    [ISA_M['remd'].funct7  + ISA_M['remd'].funct3]:   'remd',
    [ISA_M['remud'].funct7 + ISA_M['remud'].funct3]:  'remud',
}

const ISA_LOAD = {
    [ISA_RV32I['lb'].funct3]:   'lb',
    [ISA_RV32I['lh'].funct3]:   'lh',
    [ISA_RV32I['lw'].funct3]:   'lw',
    [ISA_RV64I['ld'].funct3]:   'ld',
    [ISA_RV32I['lbu'].funct3]:  'lbu',
    [ISA_RV32I['lhu'].funct3]:  'lhu',
    [ISA_RV64I['lwu'].funct3]:  'lwu',
    [ISA_RV128I['ldu'].funct3]: 'ldu',
}

const ISA_STORE = {
    [ISA_RV32I['sb'].funct3]:   'sb',
    [ISA_RV32I['sh'].funct3]:   'sh',
    [ISA_RV32I['sw'].funct3]:   'sw',
    [ISA_RV64I['sd'].funct3]:   'sd',
    [ISA_RV128I['sq'].funct3]:  'sq',
}

const ISA_OP_IMM = {
    [ISA_RV32I['addi'].funct3]:   'addi',
    [ISA_RV32I['slti'].funct3]:   'slti',
    [ISA_RV32I['sltiu'].funct3]:  'sltiu',
    [ISA_RV32I['xori'].funct3]:   'xori',
    [ISA_RV32I['ori'].funct3]:    'ori',
    [ISA_RV32I['andi'].funct3]:   'andi',

    [ISA_RV32I['slli'].funct3]:   'slli',
    [ISA_RV32I['srli'].funct3]: {
        [ISA_RV32I['srli'].shtyp]:  'srli',
        [ISA_RV32I['srai'].shtyp]:  'srai',
    }
}

const ISA_OP_IMM_32 = {
    [ISA_RV64I['addiw'].funct3]:  'addiw',

    [ISA_RV64I['slliw'].funct3]:  'slliw',
    [ISA_RV64I['srliw'].funct3]: {
        [ISA_RV64I['srliw'].shtyp]: 'srliw',
        [ISA_RV64I['sraiw'].shtyp]: 'sraiw',
    }
}

const ISA_OP_IMM_64 = {
    [ISA_RV128I['addid'].funct3]:   'addid',

    [ISA_RV128I['sllid'].funct3]:   'sllid',
    [ISA_RV128I['srlid'].funct3]: {
        [ISA_RV128I['srlid'].shtyp]:  'srlid',
        [ISA_RV128I['sraid'].shtyp]:  'sraid',
    }
}

const ISA_BRANCH = {
    [ISA_RV32I['beq'].funct3]:  'beq',
    [ISA_RV32I['bne'].funct3]:  'bne',
    [ISA_RV32I['blt'].funct3]:  'blt',
    [ISA_RV32I['bge'].funct3]:  'bge',
    [ISA_RV32I['bltu'].funct3]: 'bltu',
    [ISA_RV32I['bgeu'].funct3]: 'bgeu',
}

const ISA_MISC_MEM = {
    [ISA_RV32I['fence'].funct3]:      'fence',
    [ISA_Zifencei['fence.i'].funct3]: 'fence.i',
    [ISA_RV128I['lq'].funct3]:        'lq',
}

const ISA_SYSTEM = {
    [ISA_RV32I['ecall'].funct3]: {
        [ISA_RV32I['ecall'].funct12]:   'ecall',
        [ISA_RV32I['ebreak'].funct12]:  'ebreak',
        [ISA_Priv['sret'].funct12]:     'sret',
        [ISA_Priv['mret'].funct12]:     'mret',
        [ISA_Priv['wfi'].funct12]:      'wfi',
    },
    [ISA_Zicsr['csrrw'].funct3]:  'csrrw',
    [ISA_Zicsr['csrrs'].funct3]:  'csrrs',
    [ISA_Zicsr['csrrc'].funct3]:  'csrrc',
    [ISA_Zicsr['csrrwi'].funct3]: 'csrrwi',
    [ISA_Zicsr['csrrsi'].funct3]: 'csrrsi',
    [ISA_Zicsr['csrrci'].funct3]: 'csrrci',
}

const ISA_AMO = {
    [ISA_A['lr.w'].funct5        + ISA_A['lr.w'].funct3]:      'lr.w',
    [ISA_A['sc.w'].funct5        + ISA_A['sc.w'].funct3]:      'sc.w',
    [ISA_A['amoswap.w'].funct5   + ISA_A['amoswap.w'].funct3]: 'amoswap.w',
    [ISA_A['amoadd.w'].funct5    + ISA_A['amoadd.w'].funct3]:  'amoadd.w',
    [ISA_A['amoxor.w'].funct5    + ISA_A['amoxor.w'].funct3]:  'amoxor.w',
    [ISA_A['amoand.w'].funct5    + ISA_A['amoand.w'].funct3]:  'amoand.w',
    [ISA_A['amoor.w'].funct5     + ISA_A['amoor.w'].funct3]:   'amoor.w',
    [ISA_A['amomin.w'].funct5    + ISA_A['amomin.w'].funct3]:  'amomin.w',
    [ISA_A['amomax.w'].funct5    + ISA_A['amomax.w'].funct3]:  'amomax.w',
    [ISA_A['amominu.w'].funct5   + ISA_A['amominu.w'].funct3]: 'amominu.w',
    [ISA_A['amomaxu.w'].funct5   + ISA_A['amomaxu.w'].funct3]: 'amomaxu.w',

    [ISA_A['lr.d'].funct5        + ISA_A['lr.d'].funct3]:      'lr.d',
    [ISA_A['sc.d'].funct5        + ISA_A['sc.d'].funct3]:      'sc.d',
    [ISA_A['amoswap.d'].funct5   + ISA_A['amoswap.d'].funct3]: 'amoswap.d',
    [ISA_A['amoadd.d'].funct5    + ISA_A['amoadd.d'].funct3]:  'amoadd.d',
    [ISA_A['amoxor.d'].funct5    + ISA_A['amoxor.d'].funct3]:  'amoxor.d',
    [ISA_A['amoand.d'].funct5    + ISA_A['amoand.d'].funct3]:  'amoand.d',
    [ISA_A['amoor.d'].funct5     + ISA_A['amoor.d'].funct3]:   'amoor.d',
    [ISA_A['amomin.d'].funct5    + ISA_A['amomin.d'].funct3]:  'amomin.d',
    [ISA_A['amomax.d'].funct5    + ISA_A['amomax.d'].funct3]:  'amomax.d',
    [ISA_A['amominu.d'].funct5   + ISA_A['amominu.d'].funct3]: 'amominu.d',
    [ISA_A['amomaxu.d'].funct5   + ISA_A['amomaxu.d'].funct3]: 'amomaxu.d',

    [ISA_A['lr.q'].funct5        + ISA_A['lr.q'].funct3]:      'lr.q',
    [ISA_A['sc.q'].funct5        + ISA_A['sc.q'].funct3]:      'sc.q',
    [ISA_A['amoswap.q'].funct5   + ISA_A['amoswap.q'].funct3]: 'amoswap.q',
    [ISA_A['amoadd.q'].funct5    + ISA_A['amoadd.q'].funct3]:  'amoadd.q',
    [ISA_A['amoxor.q'].funct5    + ISA_A['amoxor.q'].funct3]:  'amoxor.q',
    [ISA_A['amoand.q'].funct5    + ISA_A['amoand.q'].funct3]:  'amoand.q',
    [ISA_A['amoor.q'].funct5     + ISA_A['amoor.q'].funct3]:   'amoor.q',
    [ISA_A['amomin.q'].funct5    + ISA_A['amomin.q'].funct3]:  'amomin.q',
    [ISA_A['amomax.q'].funct5    + ISA_A['amomax.q'].funct3]:  'amomax.q',
    [ISA_A['amominu.q'].funct5   + ISA_A['amominu.q'].funct3]: 'amominu.q',
    [ISA_A['amomaxu.q'].funct5   + ISA_A['amomaxu.q'].funct3]: 'amomaxu.q',
}

const ISA_LOAD_FP = {
    [FP_WIDTH.S]: 'flw',
    [FP_WIDTH.D]: 'fld',
    [FP_WIDTH.Q]: 'flq',
}

const ISA_STORE_FP = {
    [FP_WIDTH.S]: 'fsw',
    [FP_WIDTH.D]: 'fsd',
    [FP_WIDTH.Q]: 'fsq',
}

const ISA_MADD = {
    [FP_FMT.S]: 'fmadd.s',
    [FP_FMT.D]: 'fmadd.d',
    [FP_FMT.Q]: 'fmadd.q',
}

const ISA_MSUB = {
    [FP_FMT.S]: 'fmsub.s',
    [FP_FMT.D]: 'fmsub.d',
    [FP_FMT.Q]: 'fmsub.q',
}

const ISA_NMADD = {
    [FP_FMT.S]: 'fnmadd.s',
    [FP_FMT.D]: 'fnmadd.d',
    [FP_FMT.Q]: 'fnmadd.q',
}

const ISA_NMSUB = {
    [FP_FMT.S]: 'fnmsub.s',
    [FP_FMT.D]: 'fnmsub.d',
    [FP_FMT.Q]: 'fnmsub.q',
}

const ISA_OP_FP = {
    [ISA_F['fadd.s'].funct5]: {
        [FP_FMT.S]: 'fadd.s',
        [FP_FMT.D]: 'fadd.d',
        [FP_FMT.Q]: 'fadd.q',
    },
    [ISA_F['fsub.s'].funct5]: {
        [FP_FMT.S]: 'fsub.s',
        [FP_FMT.D]: 'fsub.d',
        [FP_FMT.Q]: 'fsub.q',
    },
    [ISA_F['fmul.s'].funct5]: {
        [FP_FMT.S]: 'fmul.s',
        [FP_FMT.D]: 'fmul.d',
        [FP_FMT.Q]: 'fmul.q',
    },
    [ISA_F['fdiv.s'].funct5]: {
        [FP_FMT.S]: 'fdiv.s',
        [FP_FMT.D]: 'fdiv.d',
        [FP_FMT.Q]: 'fdiv.q',
    },
    [ISA_F['fsqrt.s'].funct5]: {
        [FP_FMT.S]: 'fsqrt.s',
        [FP_FMT.D]: 'fsqrt.d',
        [FP_FMT.Q]: 'fsqrt.q',
    },
    [ISA_F['fmv.w.x'].funct5]: {
        [FP_FMT.S]: 'fmv.w.x',
        [FP_FMT.D]: 'fmv.d.x',
        [FP_FMT.Q]: 'fmv.q.x',
    },
    [ISA_F['fclass.s'].funct5]: {
        [FP_FMT.S]: {
            [ISA_F['fclass.s'].funct3]:   'fclass.s',
            [ISA_F['fmv.x.w'].funct3]:    'fmv.x.w',
        },
        [FP_FMT.D]: {
            [ISA_D['fclass.d'].funct3]:   'fclass.d',
            [ISA_D['fmv.x.d'].funct3]:    'fmv.x.d',
        },
        [FP_FMT.Q]: {
            [ISA_Q['fclass.q'].funct3]:   'fclass.q',
            [ISA_Q['fmv.x.q'].funct3]:    'fmv.x.q',
        },
    },
    [ISA_F['fsgnj.s'].funct5]: {
        [FP_FMT.S]: {
            [ISA_F['fsgnj.s'].funct3]:    'fsgnj.s',
            [ISA_F['fsgnjn.s'].funct3]:   'fsgnjn.s',
            [ISA_F['fsgnjx.s'].funct3]:   'fsgnjx.s',
        },
        [FP_FMT.D]: {
            [ISA_D['fsgnj.d'].funct3]:    'fsgnj.d',
            [ISA_D['fsgnjn.d'].funct3]:   'fsgnjn.d',
            [ISA_D['fsgnjx.d'].funct3]:   'fsgnjx.d',
        },
        [FP_FMT.Q]: {
            [ISA_Q['fsgnj.q'].funct3]:    'fsgnj.q',
            [ISA_Q['fsgnjn.q'].funct3]:   'fsgnjn.q',
            [ISA_Q['fsgnjx.q'].funct3]:   'fsgnjx.q',
        },
    },
    [ISA_F['fmin.s'].funct5]: {
        [FP_FMT.S]: {
            [ISA_F['fmin.s'].funct3]:     'fmin.s',
            [ISA_F['fmax.s'].funct3]:     'fmax.s',
        },
        [FP_FMT.D]: {
            [ISA_D['fmin.d'].funct3]:     'fmin.d',
            [ISA_D['fmax.d'].funct3]:     'fmax.d',
        },
        [FP_FMT.Q]: {
            [ISA_Q['fmin.q'].funct3]:     'fmin.q',
            [ISA_Q['fmax.q'].funct3]:     'fmax.q',
        },
    },
    [ISA_F['feq.s'].funct5]: {
        [FP_FMT.S]: {
            [ISA_F['feq.s'].funct3]:     'feq.s',
            [ISA_F['flt.s'].funct3]:     'flt.s',
            [ISA_F['fle.s'].funct3]:     'fle.s',
        },
        [FP_FMT.D]: {
            [ISA_D['feq.d'].funct3]:     'feq.d',
            [ISA_D['flt.d'].funct3]:     'flt.d',
            [ISA_D['fle.d'].funct3]:     'fle.d',
        },
        [FP_FMT.Q]: {
            [ISA_Q['feq.q'].funct3]:     'feq.q',
            [ISA_Q['flt.q'].funct3]:     'flt.q',
            [ISA_Q['fle.q'].funct3]:     'fle.q',
        },
    },
    [ISA_F['fcvt.w.s'].funct5]: {
        [FP_FMT.S]: {
            [ISA_F['fcvt.w.s'].rs2]:   'fcvt.w.s',
            [ISA_F['fcvt.wu.s'].rs2]:  'fcvt.wu.s',
            [ISA_F['fcvt.l.s'].rs2]:   'fcvt.l.s',
            [ISA_F['fcvt.lu.s'].rs2]:  'fcvt.lu.s',
            [ISA_F['fcvt.t.s'].rs2]:   'fcvt.t.s',
            [ISA_F['fcvt.tu.s'].rs2]:  'fcvt.tu.s',
        },
        [FP_FMT.D]: {
            [ISA_D['fcvt.w.d'].rs2]:   'fcvt.w.d',
            [ISA_D['fcvt.wu.d'].rs2]:  'fcvt.wu.d',
            [ISA_D['fcvt.l.d'].rs2]:   'fcvt.l.d',
            [ISA_D['fcvt.lu.d'].rs2]:  'fcvt.lu.d',
            [ISA_D['fcvt.t.d'].rs2]:   'fcvt.t.d',
            [ISA_D['fcvt.tu.d'].rs2]:  'fcvt.tu.d',
        },
        [FP_FMT.Q]: {
            [ISA_Q['fcvt.w.q'].rs2]:   'fcvt.w.q',
            [ISA_Q['fcvt.wu.q'].rs2]:  'fcvt.wu.q',
            [ISA_Q['fcvt.l.q'].rs2]:   'fcvt.l.q',
            [ISA_Q['fcvt.lu.q'].rs2]:  'fcvt.lu.q',
            [ISA_Q['fcvt.t.q'].rs2]:   'fcvt.t.q',
            [ISA_Q['fcvt.tu.q'].rs2]:  'fcvt.tu.q',
        },
    },
    [ISA_F['fcvt.s.w'].funct5]: {
        [FP_FMT.S]: {
            [ISA_F['fcvt.s.w'].rs2]:   'fcvt.s.w',
            [ISA_F['fcvt.s.wu'].rs2]:  'fcvt.s.wu',
            [ISA_F['fcvt.s.l'].rs2]:   'fcvt.s.l',
            [ISA_F['fcvt.s.lu'].rs2]:  'fcvt.s.lu',
            [ISA_F['fcvt.s.t'].rs2]:   'fcvt.s.t',
            [ISA_F['fcvt.s.tu'].rs2]:  'fcvt.s.tu',
        },
        [FP_FMT.D]: {
            [ISA_D['fcvt.d.w'].rs2]:   'fcvt.d.w',
            [ISA_D['fcvt.d.wu'].rs2]:  'fcvt.d.wu',
            [ISA_D['fcvt.d.l'].rs2]:   'fcvt.d.l',
            [ISA_D['fcvt.d.lu'].rs2]:  'fcvt.d.lu',
            [ISA_D['fcvt.d.t'].rs2]:   'fcvt.d.t',
            [ISA_D['fcvt.d.tu'].rs2]:  'fcvt.d.tu',
        },
        [FP_FMT.Q]: {
            [ISA_Q['fcvt.q.w'].rs2]:   'fcvt.q.w',
            [ISA_Q['fcvt.q.wu'].rs2]:  'fcvt.q.wu',
            [ISA_Q['fcvt.q.l'].rs2]:   'fcvt.q.l',
            [ISA_Q['fcvt.q.lu'].rs2]:  'fcvt.q.lu',
            [ISA_Q['fcvt.q.t'].rs2]:   'fcvt.q.t',
            [ISA_Q['fcvt.q.tu'].rs2]:  'fcvt.q.tu',
        },
    },
    [ISA_D['fcvt.s.d'].funct5]: {
        [FP_FMT.S]: {
            [ISA_D['fcvt.s.d'].rs2]:   'fcvt.s.d',
            [ISA_Q['fcvt.s.q'].rs2]:   'fcvt.s.q',
        },
        [FP_FMT.D]: {
            [ISA_D['fcvt.d.s'].rs2]:   'fcvt.d.s',
            [ISA_Q['fcvt.d.q'].rs2]:   'fcvt.d.q',
        },
        [FP_FMT.Q]: {
            [ISA_Q['fcvt.q.s'].rs2]:   'fcvt.q.s',
            [ISA_Q['fcvt.q.d'].rs2]:   'fcvt.q.d',
        },
    },
}

// ISA_C xlen lookup generator
function xlenLookupGen(...instNames) {
    let lookup = {};
    for (const name of instNames) {
        const inst = ISA_C[name];
        for (let xlen = XLEN_MASK.rv32; xlen <= XLEN_MASK.all; xlen <<= 1) {
            if (inst.xlens & xlen) {
                lookup[xlen] = name;
            }
        }
    }
    return lookup;
}

// C0 Instruction order of lookup
// - funct3
// - xlen
const ISA_C0 = {
    [ISA_C['c.addi4spn'].funct3]: 'c.addi4spn',
    [ISA_C['c.fld'].funct3]:  xlenLookupGen('c.fld', 'c.lq'),
    [ISA_C['c.lw'].funct3]:   'c.lw',
    [ISA_C['c.flw'].funct3]:  xlenLookupGen('c.flw', 'c.ld'),
    [ISA_C['c.fsd'].funct3]:  xlenLookupGen('c.fsd', 'c.sq'),
    [ISA_C['c.sw'].funct3]:   'c.sw',
    [ISA_C['c.fsw'].funct3]:  xlenLookupGen('c.fsw', 'c.sd'),
}

// C1 Instruction order of lookup
// - funct3
// - xlen
// - rdRs1Val
// - funct2_cb
// - funct6[3]+funct2
const ISA_C1 = {
    [ISA_C['c.nop'].funct3]: { [XLEN_MASK.all]: {
        [ISA_C['c.nop'].rdRs1Val]:  'c.nop',
                                        'default':  'c.addi',
    }},
    [ISA_C['c.jal'].funct3]:      xlenLookupGen('c.jal', 'c.addiw'),
    [ISA_C['c.li'].funct3]:       'c.li',
    [ISA_C['c.addi16sp'].funct3]: { [XLEN_MASK.all]: {
        [ISA_C['c.addi16sp'].rdRs1Val]: 'c.addi16sp',
                                                 'default': 'c.lui',
    }},
    [ISA_C['c.srli'].funct3]: { [XLEN_MASK.all]: { 'default': {
        [ISA_C['c.srli'].funct2]:   'c.srli',
        [ISA_C['c.srai'].funct2]:   'c.srai',
        [ISA_C['c.andi'].funct2]:   'c.andi',
                                                '11': {
            [ISA_C['c.sub'].funct6[3] +ISA_C['c.sub'].funct2]:  'c.sub',
            [ISA_C['c.xor'].funct6[3] +ISA_C['c.xor'].funct2]:  'c.xor',
            [ISA_C['c.or'].funct6[3]  +ISA_C['c.or'].funct2]:   'c.or',
            [ISA_C['c.and'].funct6[3] +ISA_C['c.and'].funct2]:  'c.and',
            [ISA_C['c.subw'].funct6[3]+ISA_C['c.subw'].funct2]: 'c.subw',
            [ISA_C['c.addw'].funct6[3]+ISA_C['c.addw'].funct2]: 'c.addw',
        }
    }}},
    [ISA_C['c.j'].funct3]:        'c.j',
    [ISA_C['c.beqz'].funct3]:     'c.beqz',
    [ISA_C['c.bnez'].funct3]:     'c.bnez',
}

// C2 Instruction order of lookup
// - funct3
// - xlen
// - funct4[3]
// - rs2Val
// - rdRs1Val
const ISA_C2 = {
    [ISA_C['c.slli'].funct3]:   'c.slli',
    [ISA_C['c.fldsp'].funct3]:  xlenLookupGen('c.fldsp', 'c.lqsp'),
    [ISA_C['c.lwsp'].funct3]:   'c.lwsp',
    [ISA_C['c.flwsp'].funct3]:  xlenLookupGen('c.flwsp', 'c.ldsp'),
    [ISA_C['c.jr'].funct4.substring(0,3)]: { [XLEN_MASK.all]: {
        [ISA_C['c.jr'].funct4[3]]: {
            [ISA_C['c.jr'].rs2Val]:   'c.jr',
                                     'default':   'c.mv',
        },
        [ISA_C['c.ebreak'].funct4[3]]: {
            [ISA_C['c.ebreak'].rs2Val]: {
                [ISA_C['c.ebreak'].rdRs1Val]: 'c.ebreak',
                                                     'default': 'c.jalr',
            },
                                             'default':   'c.add',
        },
    }},
    [ISA_C['c.fsdsp'].funct3]:  xlenLookupGen('c.fsdsp', 'c.sqsp'),
    [ISA_C['c.swsp'].funct3]:   'c.swsp',
    [ISA_C['c.fswsp'].funct3]:  xlenLookupGen('c.fswsp', 'c.sdsp'),
}

const REGISTER = {
    zero: "x0",
    ra:   "x1",
    sp:   "x2",
    gp:   "x3",
    tp:   "x4",
    t0:   "x5",
    t1:   "x6",
    t2:   "x7",
    s0:   "x8",
    s1:   "x9",
    a0:   "x10",
    a1:   "x11",
    a2:   "x12",
    a3:   "x13",
    a4:   "x14",
    a5:   "x15",
    a6:   "x16",
    a7:   "x17",
    s2:   "x18",
    s3:   "x19",
    s4:   "x20",
    s5:   "x21",
    s6:   "x22",
    s7:   "x23",
    s8:   "x24",
    s9:   "x25",
    s10:  "x26",
    s11:  "x27",
    t3:   "x28",
    t4:   "x29",
    t5:   "x30",
    t6:   "x31",
    fp:   "x8",  // at bottom to conserve order for ABI indexing
}

const FLOAT_REGISTER = {
    ft0:  "f0",
    ft1:  "f1",
    ft2:  "f2",
    ft3:  "f3",
    ft4:  "f4",
    ft5:  "f5",
    ft6:  "f6",
    ft7:  "f7",
    fs0:  "f8",
    fs1:  "f9",
    fa0:  "f10",
    fa1:  "f11",
    fa2:  "f12",
    fa3:  "f13",
    fa4:  "f14",
    fa5:  "f15",
    fa6:  "f16",
    fa7:  "f17",
    fs2:  "f18",
    fs3:  "f19",
    fs4:  "f20",
    fs5:  "f21",
    fs6:  "f22",
    fs7:  "f23",
    fs8:  "f24",
    fs9:  "f25",
    fs10: "f26",
    fs11: "f27",
    ft8:  "f28",
    ft9:  "f29",
    ft10: "f30",
    ft11: "f31",
}

export const FLOAT_ROUNDING_MODE = {
    "rne": 0b000,
    "rtz": 0b001,
    "rdn": 0b010,
    "rup": 0b011,
    "rmm": 0b100,
    "dyn": 0b111,
}  

// CSR Encodings
const CSR = {
    cycle:          0xc00,
    cycleh:         0xc80,
    dcsr:           0x7b0,
    dpc:            0x7b1,
    dscratch0:      0x7b2,
    dscratch1:      0x7b3,
    fcsr:           0x003,
    fflags:         0x001,
    frm:            0x002,
    hcounteren:     0x606,
    hedeleg:        0x602,
    hgatp:          0x680,
    hgeie:          0x607,
    hgeip:          0xe07,
    hideleg:        0x603,
    hie:            0x604,
    hip:            0x644,
    hpmcounter3:    0xc03,
    hpmcounter4:    0xc04,
    hpmcounter5:    0xc05,
    hpmcounter6:    0xc06,
    hpmcounter7:    0xc07,
    hpmcounter8:    0xc08,
    hpmcounter9:    0xc09,
    hpmcounter10:   0xc0a,
    hpmcounter11:   0xc0b,
    hpmcounter12:   0xc0c,
    hpmcounter13:   0xc0d,
    hpmcounter14:   0xc0e,
    hpmcounter15:   0xc0f,
    hpmcounter16:   0xc10,
    hpmcounter17:   0xc11,
    hpmcounter18:   0xc12,
    hpmcounter19:   0xc13,
    hpmcounter20:   0xc14,
    hpmcounter21:   0xc15,
    hpmcounter22:   0xc16,
    hpmcounter23:   0xc17,
    hpmcounter24:   0xc18,
    hpmcounter25:   0xc19,
    hpmcounter26:   0xc1a,
    hpmcounter27:   0xc1b,
    hpmcounter28:   0xc1c,
    hpmcounter29:   0xc1d,
    hpmcounter30:   0xc1e,
    hpmcounter31:   0xc1f,
    hpmcounter3h:   0xc83,
    hpmcounter4h:   0xc84,
    hpmcounter5h:   0xc85,
    hpmcounter6h:   0xc86,
    hpmcounter7h:   0xc87,
    hpmcounter8h:   0xc88,
    hpmcounter9h:   0xc89,
    hpmcounter10h:  0xc8a,
    hpmcounter11h:  0xc8b,
    hpmcounter12h:  0xc8c,
    hpmcounter13h:  0xc8d,
    hpmcounter14h:  0xc8e,
    hpmcounter15h:  0xc8f,
    hpmcounter16h:  0xc90,
    hpmcounter17h:  0xc91,
    hpmcounter18h:  0xc92,
    hpmcounter19h:  0xc93,
    hpmcounter20h:  0xc94,
    hpmcounter21h:  0xc95,
    hpmcounter22h:  0xc96,
    hpmcounter23h:  0xc97,
    hpmcounter24h:  0xc98,
    hpmcounter25h:  0xc99,
    hpmcounter26h:  0xc9a,
    hpmcounter27h:  0xc9b,
    hpmcounter28h:  0xc9c,
    hpmcounter29h:  0xc9d,
    hpmcounter30h:  0xc9e,
    hpmcounter31h:  0xc9f,
    hstatus:        0x600,
    htimedelta:     0x605,
    htimedeltah:    0x615,
    htinst:         0x64a,
    htval:          0x643,
    instret:        0xc02,
    instreth:       0xc82,
    marchid:        0xf12,
    mbase:          0x380,
    mbound:         0x381,
    mcause:         0x342,
    mcounteren:     0x306,
    mcountinhibit:  0x320,
    mcycle:         0xb00,
    mcycleh:        0xb80,
    mdbase:         0x384,
    mdbound:        0x385,
    medeleg:        0x302,
    mepc:           0x341,
    mhartid:        0xf14,
    mhpmcounter3:   0xb03,
    mhpmcounter4:   0xb04,
    mhpmcounter5:   0xb05,
    mhpmcounter6:   0xb06,
    mhpmcounter7:   0xb07,
    mhpmcounter8:   0xb08,
    mhpmcounter9:   0xb09,
    mhpmcounter10:  0xb0a,
    mhpmcounter11:  0xb0b,
    mhpmcounter12:  0xb0c,
    mhpmcounter13:  0xb0d,
    mhpmcounter14:  0xb0e,
    mhpmcounter15:  0xb0f,
    mhpmcounter16:  0xb10,
    mhpmcounter17:  0xb11,
    mhpmcounter18:  0xb12,
    mhpmcounter19:  0xb13,
    mhpmcounter20:  0xb14,
    mhpmcounter21:  0xb15,
    mhpmcounter22:  0xb16,
    mhpmcounter23:  0xb17,
    mhpmcounter24:  0xb18,
    mhpmcounter25:  0xb19,
    mhpmcounter26:  0xb1a,
    mhpmcounter27:  0xb1b,
    mhpmcounter28:  0xb1c,
    mhpmcounter29:  0xb1d,
    mhpmcounter30:  0xb1e,
    mhpmcounter31:  0xb1f,
    mhpmcounter3h:  0xb83,
    mhpmcounter4h:  0xb84,
    mhpmcounter5h:  0xb85,
    mhpmcounter6h:  0xb86,
    mhpmcounter7h:  0xb87,
    mhpmcounter8h:  0xb88,
    mhpmcounter9h:  0xb89,
    mhpmcounter10h: 0xb8a,
    mhpmcounter11h: 0xb8b,
    mhpmcounter12h: 0xb8c,
    mhpmcounter13h: 0xb8d,
    mhpmcounter14h: 0xb8e,
    mhpmcounter15h: 0xb8f,
    mhpmcounter16h: 0xb90,
    mhpmcounter17h: 0xb91,
    mhpmcounter18h: 0xb92,
    mhpmcounter19h: 0xb93,
    mhpmcounter20h: 0xb94,
    mhpmcounter21h: 0xb95,
    mhpmcounter22h: 0xb96,
    mhpmcounter23h: 0xb97,
    mhpmcounter24h: 0xb98,
    mhpmcounter25h: 0xb99,
    mhpmcounter26h: 0xb9a,
    mhpmcounter27h: 0xb9b,
    mhpmcounter28h: 0xb9c,
    mhpmcounter29h: 0xb9d,
    mhpmcounter30h: 0xb9e,
    mhpmcounter31h: 0xb9f,
    mhpmevent3:     0x323,
    mhpmevent4:     0x324,
    mhpmevent5:     0x325,
    mhpmevent6:     0x326,
    mhpmevent7:     0x327,
    mhpmevent8:     0x328,
    mhpmevent9:     0x329,
    mhpmevent10:    0x32a,
    mhpmevent11:    0x32b,
    mhpmevent12:    0x32c,
    mhpmevent13:    0x32d,
    mhpmevent14:    0x32e,
    mhpmevent15:    0x32f,
    mhpmevent16:    0x330,
    mhpmevent17:    0x331,
    mhpmevent18:    0x332,
    mhpmevent19:    0x333,
    mhpmevent20:    0x334,
    mhpmevent21:    0x335,
    mhpmevent22:    0x336,
    mhpmevent23:    0x337,
    mhpmevent24:    0x338,
    mhpmevent25:    0x339,
    mhpmevent26:    0x33a,
    mhpmevent27:    0x33b,
    mhpmevent28:    0x33c,
    mhpmevent29:    0x33d,
    mhpmevent30:    0x33e,
    mhpmevent31:    0x33f,
    mibase:         0x382,
    mibound:        0x383,
    mideleg:        0x303,
    mie:            0x304,
    mimpid:         0xf13,
    minstret:       0xb02,
    minstreth:      0xb82,
    mip:            0x344,
    misa:           0x301,
    mscratch:       0x340,
    mstatus:        0x300,
    mstatush:       0x310,
    mtinst:         0x34a,
    mtval:          0x343,
    mtval2:         0x34b,
    mtvec:          0x305,
    mvendorid:      0xf11,
    pmpaddr0:       0x3b0,
    pmpaddr1:       0x3b1,
    pmpaddr2:       0x3b2,
    pmpaddr3:       0x3b3,
    pmpaddr4:       0x3b4,
    pmpaddr5:       0x3b5,
    pmpaddr6:       0x3b6,
    pmpaddr7:       0x3b7,
    pmpaddr8:       0x3b8,
    pmpaddr9:       0x3b9,
    pmpaddr10:      0x3ba,
    pmpaddr11:      0x3bb,
    pmpaddr12:      0x3bc,
    pmpaddr13:      0x3bd,
    pmpaddr14:      0x3be,
    pmpaddr15:      0x3bf,
    pmpaddr16:      0x3c0,
    pmpaddr17:      0x3c1,
    pmpaddr18:      0x3c2,
    pmpaddr19:      0x3c3,
    pmpaddr20:      0x3c4,
    pmpaddr21:      0x3c5,
    pmpaddr22:      0x3c6,
    pmpaddr23:      0x3c7,
    pmpaddr24:      0x3c8,
    pmpaddr25:      0x3c9,
    pmpaddr26:      0x3ca,
    pmpaddr27:      0x3cb,
    pmpaddr28:      0x3cc,
    pmpaddr29:      0x3cd,
    pmpaddr30:      0x3ce,
    pmpaddr31:      0x3cf,
    pmpaddr32:      0x3d0,
    pmpaddr33:      0x3d1,
    pmpaddr34:      0x3d2,
    pmpaddr35:      0x3d3,
    pmpaddr36:      0x3d4,
    pmpaddr37:      0x3d5,
    pmpaddr38:      0x3d6,
    pmpaddr39:      0x3d7,
    pmpaddr40:      0x3d8,
    pmpaddr41:      0x3d9,
    pmpaddr42:      0x3da,
    pmpaddr43:      0x3db,
    pmpaddr44:      0x3dc,
    pmpaddr45:      0x3dd,
    pmpaddr46:      0x3de,
    pmpaddr47:      0x3df,
    pmpaddr48:      0x3e0,
    pmpaddr49:      0x3e1,
    pmpaddr50:      0x3e2,
    pmpaddr51:      0x3e3,
    pmpaddr52:      0x3e4,
    pmpaddr53:      0x3e5,
    pmpaddr54:      0x3e6,
    pmpaddr55:      0x3e7,
    pmpaddr56:      0x3e8,
    pmpaddr57:      0x3e9,
    pmpaddr58:      0x3ea,
    pmpaddr59:      0x3eb,
    pmpaddr60:      0x3ec,
    pmpaddr61:      0x3ed,
    pmpaddr62:      0x3ee,
    pmpaddr63:      0x3ef,
    pmpcfg0:        0x3a0,
    pmpcfg1:        0x3a1,
    pmpcfg2:        0x3a2,
    pmpcfg3:        0x3a3,
    pmpcfg4:        0x3a4,
    pmpcfg5:        0x3a5,
    pmpcfg6:        0x3a6,
    pmpcfg7:        0x3a7,
    pmpcfg8:        0x3a8,
    pmpcfg9:        0x3a9,
    pmpcfg10:       0x3aa,
    pmpcfg11:       0x3ab,
    pmpcfg12:       0x3ac,
    pmpcfg13:       0x3ad,
    pmpcfg14:       0x3ae,
    pmpcfg15:       0x3af,
    satp:           0x180,
    scause:         0x142,
    scounteren:     0x106,
    sedeleg:        0x102,
    sepc:           0x141,
    sideleg:        0x103,
    sie:            0x104,
    sip:            0x144,
    sscratch:       0x140,
    sstatus:        0x100,
    stval:          0x143,
    stvec:          0x105,
    tdata1:         0x7a1,
    tdata2:         0x7a2,
    tdata3:         0x7a3,
    time:           0xc01,
    timeh:          0xc81,
    tselect:        0x7a0,
    ucause:         0x042,
    uepc:           0x041,
    uie:            0x004,
    uip:            0x044,
    uscratch:       0x040,
    ustatus:        0x000,
    utval:          0x043,
    utvec:          0x005,
    vsatp:          0x280,
    vscause:        0x242,
    vsepc:          0x241,
    vsie:           0x204,
    vsip:           0x244,
    vsscratch:      0x240,
    vsstatus:       0x200,
    vstval:         0x243,
    vstvec:         0x205,
}

// Frag ID
const FRAG = {
    UNSD: 1, // UNUSED fragments display bits with no significance  
    CSR: 2,
    IMM: 3,
    OPC: 4, // OPCODE includes opcode, funct3/4/5/12, fmt, etc
    PRED: 5,
    RD: 6,
    RS1: 7,
    RS2: 8,
    RS3: 9,
    SUCC: 10,
    FRM: 11,
}

// Entire ISA
const ISA = Object.assign({},
    ISA_RV32I, ISA_RV64I, ISA_RV128I,
    ISA_Zifencei, ISA_Zicsr,
    ISA_M, ISA_A, ISA_F, ISA_D, ISA_Q, ISA_C,
    ISA_Priv);

function makeEnum(names) {
    return Object.freeze(
        names.reduce((o, n) => {
            o[n] = Symbol(n);
            return o;
        }, {})
    );
}

/*
 * Configuration field types
 */
const CONFIG_TYPE = makeEnum(
    ['BOOL', 'CHOOSE_ONE']
);

/*
 * Configuration options enums
 */
const COPTS_ISA = makeEnum(
    ['AUTO', 'RV32I', 'RV64I', 'RV128I']
);

/**
 * Configuration options
 * - maps config field name to:
 *   - type: type of the configuration field (see CONFIG_TYPE)
 *   - opts: list of the possible values for the field
 *     - ignored for 'CONFIG_TYPE.BOOL'
 *   - default: default value, inferred as first value in 'opts'
 */
const configFields = {
    ISA: { name: 'ISA', type: CONFIG_TYPE.CHOOSE_ONE, opts: Object.values(COPTS_ISA) },
    ABI: { name: 'ABI', type: CONFIG_TYPE.BOOL,       default: false },
    immAsHex: { name: 'immAsHex', type: CONFIG_TYPE.BOOL, default: false },
}

/**
 * Default configuration
 * - if no default defined, then constructed
 *   from the first option in `opts`
 */
const configDefault = Object.freeze(
    Object.fromEntries(
        Object.entries(configFields).map(
            ([k,v]) => [k, (v.default ?? v.opts[0])]
)));

/**
 * Represents an instruction
 * @class
 */
export class Instruction {
    /**
     * ISA of instruction: 'RV32I', 'RV64I', 'EXT_M', 'EXT_A', etc.
     * @type String
     */
    isa;
    /**
     * Format of instruction: 'R-type', 'I-type', etc.
     * @type String
     */
    fmt;
    /**
     * Length of instruction: 16 or 32 bits
     * @type Number
     */
    len;
    /**
     * Assembly representation of instruction
     * @type String
     */
    asm;
    /**
     * Binary representation of instruction
     * @type String
     */
    bin;
    /**
     * Hexadecimal representation of instruction
     * @type String
     */
    hex;
    /**
     * Fragments for assembly instruction rendering, ordered by token position
     * @type Array
     */
    asmFrags;
    /**
     * Fragments for binary instruction rendering, ordered by bit position
     * @type Array
     */
    binFrags;

    /* Private members */
    #config;
    #xlens;

    /**
     * Creates an instruction represented in multiple formats
     * @param {String} instruction
     * @param {Object} configuration
     */
    constructor(instruction, config={}) {
        this.#config = Object.assign({}, configDefault, config);
        this.#convertInstruction(instruction.trim());
    }

    #convertInstruction(instruction) {
        // Regular expression for up to 32 binary bits
        const binRegEx = /^(0b)?[01]{1,32}$/;

        // Regular expression for up to 8 hexadecimal digits
        const hexRegEx = /^(0x)?[0-9a-fA-F]{1,8}$/;

        // Regular expression for alphabetic character (first letter of opcode)
        const asmRegEx = /^[a-zA-Z]$/;

        // Test for valid mnemonic input before interpreting as value
        const validMne = instruction.trimStart().split(' ')[0] in ISA;
        if (validMne) {
            // Shortcircuit to assembly instruction when valid mnemonic detected
            this.#encodeBin(instruction);
        } else if (binRegEx.test(instruction)) {
            // Binary instruction
            this.bin = convertBase(instruction, BASE.bin, BASE.bin, 32);
        } else if (hexRegEx.test(instruction)) {
            // Hexadecimal instruction
            this.bin = convertBase(instruction, BASE.hex, BASE.bin, 32);
        } else if (asmRegEx.test(instruction[0])) {
            // Assembly instruction (first character is a letter)
            this.#encodeBin(instruction);
        }

        else {
            throw new OperationError('Invalid instruction (not in binary, hexadecimal, nor assembly)');
        }

        // Decode binary instruction into assembly
        this.#decodeAsm();

        // Determine hex string length (default to 8)
        let hexLength = 8;
        // Compressed instructions - represent them with 4 hex digits
        if (this.asm.startsWith('c.')) {
            hexLength = 4;
        }

        // Perform bin to hex conversion
        this.hex = convertBase(this.bin, BASE.bin, BASE.hex, hexLength);
    }

    // Decode instruction from binary to assembly
    #decodeAsm() {
        // Create a Decoder for the instruction
        let decoder = new Decoder(this.bin, this.#config, this.#xlens);

        // Get assembly representation
        this.asm = decoder.asm;

        // Get fragments
        this.asmFrags = decoder.asmFrags;
        this.binFrags = decoder.binFrags;

        // Get instruction characteristics
        this.fmt = decoder.fmt;
        this.isa = decoder.isa;
    }

    // Encode instruction from assembly to binary
    #encodeBin(instruction) {
        // Create an Encoder for the instruction
        let encoder = new Encoder(instruction, this.#config);

        // Get binary representation
        this.bin = encoder.bin;

        // Get instruction xlen
        this.#xlens = encoder.xlens;
    }

}

// Convert between bases and pads
function convertBase(val, baseSrc, baseDst, Pad) {
    return parseInt(val, baseSrc).toString(baseDst).padStart(Pad, '0');
}

// Convert register names to ABI names
function convertRegToAbi(reg) {
    const match = /^[xf](\d+)$/.exec(reg);
    if(match !== null) {
        const floatReg = reg[0] === 'f';
        const regDec = match[1];
        reg = decRegAbi(regDec, floatReg);
    }
    return reg;
}

/**
 * Represents a fragment of the instruction
 * @class
 */
class Frag {
    constructor(id, asm, bits, field, mem = false) {
        /** Fragment ID (e.g. FRAG.OPC, FRAG.RS1, etc.)
         * @type {Number}
         */
        this.id = id;
        /** Assembly fragment (e.g., 'addi', 'x5', etc.)
         * @type {String}
         */
        this.asm = asm;
        /** Bits fragment (e.g., '00101')
         * @type {String}
         */
        this.bits = bits;
        /** Name of field (e.g., 'opcode', 'rs1', etc.)
         * @type {String}
         */
        this.field = field;
        /** Signals fragment is a memory address
         * @type {Boolean}
         */
        this.mem = mem;
    }
}

class Decoder {
    /**
     * Assembly representation of instruction
     * @type String
     */
    asm;
    /**
     * ISA of instruction: 'RV32I', 'RV64I', 'EXT_M', 'EXT_A', etc.
     * @type String
     */
    isa;
    /**
     * Format of instruction: 'R-type', 'I-type', etc.
     * @type String
     */
    fmt;
    /**
     * Fragments for binary instruction rendering
     * @type {Frag[]}
     */
    binFrags;
    /**
     * Fragments for assembly instruction rendering
     * @type {Frag[]}
     */
    asmfrags;

    /* Private members */
    #bin;
    #config;
    #mne;
    #opcode;
    #xlens;


    /**
     * Creates an Decoder to convert a binary instruction to assembly
     * @param {String} bin
     */
    constructor(bin, config, xlens = undefined) {
        this.#bin = bin;
        this.#config = config;
        this.#xlens = xlens;

        // Create an array of assembly fragments
        this.binFrags = [];
        this.asmFrags = [];

        // Convert instruction to assembly
        this.#convertBinToAsm();
    }

    // Convert binary instruction to assembly
    #convertBinToAsm() {
        // Use opcode to determine instruction type
        this.#opcode = getBits(this.#bin, FIELDS.opcode.pos);
        // Test for standard 32-bit instruction (i.e., the 2 LSBs of the opcode are '11')
        if (this.#opcode.substring(this.#opcode.length - 2) === '11') {
            switch (this.#opcode) {
                    // R-type
                case OPCODE.OP:
                case OPCODE.OP_32:
                case OPCODE.OP_64:
                    this.#decodeOP();
                    break;
                case OPCODE.OP_FP:
                    this.#decodeOP_FP();
                    break;
                case OPCODE.AMO:
                    this.#decodeAMO();
                    break;

                    // I-type
                case OPCODE.JALR:
                    this.#decodeJALR();
                    break;
                case OPCODE.LOAD:
                case OPCODE.LOAD_FP:
                    this.#decodeLOAD();
                    break;
                case OPCODE.OP_IMM:
                case OPCODE.OP_IMM_32:
                case OPCODE.OP_IMM_64:
                    this.#decodeOP_IMM();
                    break;
                case OPCODE.MISC_MEM:
                    this.#decodeMISC_MEM();
                    break;
                case OPCODE.SYSTEM:
                    this.#decodeSYSTEM();
                    break;

                    // S-type
                case OPCODE.STORE:
                case OPCODE.STORE_FP:
                    this.#decodeSTORE();
                    break;

                    // B-type
                case OPCODE.BRANCH:
                    this.#decodeBRANCH();
                    break;

                    // U-type:
                case OPCODE.LUI:
                case OPCODE.AUIPC:
                    this.#decodeUType();
                    break;

                    // J-type:
                case OPCODE.JAL:
                    this.#decodeJAL();
                    break;

                    // R4-type
                case OPCODE.MADD:
                case OPCODE.MSUB:
                case OPCODE.NMADD:
                case OPCODE.NMSUB:
                    this.#decodeR4();
                    break;

                    // Invalid opcode
                default:
                    throw new OperationError("Invalid opcode: " + this.#opcode);
            }

        } else {
            // Otherwise, it's a compressed instruction

            // Get single xlens value for mne lookup
            if (this.#xlens === undefined) {
                // If no xlens value from Encoder, use config to determine
                switch (this.#config.ISA) {
                    case COPTS_ISA.RV128I:
                        this.#xlens = XLEN_MASK.rv128;
                        break;
                    case COPTS_ISA.RV64I:
                        this.#xlens = XLEN_MASK.rv64;
                        break;
                    default:
                        this.#xlens = XLEN_MASK.rv32;
                }
            } else {
                // Otherwise, reduce xlens to lowest allowed ISA
                for (let b = 1; b < XLEN_MASK.all; b <<= 1) {
                    if (b & this.#xlens) {
                        this.#xlens = b;
                        break;
                    }
                }
            }

            // Use opcode to determine C quadrant
            let inst, quadrant;
            this.#opcode = getBits(this.#bin, FIELDS.c_opcode.pos);
            switch (this.#opcode) {
                case C_OPCODE.C0:
                    inst = this.#mneLookupC0();
                    quadrant = 'C0';
                    break;
                case C_OPCODE.C1:
                    inst = this.#mneLookupC1();
                    quadrant = 'C1';
                    break;
                case C_OPCODE.C2:
                    inst = this.#mneLookupC2();
                    quadrant = 'C2';
                    break;
                default:
                    throw new OperationError(`Cannot decode binary instruction: ${this.bin}`);
            }
            if (inst === undefined) {
                throw new OperationError(`Detected quadrant ${quadrant} but could not determine instruction, potentially HINT or reserved`);
            }

            // Build ISA string from found instruction
            if (inst.xlens & XLEN_MASK.rv32) {
                this.isa = 'RV32';
            } else if (inst.xlens & XLEN_MASK.rv64) {
                this.isa = 'RV64';
            } else {
                this.isa = 'RV128';
            }
            this.isa += inst.isa;

            // Decode instruction by format
            const fmt = /^([^-]+)-/.exec(inst?.fmt)?.[1];
            switch (fmt) {
                case 'CR':
                    this.#decodeCR(inst);
                    break;
                case 'CI':
                    this.#decodeCI(inst);
                    break;
                case 'CSS':
                    this.#decodeCSS(inst);
                    break;
                case 'CIW':
                    this.#decodeCIW(inst);
                    break;
                case 'CL':
                    this.#decodeCL(inst);
                    break;
                case 'CS':
                    this.#decodeCS(inst);
                    break;
                case 'CA':
                    this.#decodeCA(inst);
                    break;
                case 'CB':
                    this.#decodeCB(inst);
                    break;
                case 'CJ':
                    this.#decodeCJ(inst);
                    break;
                default:
                    throw new OperationError(`Internal error: Detected ${this.#mne} in quadrant ${quadrant} but could not match instruction format`);
            }
        }

        if (typeof this.#mne === undefined) {
                throw new OperationError("Decoder internal error");
        }

        // Set instruction's format and ISA
        this.fmt = ISA[this.#mne].fmt;
        this.isa = this.isa ?? ISA[this.#mne].isa;

        // Detect mismatch between ISA and configuration
        if (this.#config.ISA === COPTS_ISA.RV32I && /^RV(?:64|128)/.test(this.isa)) {
            throw new OperationError(`Detected ${this.isa} instruction but configuration ISA set to RV32I`);
        } else if ((this.#config.ISA === COPTS_ISA.RV64I && /^RV128/.test(this.isa))) {
            throw new OperationError(`Detected ${this.isa} instruction but configuration ISA set to RV64I`);
        }

        // Render ASM insturction string (mainly for testing)
        this.asm = renderAsm(this.asmFrags, this.#config.ABI, this.#config.immAsHex);
    }

    /**
     * Decodes OP instructions
     */
    #decodeOP() {
        // Get each field
        const fields = extractRFields(this.#bin);
        const funct7 = fields['funct7'],
            funct3 = fields['funct3'],
            rs2 = fields['rs2'],
            rs1 = fields['rs1'],
            rd = fields['rd'];

        // Find instruction - check opcode for RV32I vs RV64I
        let opcodeName;
        if (this.#opcode === OPCODE.OP_64) {
            // RV128I double-word-sized instructions
            this.#mne = ISA_OP_64[funct7 + funct3];
            opcodeName = "OP-64";
        } else if (this.#opcode === OPCODE.OP_32) {
            // RV64I word-sized instructions
            this.#mne = ISA_OP_32[funct7 + funct3];
            opcodeName = "OP-32";
        } else {
            // All other OP instructions
            this.#mne = ISA_OP[funct7 + funct3];
            opcodeName = "OP";
        }
        if (this.#mne === undefined) {
            throw new OperationError(`Detected ${opcodeName} instruction but invalid funct7 and funct3 fields`);
        }

        // Convert fields to string representations
        const src1 = decReg(rs1),
                    src2 = decReg(rs2),
                    dest = decReg(rd);

        // Create fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
            funct7: new Frag(FRAG.OPC, this.#mne, funct7, FIELDS.r_funct7.name),
            rd:     new Frag(FRAG.RD, dest, rd, FIELDS.rd.name),
            rs1:    new Frag(FRAG.RS1, src1, rs1, FIELDS.rs1.name),
            rs2:    new Frag(FRAG.RS2, src2, rs2, FIELDS.rs2.name),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd'], f['rs1'], f['rs2']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct7'], f['rs2'], f['rs1'], f['funct3'], f['rd'],
            f['opcode']);
    }

    /**
     * Decodes OP-FP instructions
     */
    #decodeOP_FP() {
        // Get each field
        const fields = extractRFields(this.#bin);
        const funct5 = fields['funct5'],
            funct3 = fields['funct3'],
            fmt = fields['fmt'],
            rs2 = fields['rs2'],
            rs1 = fields['rs1'],
            rd = fields['rd'];

        // Find instruction - check opcode for RV32I vs RV64I
        let opcodeName;
        this.#mne = ISA_OP_FP[funct5]?.[fmt];
        if (this.#mne !== undefined && typeof this.#mne !== 'string') {
            if (this.#mne[rs2] !== undefined) {
                // fcvt instructions - use rs2 as lookup
                this.#mne = this.#mne[rs2];
            } else {
                // others - use funct3 as lookup
                this.#mne = this.#mne[funct3];
            }
        }
        if (this.#mne === undefined) {
            throw new OperationError('Detected OP-FP instruction but invalid funct and fmt fields');
        }

        // Convert fields to string representations
        const inst = ISA[this.#mne];
        const useRs2 = inst.rs2 === undefined;
        let floatRd = true;
        let floatRs1 = true;
        if (funct5[0] === '1') {
            // Conditionally decode rd or rs1 as an int register, based on funct7
            if (funct5[3] === '1') {
                floatRs1 = false;
            } else {
                floatRd = false;
            }
        }
        const src1 = decReg(rs1, floatRs1),
                    src2 = decReg(rs2, true),
                    dest = decReg(rd, floatRd);

        // Create fragments
        const useRm = inst.funct3 === undefined;
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
            funct5: new Frag(FRAG.OPC, this.#mne, funct5, FIELDS.r_funct5.name),
            fmt:    new Frag(FRAG.OPC, this.#mne, fmt, FIELDS.r_fp_fmt.name),
            rd:     new Frag(FRAG.RD, dest, rd, FIELDS.rd.name),
            rs1:    new Frag(FRAG.RS1, src1, rs1, FIELDS.rs1.name),
            rs2:    new Frag(FRAG.OPC, src2, rs2, FIELDS.rs2.name),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd'], f['rs1']);
        if (useRs2) {
            f['rs2'].id = FRAG.RS2;
            this.asmFrags.push(f['rs2']);
        }
        if (useRm) {
            f['funct3'].field = FIELDS.r_fp_rm.name;
            const frm = decFrm(funct3);
            // Push frm assembly operand unless using "dyn" dynamic mode
            if (frm !== 'dyn') {
                f['funct3'].id = FRAG.FRM;
                f['funct3'].asm = frm;
                this.asmFrags.push(f['funct3']);
            }
        }

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct5'], f['fmt'], f['rs2'], f['rs1'], f['funct3'], f['rd'],
            f['opcode']);
    }

    /**
     * Decodes JALR instructions
     */
    #decodeJALR() {
        // Get fields
        const fields = extractIFields(this.#bin);
        const imm = fields['imm'],
            rs1 = fields['rs1'],
            funct3 = fields['funct3'],
            rd = fields['rd'];

        this.#mne = 'jalr';

        // Convert fields to string representations
        const base = decReg(rs1),
                    dest = decReg(rd),
                    offset = decImm(imm);

        // Create fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
            rd:     new Frag(FRAG.RD, dest, rd, FIELDS.rd.name),
            rs1:    new Frag(FRAG.RS1, base, rs1, FIELDS.rs1.name, true),
            imm:    new Frag(FRAG.IMM, offset, imm, FIELDS.i_imm_11_0.name),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd'], f['imm'], f['rs1']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['imm'], f['rs1'], f['funct3'], f['rd'], f['opcode']);
    }

    /**
     * Decodes LOAD instructions
     */
    #decodeLOAD() {
        // Get fields
        const fields = extractIFields(this.#bin);
        const imm = fields['imm'],
            rs1 = fields['rs1'],
            funct3 = fields['funct3'],
            rd = fields['rd'];

        // Find instruction
        const floatInst = this.#opcode === OPCODE.LOAD_FP;
        this.#mne = floatInst ? ISA_LOAD_FP[funct3] : ISA_LOAD[funct3];
        if (this.#mne === undefined) {
            throw new OperationError(`Detected LOAD${floatInst ? '-FP' : ''} `
                + 'instruction but invalid funct3 field');
        }

        // Convert fields to string representations
        const base = decReg(rs1),
                    dest = decReg(rd, floatInst),
                    offset = decImm(imm);

        // Create fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
            rd:     new Frag(FRAG.RD, dest, rd, FIELDS.rd.name),
            rs1:    new Frag(FRAG.RS1, base, rs1, FIELDS.rs1.name, true),
            imm:    new Frag(FRAG.IMM, offset, imm, FIELDS.i_imm_11_0.name),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd'], f['imm'], f['rs1']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['imm'], f['rs1'], f['funct3'], f['rd'], f['opcode']);
    }

    /**
     * Decodes OP_IMM instructions
     */
    #decodeOP_IMM() {
        // Get fields
        const fields = extractIFields(this.#bin);
        const imm = fields['imm'],
            rs1 = fields['rs1'],
            funct3 = fields['funct3'],
            rd = fields['rd'];

        // Find instruction - check opcode for RV32I vs RV64I
        let opcodeName;
        const op_imm_32 = this.#opcode === OPCODE.OP_IMM_32;
        const op_imm_64 = this.#opcode === OPCODE.OP_IMM_64;
        if(op_imm_64) {
            // RV128I double-word-sized instructions
            this.#mne = ISA_OP_IMM_64[funct3];
            opcodeName = "OP-IMM-64";
        } else if(op_imm_32) {
            // RV64I word-sized instructions
            this.#mne = ISA_OP_IMM_32[funct3];
            opcodeName = "OP-IMM-32";
        } else {
            // All other OP-IMM instructions
            this.#mne = ISA_OP_IMM[funct3];
            opcodeName = "OP-IMM";
        }
        if (this.#mne === undefined) {
            throw new OperationError(`Detected ${opcodeName} instruction but invalid funct3 field`);
        }

        // Shift instructions
        let shift;
        if (typeof this.#mne !== 'string') {
            // Right shift instructions
            shift = true;
            this.#mne = this.#mne[fields['shtyp']];
        } else {
            // Only other case of immediate shift
            shift = (funct3 === ISA['slli'].funct3);
        }

        // Convert fields to string representations
        const src = decReg(rs1),
                    dest = decReg(rd);

        // Create fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
            rd:     new Frag(FRAG.RD, dest, rd, FIELDS.rd.name),
            rs1:    new Frag(FRAG.RS1, src, rs1, FIELDS.rs1.name),
        };

        if (shift) {
            const shtyp = fields['shtyp'];
            const shamt_6 = fields['shamt_6'];
            const shamt_5 = fields['shamt_5'];
            const shamt_4_0 = fields['shamt'];
            const shamt_5_0 = shamt_5 + shamt_4_0;
            const shamt_6_0 = shamt_6 + shamt_5_0;


            const imm_11_7 = '0' + shtyp + '000';
            const imm_11_6 = imm_11_7 + '0';
            const imm_11_5 = imm_11_6 + '0';

            // Decode shamt
            const shamt = decImm(shamt_6_0, false);

            // Determine shamtWidth (5, 6, or 7 bits) based on opcode, ISA, and value
            // - First, opcode based determination
            // - Then, ISA and value based determination
            let shamtWidth;
            if (op_imm_32) {
                shamtWidth = 5;
            } else if (op_imm_64) {
                shamtWidth = 6;
                this.isa = 'RV128I';  // Set ISA here to avoid assumed ISA of RV64I below
            } else if (this.#config.ISA === COPTS_ISA.RV32I ||
                      (this.#config.ISA === COPTS_ISA.AUTO && shamt_6 === '0' && shamt_5 === '0')) {
                shamtWidth = 5;
            } else if (this.#config.ISA === COPTS_ISA.RV64I || 
                      (this.#config.ISA === COPTS_ISA.AUTO && shamt_6 === '0')) {
                shamtWidth = 6;
            } else {
                shamtWidth = 7;
            }

            // Detect shamt out of range
            if (shamt >= 32 && shamtWidth === 5) {
                throw new OperationError(`Invalid shamt field: ${shamt} (out of range for opcode or ISA config)`);
            } else if (shamt >= 64 && shamtWidth === 6) {
                throw new OperationError(`Invalid shamt field: ${shamt} (out of range for opcode or ISA config)`);
            }

            // Create frags for shamt and shtyp
            if (shamtWidth === 7) {
                // Create frags for 7bit shamt with shtyp
                const shamt_6_0 = shamt_6 + shamt_5 + shamt_4_0;

                // Create frags for shamt and shtyp
                f['imm'] = new Frag(FRAG.IMM, shamt, shamt_6_0, FIELDS.i_shamt_6_0.name);
                f['shift'] = new Frag(FRAG.OPC, this.#mne, imm_11_7, FIELDS.i_shtyp_11_7.name);

                // Set output ISA to RV64I
                this.isa = 'RV128I';

            } else if (shamtWidth === 6) {
                // Create frags for 6bit shamt with shtyp
                const shamt_5_0 = shamt_5 + shamt_4_0;

                // Create frags for shamt and shtyp
                f['imm'] = new Frag(FRAG.IMM, shamt, shamt_5_0, FIELDS.i_shamt_5_0.name);
                f['shift'] = new Frag(FRAG.OPC, this.#mne, imm_11_6, FIELDS.i_shtyp_11_6.name);

                // Set output ISA to RV64I
                this.isa = this.isa ?? 'RV64I';

            } else {
                // Create frags for 5bit shamt with shtyp
                f['imm'] = new Frag(FRAG.IMM, shamt, shamt_4_0, FIELDS.i_shamt.name);
                f['shift'] = new Frag(FRAG.OPC, this.#mne, imm_11_5, FIELDS.i_shtyp_11_5.name);
            }

            // Validate upper bits of immediate field to ensure
            //   they match expected value for shift type
            if((shamtWidth === 5 && imm_11_5 !== imm.substring(0,7))
                    || (shamtWidth === 6 && imm_11_6 !== imm.substring(0,6))
                    || (shamtWidth === 7 && imm_11_7 !== imm.substring(0,5))) {
                throw new OperationError(`Detected ${this.isa} shift immediate instruction but invalid shtyp field`);
            }

            // Binary fragments from MSB to LSB
            this.binFrags.push(f['shift'], f['imm'], f['rs1'],
                f['funct3'], f['rd'], f['opcode']);

        } else {
            const imm = fields['imm'];
            const immediate = decImm(imm);

            f['imm'] = new Frag(FRAG.IMM, immediate, imm, FIELDS.i_imm_11_0.name);

            // Binary fragments from MSB to LSB
            this.binFrags.push(f['imm'], f['rs1'], f['funct3'], f['rd'], f['opcode']);
        }

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd'], f['rs1'], f['imm']);
    }

    /**
     * Decode MISC_MEM instructions
     */
    #decodeMISC_MEM() {
        // Get fields
        const fields = extractIFields(this.#bin);
        const imm = fields['imm'],
            fm = fields['fm'],
            pred = fields['pred'],
            succ = fields['succ'],
            rs1 = fields['rs1'],
            funct3 = fields['funct3'],
            rd = fields['rd'];

        // Find instruction
        this.#mne = ISA_MISC_MEM[funct3];
        if (this.#mne === undefined) {
            throw new OperationError("Detected MISC-MEM instruction but invalid funct3 field");
        }
        // Signals when MISC-MEM used as extended encoding space for load operations
        let loadExt = this.#mne === 'lq';

        // Check registers
        if (!loadExt && (rd !== '00000' || rs1 !== '00000')) {
            throw new OperationError("Registers rd and rs1 should be 0");
        }

        // Create common fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
        };

        // Create specific fragments
        if (loadExt) {
            // Load extension instructions

            // Convert fields to string representations
            const offset = decImm(imm),
                        base = decReg(rs1),
                        dest = decReg(rd);


            f['imm'] = new Frag(FRAG.IMM, offset, imm, FIELDS.i_imm_11_0.name);
            f['rs1'] = new Frag(FRAG.RS1, base, rs1, FIELDS.rs1.name, true);
            f['rd']  = new Frag(FRAG.RD, dest, rd, FIELDS.rd.name);

            // Assembly fragments in order of instruction
            this.asmFrags.push(f['opcode'], f['rd'], f['imm'], f['rs1']);

            // Binary fragments from MSB to LSB
            this.binFrags.push(f['imm'], f['rs1'], f['funct3'], f['rd'], f['opcode']);

        } else if (this.#mne === 'fence') {
            // FENCE instruction

            // Convert fields to string representations
            let predecessor = decMem(pred);
            let successor = decMem(succ);

            f['fm']   = new Frag(FRAG.OPC, this.#mne, fm, FIELDS.i_fm.name);
            f['pred'] = new Frag(FRAG.PRED, predecessor, pred, FIELDS.i_pred.name);
            f['succ'] = new Frag(FRAG.SUCC, successor, succ, FIELDS.i_succ.name);
            f['rd']  = new Frag(FRAG.OPC, this.#mne, rd, FIELDS.rd.name);
            f['rs1'] = new Frag(FRAG.OPC, this.#mne, rs1, FIELDS.rs1.name, loadExt);

            // Assembly fragments in order of instruction
            this.asmFrags.push(f['opcode'], f['pred'], f['succ']);

            // Binary fragments from MSB to LSB
            this.binFrags.push(f['fm'], f['pred'], f['succ'], f['rs1'], f['funct3'],
                f['rd'], f['opcode']);

        } else if (this.#mne === 'fence.i') {
            // FENCE.I instruction

            f['imm'] = new Frag(FRAG.UNSD, this.#mne, imm, FIELDS.i_imm_11_0.name);
            f['rs1'] = new Frag(FRAG.UNSD, this.#mne, rs1, FIELDS.rs1.name);
            f['rd']  = new Frag(FRAG.UNSD, this.#mne, rd, FIELDS.rd.name);

            // Assembly fragments in order of instruction
            this.asmFrags.push(f['opcode']);

            // Binary fragments from MSB to LSB
            this.binFrags.push(f['imm'], f['rs1'], f['funct3'], f['rd'], f['opcode']);
        }
    }

    /**
     * Decode SYSTEM instructions
     */
    #decodeSYSTEM() {
        // Get fields
        const fields = extractIFields(this.#bin);
        const funct12 = fields['imm'],
            rs1 = fields['rs1'],
            funct3 = fields['funct3'],
            rd = fields['rd'];

        // Find instruction
        this.#mne = ISA_SYSTEM[funct3];
        if (this.#mne === undefined) {
            throw new OperationError("Detected SYSTEM instruction but invalid funct3 field");
        }

        // Trap instructions - determine mnemonic from funct12
        let trap = (typeof this.#mne !== 'string');
        if (trap) {
            this.#mne = this.#mne[funct12];
            if (this.#mne === undefined) {
                throw new OperationError("Detected SYSTEM instruction but invalid funct12 field");
            }
            // Check registers
            if (rd !== '00000' || rs1 !== '00000') {
                throw new OperationError("Registers rd and rs1 should be 0 for mne " + this.#mne);
            }
        }

        // Create common fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
        };

        // Trap instructions - create specific fragments and render
        if (trap) {
            // Create remaining fragments
            f['rd'] = new Frag(FRAG.OPC, this.#mne, rd, FIELDS.rd.name);
            f['rs1'] = new Frag(FRAG.OPC, this.#mne, rs1, FIELDS.rs1.name);
            f['funct12'] = new Frag(FRAG.OPC, this.#mne, funct12, FIELDS.i_funct12.name);

            // Assembly fragments in order of instruction
            this.asmFrags.push(f['opcode']);

            // Binary fragments from MSB to LSB
            this.binFrags.push(f['funct12'], f['rs1'], f['funct3'], f['rd'],
                f['opcode']);

        } else {
            // Zicsr instructions

            // Alias already extracted field for clarity
            const csrBin = funct12;

            // Convert fields to string types
            const dest = decReg(rd),
                        csr = decCSR(csrBin);

            // Convert rs1 to register or immediate
            //   based off high bit of funct3 (0:reg, 1:imm)
            let src, srcFieldName;
            if (funct3[0] === '0') {
                src = decReg(rs1);
                srcFieldName = FIELDS.rs1.name;
            } else {
                src = decImm(rs1, false);
                srcFieldName = FIELDS.i_imm_4_0.name;
            }

            // Create remaining fragments
            f['rd'] = new Frag(FRAG.RD, dest, rd, FIELDS.rd.name);
            f['csr'] = new Frag(FRAG.CSR, csr, csrBin, FIELDS.i_csr.name);
            f['rs1'] = new Frag(FRAG.RS1, src, rs1, srcFieldName);

            // Assembly fragments in order of instruction
            this.asmFrags.push(f['opcode'], f['rd'], f['csr'], f['rs1']);

            // Binary fragments from MSB to LSB
            this.binFrags.push(f['csr'], f['rs1'], f['funct3'], f['rd'],
                f['opcode']);
        }
    }

    /**
     * Decodes STORE instruction
     */
    #decodeSTORE() {
        // Get fields
        const fields = extractSFields(this.#bin);
        const imm_11_5 = fields['imm_11_5'],
            rs2 = fields['rs2'],
            rs1 = fields['rs1'],
            funct3 = fields['funct3'],
            imm_4_0 = fields['imm_4_0'],
            imm = imm_11_5 + imm_4_0;

        // Find instruction
        const floatInst = this.#opcode === OPCODE.STORE_FP;
        this.#mne = floatInst ? ISA_STORE_FP[funct3] : ISA_STORE[funct3];
        if (this.#mne === undefined) {
            throw new OperationError(`Detected STORE${floatInst ? '-FP' : ''} `
                + 'instruction but invalid funct3 field');
        }

        // Convert fields to string representations
        const offset = decImm(imm);
        const base = decReg(rs1);
        const src = decReg(rs2, floatInst);

        // Create common fragments
        const f = {
            opcode:   new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            funct3:   new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
            rs1:      new Frag(FRAG.RS1, base, rs1, FIELDS.rs1.name, true),
            rs2:      new Frag(FRAG.RS2, src, rs2, FIELDS.rs2.name),
            imm_4_0:  new Frag(FRAG.IMM, offset, imm_4_0, FIELDS.s_imm_4_0.name),
            imm_11_5: new Frag(FRAG.IMM, offset, imm_11_5, FIELDS.s_imm_11_5.name),
            imm:      new Frag(FRAG.IMM, offset, imm, 'imm'),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rs2'], f['imm'], f['rs1']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['imm_11_5'], f['rs2'], f['rs1'], f['funct3'],
            f['imm_4_0'], f['opcode']);
    }

    /**
     * Decodes BRANCH instruction
     */
    #decodeBRANCH() {
        // Get fields
        const fields = extractBFields(this.#bin);
        const imm_12 = fields['imm_12'],
            imm_10_5 = fields['imm_10_5'],
            rs2 = fields['rs2'],
            rs1 = fields['rs1'],
            funct3 = fields['funct3'],
            imm_4_1 = fields['imm_4_1'],
            imm_11 = fields['imm_11'];

        // Reconstitute immediate
        const imm = imm_12 + imm_11 + imm_10_5 + imm_4_1 + '0';

        // Find instruction
        this.#mne = ISA_BRANCH[funct3];
        if (this.#mne === undefined) {
            throw new OperationError("Detected BRANCH instruction but invalid funct3 field");
        }

        // Convert fields to string representations
        const offset = decImm(imm),
                    src2 = decReg(rs2),
                    src1 = decReg(rs1);

        // Create fragments
        const f = {
            opcode:   new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            funct3:   new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
            rs1:      new Frag(FRAG.RS1, src1, rs1, FIELDS.rs1.name),
            rs2:      new Frag(FRAG.RS2, src2, rs2, FIELDS.rs2.name),
            imm_12:   new Frag(FRAG.IMM, offset, imm_12, FIELDS.b_imm_12.name),
            imm_11:   new Frag(FRAG.IMM, offset, imm_11, FIELDS.b_imm_11.name),
            imm_10_5: new Frag(FRAG.IMM, offset, imm_10_5, FIELDS.b_imm_10_5.name),
            imm_4_1:  new Frag(FRAG.IMM, offset, imm_4_1, FIELDS.b_imm_4_1.name),
            imm:      new Frag(FRAG.IMM, offset, imm, 'imm'),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rs1'], f['rs2'], f['imm']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['imm_12'], f['imm_10_5'], f['rs2'], f['rs1'],
            f['funct3'], f['imm_4_1'], f['imm_11'], f['opcode']);
    }

    /**
     * Decodes U-type instruction
     */
    #decodeUType() {
        // Get fields
        const imm_31_12 = getBits(this.#bin, FIELDS.u_imm_31_12.pos);
        const rd = getBits(this.#bin, FIELDS.rd.pos);

        // Construct full 32-bit immediate value
        // - Upper 20 bits of encoded as immediate field in instruction
        // - Lower 12 bits set to 0
        const imm = imm_31_12 + ''.padStart(12, '0');

        // Convert fields to string representations
        const immediate = decImm(imm_31_12), dest = decReg(rd);

        // Determine operation
        this.#mne = (this.#opcode === OPCODE.AUIPC) ? 'auipc' : 'lui';

        // Create fragments
        const f = {
            opcode:     new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            rd:         new Frag(FRAG.RD, dest, rd, FIELDS.rd.name),
            imm_31_12:  new Frag(FRAG.IMM, immediate, imm_31_12, FIELDS.u_imm_31_12.name),
            imm:        new Frag(FRAG.IMM, immediate, imm, FIELDS.u_imm_31_12.name),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd'], f['imm']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['imm_31_12'], f['rd'], f['opcode']);
    }

    /**
     * Decodes JAL instruction
     */
    #decodeJAL() {
        // Get fields
        const imm_20 = getBits(this.#bin, FIELDS.j_imm_20.pos);
        const imm_10_1 = getBits(this.#bin, FIELDS.j_imm_10_1.pos);
        const imm_11 = getBits(this.#bin, FIELDS.j_imm_11.pos);
        const imm_19_12 = getBits(this.#bin, FIELDS.j_imm_19_12.pos);
        const rd = getBits(this.#bin, FIELDS.rd.pos);

        // Reconstitute immediate
        const imm = imm_20 + imm_19_12 + imm_11 + imm_10_1 + '0';

        this.#mne = 'jal';

        // Convert fields to string representations
        const offset = decImm(imm);
        const dest = decReg(rd);

        // Create fragments
        const f = {
            opcode:     new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            rd:         new Frag(FRAG.RD, dest, rd, FIELDS.rd.name),
            imm_20:     new Frag(FRAG.IMM, offset, imm_20, FIELDS.j_imm_20.name),
            imm_10_1:   new Frag(FRAG.IMM, offset, imm_10_1, FIELDS.j_imm_10_1.name),
            imm_11:     new Frag(FRAG.IMM, offset, imm_11, FIELDS.j_imm_11.name),
            imm_19_12:  new Frag(FRAG.IMM, offset, imm_19_12, FIELDS.j_imm_19_12.name),
            imm:        new Frag(FRAG.IMM, offset, imm, 'imm'),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd'], f['imm']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['imm_20'], f['imm_10_1'], f['imm_11'], f['imm_19_12'],
            f['rd'], f['opcode']);
    }

    /**
     * Decodes AMO instruction
     */
    #decodeAMO() {
        // Get fields
        const fields = extractRFields(this.#bin);
        const funct5 = fields['funct5'],
            aq = fields['aq'],
            rl = fields['rl'],
            rs2 = fields['rs2'],
            rs1 = fields['rs1'],
            funct3 = fields['funct3'],
            rd = fields['rd'];

        // Find instruction
        this.#mne = ISA_AMO[funct5+funct3];
        if (this.#mne === undefined) {
            throw new OperationError("Detected AMO instruction but invalid funct5 and funct3 fields");
        }

        // Check if 'lr' instruction
        const lr = /^lr\./.test(this.#mne);

        // Convert fields to string representations
        const dest = decReg(rd);
        const addr = decReg(rs1);
        const src  = lr ? 'n/a' : decReg(rs2);

        // Create fragments
        const f = {
            opcode:   new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            rd:       new Frag(FRAG.RD, dest, rd, FIELDS.rd.name),
            funct3:   new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.funct3.name),
            rs1:      new Frag(FRAG.RS1, addr, rs1, FIELDS.rs1.name, true),
            rs2:      new Frag(FRAG.OPC, src, rs2, FIELDS.rs2.name),
            rl:       new Frag(FRAG.OPC, this.#mne, rl, FIELDS.r_rl.name),
            aq:       new Frag(FRAG.OPC, this.#mne, aq, FIELDS.r_aq.name),
            funct5:   new Frag(FRAG.OPC, this.#mne, funct5, FIELDS.r_funct5.name),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd']);
        if (!lr) {
            f['rs2'].id = FRAG.RS2;
            this.asmFrags.push(f['rs2']);
        }
        this.asmFrags.push(f['rs1']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct5'], f['aq'], f['rl'], f['rs2'],
            f['rs1'], f['funct3'], f['rd'], f['opcode']);
    }

    /**
     * Decodes R4 instructions
     */
    #decodeR4() {
        // Get each field
        const fields = extractRFields(this.#bin);
        const rs3 = fields['funct5'],
            fmt = fields['fmt'],
            rs2 = fields['rs2'],
            rs1 = fields['rs1'],
            funct3 = fields['funct3'],
            rd = fields['rd'];

        // Find instruction
        switch (this.#opcode) {
            case OPCODE.MADD:
                this.#mne = ISA_MADD[fmt];
                break;
            case OPCODE.MSUB:
                this.#mne = ISA_MSUB[fmt];
                break;
            case OPCODE.NMADD:
                this.#mne = ISA_NMADD[fmt];
                break;
            case OPCODE.NMSUB:
                this.#mne = ISA_NMSUB[fmt];
                break;
        }
        if (this.#mne === undefined) {
            throw new OperationError(`Detected fused multiply-add instruction but invalid fmt field`);
        }

        // Convert fields to string representations
        const src1 = decReg(rs1, true),
                    src2 = decReg(rs2, true),
                    src3 = decReg(rs3, true),
                    frm  = decFrm(funct3),
                    dest = decReg(rd, true);

        // Create fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.opcode.name),
            fmt:    new Frag(FRAG.OPC, this.#mne, fmt, FIELDS.r_fp_fmt.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.r_fp_rm.name),
            rd:     new Frag(FRAG.RD, dest, rd, FIELDS.rd.name),
            rs1:    new Frag(FRAG.RS1, src1, rs1, FIELDS.rs1.name),
            rs2:    new Frag(FRAG.RS2, src2, rs2, FIELDS.rs2.name),
            rs3:    new Frag(FRAG.RS3, src3, rs3, 'rs3'),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd'], f['rs1'], f['rs2'], f['rs3']);
        if (frm !== 'dyn') {
            f['funct3'].id = FRAG.FRM;
            f['funct3'].asm = frm;
            this.asmFrags.push(f['funct3']);
        }      

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['rs3'], f['fmt'], f['rs2'], f['rs1'], f['funct3'],
            f['rd'], f['opcode']);
    }

    /**
     * Looks up C0 instruction mnemonics
     */
    #mneLookupC0() {
        // Get fields required for mne lookup
        const fields = extractCLookupFields(this.#bin);

        // C0 Instruction order of lookup
        // - funct3
        // - xlen
        this.#mne = ISA_C0[fields['funct3']];
        if (typeof this.#mne === 'object') {
            this.#mne = this.#mne[this.#xlens] ?? this.#mne[XLEN_MASK.all];
        }

        // Find and return instruction
        return ISA[this.#mne];
    }

    /**
     * Looks up C1 instruction mnemonics
     */
    #mneLookupC1() {
        // Get fields required for mne lookup
        const fields = extractCLookupFields(this.#bin);

        // C1 Instruction order of lookup
        // - funct3
        // - xlen
        // - rdRs1Val
        // - funct2_cb
        // - funct6[3]+funct2
        this.#mne = ISA_C1[fields['funct3']];
        if (typeof this.#mne === 'object') {
            this.#mne = this.#mne[this.#xlens] ?? this.#mne[XLEN_MASK.all];
            if (typeof this.#mne === 'object') {
                const rdRs1Val = decImm(fields['rd_rs1'], false);
                this.#mne = this.#mne[rdRs1Val] ?? this.#mne['default'];
                if (typeof this.#mne === 'object') {
                    this.#mne = this.#mne[fields['funct2_cb']];
                    if (typeof this.#mne === 'object') {
                        this.#mne = this.#mne[fields['funct6'][3] + fields['funct2']];
                    }
                }
            }
        }

        // Find and return instruction
        return ISA[this.#mne];
    }

    /**
     * Looks up C2 instruction mnemonics
     */
    #mneLookupC2() {
        // Get fields required for mne lookup
        const fields = extractCLookupFields(this.#bin);

        // C2 Instruction order of lookup
        // - funct3
        // - xlen
        // - funct4[3]
        // - rs2Val
        // - rdRs1Val
        this.#mne = ISA_C2[fields['funct3']];
        if (typeof this.#mne === 'object') {
            this.#mne = this.#mne[this.#xlens] ?? this.#mne[XLEN_MASK.all];
            if (typeof this.#mne === 'object') {
                this.#mne = this.#mne[fields['funct4'][3]];
                if (typeof this.#mne === 'object') {
                    const rs2Val = decImm(fields['rs2'], false);
                    this.#mne = this.#mne[rs2Val] ?? this.#mne['default'];
                    if (typeof this.#mne === 'object') {
                        const rdRs1Val = decImm(fields['rd_rs1'], false);
                        this.#mne = this.#mne[rdRs1Val] ?? this.#mne['default'];
                    }
                }
            }
        }

        // Find and return instruction
        return ISA[this.#mne];
    }

    /**
     * Decodes CR-type instruction
     */
    #decodeCR(inst) {
        // Get fields
        const funct4 = getBits(this.#bin, FIELDS.c_funct4.pos);
        const rdRs1  = getBits(this.#bin, FIELDS.c_rd_rs1.pos);
        const rs2    = getBits(this.#bin, FIELDS.c_rs2.pos);
        const opcode = getBits(this.#bin, FIELDS.c_opcode.pos);

        // Convert fields to string representations
        const destSrc1 = decReg(rdRs1);
        const src2     = decReg(rs2);

        // Validate operands
        const destSrc1Val = decImm(rdRs1, false);
        if (inst.rdRs1Excl?.includes(destSrc1Val)) {
            throw new OperationError(`Detected ${this.#mne} instruction, but illegal value "${destSrc1}" in rd/rs1 field`);
        }
        const src2Val = decImm(rs2, false);
        if (inst.rs2Excl?.includes(src2Val)) {
            throw new OperationError(`Detected ${this.#mne} instruction, but illegal value "${src2}" in rs2 field`);
        }

        // Determine name for destSrc1
        let destSrc1Name;
        switch (inst.rdRs1Mask) {
            case 0b01:
                destSrc1Name = FIELDS.c_rs1.name;
                break;
            case 0b10:
                destSrc1Name = FIELDS.c_rd.name;
                break;
            default:
                destSrc1Name = FIELDS.c_rd_rs1.name;
        }
        if (inst.rdRs1Excl !== undefined) {
            destSrc1Name += '≠' + regExclToString(inst.rdRs1Excl);
        }

        // Determine name for src2
        let src2Name = FIELDS.c_rs2.name;
        if (inst.rs2Excl !== undefined) {
            src2Name += '≠' + regExclToString(inst.rs2Excl);
        }

        // Create fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.c_opcode.name),
            funct4: new Frag(FRAG.OPC, this.#mne, funct4, FIELDS.c_funct4.name),
        };

        // Create custom fragments
        const dynamicRdRs1 = inst.rdRs1Val === undefined;
        if (dynamicRdRs1) {
            f['rd_rs1'] = new Frag(FRAG.RD, destSrc1, rdRs1, destSrc1Name);
        } else {
            f['rd_rs1'] = new Frag(FRAG.OPC, this.#mne, rdRs1, 'static-' + destSrc1Name);
        }
        const dynamicRs2 = inst.rs2Val === undefined;
        if (dynamicRs2) {
            f['rs2'] = new Frag(FRAG.RS2, src2, rs2, src2Name);
        } else {
            f['rs2'] = new Frag(FRAG.OPC, this.#mne, rs2, 'static-' + src2Name);
        }

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode']);
        if (dynamicRdRs1) {
            this.asmFrags.push(f['rd_rs1']);
            if (dynamicRs2) {
                this.asmFrags.push(f['rs2']);
            }
        }

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct4'], f['rd_rs1'], f['rs2'], f['opcode']);
    }

    /**
     * Decodes CI-type instruction
     */
    #decodeCI(inst) {
        // Get fields
        const funct3 = getBits(this.#bin, FIELDS.c_funct3.pos);
        const imm0   = getBits(this.#bin, FIELDS.c_imm_ci_0.pos);
        const rdRs1  = getBits(this.#bin, FIELDS.c_rd_rs1.pos);
        const imm1   = getBits(this.#bin, FIELDS.c_imm_ci_1.pos);
        const opcode = getBits(this.#bin, FIELDS.c_opcode.pos);

        // Determine instruction type, for special cases
        const shiftInst = /^c\.slli/.test(this.#mne);

        // Check if floating-point load instruction
        const floatRdRs1 = /^c\.fl/.test(this.#mne);

        // Convert fields to string representations
        const destSrc1 = decReg(rdRs1, floatRdRs1);
        const immVal = decImmBits([imm0, imm1], inst.immBits, inst.uimm);

        // Perform shift-specific special cases
        if (shiftInst) {
            if (immVal === 0) {
                // Determine if shift is a shift64 function
                this.#mne += '64';
                inst = ISA[this.#mne];
                if (inst === undefined) {
                    throw new OperationError(`Internal error when converting shift-immediate instruction into ${this.#mne}`);
                }
                // Overwrite ISA
                this.isa = 'RV128' + inst.isa;

            } else if (imm0 === '1' && /^RV32/.test(this.isa)) {
                // Force RV32C -> RV64C isa if imm[5] is set (shamt > 31)
                this.isa = 'RV64' + inst.isa;
            }
        }

        // Validate operand values
        const destSrc1Val = decImm(rdRs1, false);
        if (inst.rdRs1Excl?.includes(destSrc1Val)) {
            throw new OperationError(`Detected ${this.#mne} instruction, but illegal value "${destSrc1}" in rd/rs1 field`);
        }
        if (inst.nzimm && immVal === 0) {
            throw new OperationError(`Detected ${this.#mne}, but instruction expects non-zero immediate value (encoding reserved)`);
        }

        // Determine name for destSrc1
        let destSrc1Name;
        switch (inst.rdRs1Mask) {
            case 0b01:
                destSrc1Name = FIELDS.c_rs1.name;
                break;
            case 0b10:
                destSrc1Name = FIELDS.c_rd.name;
                break;
            default:
                destSrc1Name = FIELDS.c_rd_rs1.name;
        }
        if (inst.rdRs1Excl !== undefined) {
            destSrc1Name += '≠' + regExclToString(inst.rdRs1Excl);
        }

        // Determine name for immediate
        let immName = '';
        if (!shiftInst) {
            if (inst.nzimm) {
                immName += 'nz';
            }
            if (inst.uimm) {
                immName += 'u';
            }
        }
        immName += shiftInst
            ? FIELDS.c_shamt_0.name
            : FIELDS.c_imm_ci_0.name;

        // Create common fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.c_opcode.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.c_funct3.name),
        };

        // Create and append custom register fragments
        const dynamicRdRs1 = inst.rdRs1Val === undefined;
        if (dynamicRdRs1) {
            f['rd_rs1'] = new Frag(FRAG.RD, destSrc1, rdRs1, destSrc1Name);
        } else {
            f['rd_rs1'] = new Frag(FRAG.OPC, this.#mne, rdRs1, 'static-' + destSrc1Name);
        }

        // Create and append custom immediate fragments
        const immBitsLabels = inst.immBitsLabels ?? inst.immBits;
        const dynamicImm = inst.immVal === undefined;
        if (dynamicImm) {
            f['imm0'] = new Frag(FRAG.IMM, immVal, imm0, immName + immBitsToString(immBitsLabels[0]));
            f['imm1'] = new Frag(FRAG.IMM, immVal, imm1, immName + immBitsToString(immBitsLabels[1]));
        } else {
            f['imm0'] = new Frag(FRAG.OPC, this.#mne, imm0, 'static-' + immName + immBitsToString(immBitsLabels[0]));
            f['imm1'] = new Frag(FRAG.OPC, this.#mne, imm1, 'static-' + immName + immBitsToString(immBitsLabels[1]));
        }

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode']);
        if (dynamicRdRs1) {
            this.asmFrags.push(f['rd_rs1']);
        }
        if (dynamicImm) {
            this.asmFrags.push(f['imm0']);
        }

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct3'], f['imm0'], f['rd_rs1'], f['imm1'], f['opcode']);
    }

    /**
     * Decodes CSS-type instruction
     */
    #decodeCSS(inst) {
        // Get fields
        const funct3 = getBits(this.#bin, FIELDS.c_funct3.pos);
        const imm    = getBits(this.#bin, FIELDS.c_imm_css.pos);
        const rs2    = getBits(this.#bin, FIELDS.c_rs2.pos);

        // Determine name for immediate
        let immName = '';
        if (inst.uimm) {
            immName += 'u';
        }
        immName += FIELDS.c_imm_css.name;

        // Check if floating-point load instruction
        const floatRs2 = /^c\.f/.test(this.#mne);

        // Convert fields to string representations
        const offset = decImmBits(imm, inst.immBits, inst.uimm);
        const src = decReg(rs2, floatRs2);

        // Create fragments
        const f = {
            opcode: new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.c_opcode.name),
            funct3: new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.c_funct3.name),
            rs2:    new Frag(FRAG.RS2, src, rs2, FIELDS.c_rs2.name),
            imm: new Frag(FRAG.IMM, offset, imm, immName + immBitsToString(inst.immBits)),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rs2'], f['imm']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct3'], f['imm'], f['rs2'], f['opcode']);
    }

    /**
     * Decodes CIW-type instruction
     */
    #decodeCIW(inst) {
        // Get fields
        const funct3   = getBits(this.#bin, FIELDS.c_funct3.pos);
        const imm      = getBits(this.#bin, FIELDS.c_imm_ciw.pos);
        const rdPrime  = getBits(this.#bin, FIELDS.c_rd_prime.pos);
        const opcode   = getBits(this.#bin, FIELDS.c_opcode.pos);

        // Determine name for immediate
        let immName = '';
        if (inst.nzimm) {
            immName += 'nz';
        }
        if (inst.uimm) {
            immName += 'u';
        }
        immName += FIELDS.c_imm_ciw.name;

        // Prepend bits to compressed register fields
        const rd  = '01' + rdPrime;

        // Convert fields to string representations
        const dest   = decReg(rd);
        const immVal = decImmBits(imm, inst.immBits, inst.uimm);

        // Validate operand values
        if (inst.nzimm && immVal === 0) {
            throw new OperationError(`Detected ${this.#mne}, but instruction expects non-zero immediate value (encoding reserved)`);
        }

        // Create fragments
        const f = {
            opcode:   new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.c_opcode.name),
            funct3:   new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.c_funct3.name),
            rd_prime: new Frag(FRAG.RD, dest, rdPrime, FIELDS.c_rd_prime.name),
            imm: new Frag(FRAG.IMM, immVal, imm, immName + immBitsToString(inst.immBits)),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd_prime'], f['imm']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct3'], f['imm'], f['rd_prime'], f['opcode']);
    }

    /**
     * Decodes CL-type instruction
     */
    #decodeCL(inst) {
        // Get fields
        const funct3   = getBits(this.#bin, FIELDS.c_funct3.pos);
        const imm0     = getBits(this.#bin, FIELDS.c_imm_cl_0.pos);
        const rs1Prime = getBits(this.#bin, FIELDS.c_rs1_prime.pos);
        const imm1     = getBits(this.#bin, FIELDS.c_imm_cl_1.pos);
        const rdPrime  = getBits(this.#bin, FIELDS.c_rd_prime.pos);
        const opcode   = getBits(this.#bin, FIELDS.c_opcode.pos);

        // Determine name for immediate
        let immName = '';
        if (inst.uimm) {
            immName += 'u';
        }
        immName += FIELDS.c_imm_cl_0.name;

        // Check if floating-point load instruction
        const floatRd = /^c\.f/.test(this.#mne);

        // Prepend bits to compressed register fields
        const rs1 = '01' + rs1Prime;
        const rd  = '01' + rdPrime;

        // Convert fields to string representations
        const dest   = decReg(rd, floatRd);
        const offset = decImmBits([imm0, imm1], inst.immBits, inst.uimm);
        const base   = decReg(rs1);

        // Create fragments
        const f = {
            opcode:    new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.c_opcode.name),
            funct3:    new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.c_funct3.name),
            rd_prime:  new Frag(FRAG.RD, dest, rdPrime, FIELDS.c_rd_prime.name),
            rs1_prime: new Frag(FRAG.RS1, base, rs1Prime, FIELDS.c_rs1_prime.name, true),
            imm0: new Frag(FRAG.IMM, offset, imm0, immName + immBitsToString(inst.immBits[0])),
            imm1: new Frag(FRAG.IMM, offset, imm1, immName + immBitsToString(inst.immBits[1])),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd_prime'], f['imm0'], f['rs1_prime']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct3'], f['imm0'], f['rs1_prime'],
            f['imm1'], f['rd_prime'], f['opcode']);
    }

    /**
     * Decodes CS-type instruction
     */
    #decodeCS(inst) {
        // Get fields
        const funct3   = getBits(this.#bin, FIELDS.c_funct3.pos);
        const imm0     = getBits(this.#bin, FIELDS.c_imm_cl_0.pos);
        const rs1Prime = getBits(this.#bin, FIELDS.c_rs1_prime.pos);
        const imm1     = getBits(this.#bin, FIELDS.c_imm_cl_1.pos);
        const rs2Prime = getBits(this.#bin, FIELDS.c_rs2_prime.pos);
        const opcode   = getBits(this.#bin, FIELDS.c_opcode.pos);

        // Determine name for immediate
        let immName = '';
        if (inst.uimm) {
            immName += 'u';
        }
        immName += FIELDS.c_imm_cs_0.name;

        // Check if floating-point load instruction
        const floatRs2 = /^c\.f/.test(this.#mne);

        // Prepend bits to compressed register fields
        const rs1 = '01' + rs1Prime;
        const rs2 = '01' + rs2Prime;

        // Convert fields to string representations
        const src    = decReg(rs2, floatRs2);
        const offset = decImmBits([imm0, imm1], inst.immBits, inst.uimm);
        const base   = decReg(rs1);

        // Create fragments
        const f = {
            opcode:    new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.c_opcode.name),
            funct3:    new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.c_funct3.name),
            rs2_prime: new Frag(FRAG.RS2, src, rs2Prime, FIELDS.c_rs2_prime.name),
            rs1_prime: new Frag(FRAG.RS1, base, rs1Prime, FIELDS.c_rs1_prime.name, true),
            imm0: new Frag(FRAG.IMM, offset, imm0, immName + immBitsToString(inst.immBits[0])),
            imm1: new Frag(FRAG.IMM, offset, imm1, immName + immBitsToString(inst.immBits[1])),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rs2_prime'], f['imm0'], f['rs1_prime']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct3'], f['imm0'], f['rs1_prime'],
            f['imm1'], f['rs2_prime'], f['opcode']);
    }

    /**
     * Decodes CA-type instruction
     */
    #decodeCA() {
        // Get fields
        const funct6     = getBits(this.#bin, FIELDS.c_funct6.pos);
        const rdRs1Prime = getBits(this.#bin, FIELDS.c_rd_rs1_prime.pos);
        const funct2     = getBits(this.#bin, FIELDS.c_funct2.pos);
        const rs2Prime   = getBits(this.#bin, FIELDS.c_rs2_prime.pos);
        const opcode     = getBits(this.#bin, FIELDS.c_opcode.pos);

        // Prepend bits to compressed register fields
        const rdRs1 = '01' + rdRs1Prime;
        const rs2   = '01' + rs2Prime;

        // Convert fields to string representations
        const destSrc1 = decReg(rdRs1);
        const src2     = decReg(rs2);

        // Create fragments
        const f = {
            opcode:       new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.c_opcode.name),
            funct6:       new Frag(FRAG.OPC, this.#mne, funct6, FIELDS.c_funct6.name),
            funct2:       new Frag(FRAG.OPC, this.#mne, funct2, FIELDS.c_funct2.name),
            rd_rs1_prime: new Frag(FRAG.RD, destSrc1, rdRs1Prime, FIELDS.c_rs2_prime.name),
            rs2_prime:    new Frag(FRAG.RS2, src2, rs2Prime, FIELDS.c_rs1_prime.name),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['rd_rs1_prime'], f['rs2_prime']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct6'], f['rd_rs1_prime'],
            f['funct2'], f['rs2_prime'], f['opcode']);
    }

    /**
     * Decodes CB-type instruction
     */
    #decodeCB(inst) {
        // Get fields
        const funct3     = getBits(this.#bin, FIELDS.c_funct3.pos);
        const imm0       = getBits(this.#bin, FIELDS.c_imm_cb_0.pos);
        const shamt0     = getBits(this.#bin, FIELDS.c_shamt_0.pos);
        const funct2     = getBits(this.#bin, FIELDS.c_funct2_cb.pos);
        const rdRs1Prime = getBits(this.#bin, FIELDS.c_rd_rs1_prime.pos);
        const imm1       = getBits(this.#bin, FIELDS.c_imm_cb_1.pos);
        const shamt1     = getBits(this.#bin, FIELDS.c_shamt_1.pos);
        const opcode     = getBits(this.#bin, FIELDS.c_opcode.pos);

        // Determine instruction type, for special cases
        const branchInst = /^c\.b/.test(this.#mne);
        const shiftInst = /^c\.sr[la]i/.test(this.#mne);

        // Prepend bits to compressed register fields
        const rdRs1 = '01' + rdRs1Prime;

        // Convert fields to string representations
        const destSrc1 = decReg(rdRs1);
        const immVal = decImmBits([imm0, imm1], inst.immBits, inst.uimm);

        // Perform shift-specific special cases
        if (shiftInst) {
            if (immVal === 0) {
                // Determine if shift is a shift64 function
                this.#mne += '64';
                inst = ISA[this.#mne];
                if (inst === undefined) {
                    throw new OperationError(`Internal error when converting shift-immediate instruction into ${this.#mne}`);
                }
                // Overwrite ISA
                this.isa = 'RV128' + inst.isa;

            } else if (shamt0 === '1' && /^RV32/.test(this.isa)) {
                // Force RV32C -> RV64C isa if imm[5] is set (shamt > 31)
                this.isa = 'RV64' + inst.isa;
            }
        }

        // Validate operand values
        if (inst.nzimm && immVal === 0) {
            throw new OperationError(`Detected ${this.#mne}, but instruction expects non-zero immediate value (encoding reserved)`);
        }

        // Determine name for immediate
        let immName = '';
        if (!shiftInst) {
            if (inst.nzimm) {
                immName += 'nz';
            }
            if (inst.uimm) {
                immName += 'u';
            }
        }
        immName += shiftInst
            ? FIELDS.c_shamt_0.name
            : (branchInst ? FIELDS.c_imm_cb_0.name : FIELDS.c_imm_ci_0.name);

        // Create common fragments
        const f = {
            opcode:       new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.c_opcode.name),
            funct3:       new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.c_funct3.name),
            funct2:       new Frag(FRAG.OPC, this.#mne, funct2, FIELDS.c_funct2.name),
            rd_rs1_prime: new Frag(FRAG.RD, destSrc1, rdRs1Prime, FIELDS.c_rs2_prime.name),
        };

        // Create custom fragments and build fragment arrays
        if (branchInst) {
            // Shift instruction, use shamt and funct2
            f['imm0'] = new Frag(FRAG.IMM, immVal, imm0, immName + immBitsToString(inst.immBits[0]));
            f['imm1'] = new Frag(FRAG.IMM, immVal, imm1, immName + immBitsToString(inst.immBits[1]));

            // Assembly fragments in order of instruction
            this.asmFrags.push(f['opcode'], f['rd_rs1_prime'], f['imm0']);
            // Binary fragments from MSB to LSB
            this.binFrags.push(f['funct3'], f['imm0'], f['rd_rs1_prime'], f['imm1'], f['opcode']);

        } else {
            // Shift instruction and `c.andi`, use shamt and funct2
            const dynamicImm = inst.immVal === undefined;
            if (dynamicImm) {
                f['imm0'] = new Frag(FRAG.IMM, immVal, shamt0, immName + immBitsToString(inst.immBits[0]));
                f['imm1'] = new Frag(FRAG.IMM, immVal, shamt1, immName + immBitsToString(inst.immBits[1]));
            } else {
                f['imm0'] = new Frag(FRAG.OPC, this.#mne, shamt0, 'static-' + immName + immBitsToString(inst.immBits[0]));
                f['imm1'] = new Frag(FRAG.OPC, this.#mne, shamt1, 'static-' + immName + immBitsToString(inst.immBits[1]));
            }

            // Assembly fragments in order of instruction
            this.asmFrags.push(f['opcode'], f['rd_rs1_prime']);
            if (dynamicImm) {
                this.asmFrags.push(f['imm0']);
            }
            // Binary fragments from MSB to LSB
            this.binFrags.push(f['funct3'], f['imm0'], f['funct2'], f['rd_rs1_prime'], f['imm1'], f['opcode']);
        }
    }

    /**
     * Decodes CJ-type instruction
     */
    #decodeCJ(inst) {
        // Get fields
        const funct3 = getBits(this.#bin, FIELDS.c_funct3.pos);
        const imm    = getBits(this.#bin, FIELDS.c_imm_cj.pos);
        const opcode = getBits(this.#bin, FIELDS.c_opcode.pos);

        // Convert fields to string representations
        const jumpTarget = decImmBits(imm, inst.immBits);

        // Create fragments
        const f = {
            opcode:   new Frag(FRAG.OPC, this.#mne, this.#opcode, FIELDS.c_opcode.name),
            funct3:   new Frag(FRAG.OPC, this.#mne, funct3, FIELDS.c_funct3.name),
            imm: new Frag(FRAG.IMM, jumpTarget, imm, FIELDS.c_imm_cj.name + immBitsToString(inst.immBits)),
        };

        // Assembly fragments in order of instruction
        this.asmFrags.push(f['opcode'], f['imm']);

        // Binary fragments from MSB to LSB
        this.binFrags.push(f['funct3'], f['imm'], f['opcode']);
    }
}

// Extract R-types fields from instruction
function extractRFields(binary) {
    return {
        'rs2': getBits(binary, FIELDS.rs2.pos),
        'rs1': getBits(binary, FIELDS.rs1.pos),
        'funct3': getBits(binary, FIELDS.funct3.pos),
        'rd': getBits(binary, FIELDS.rd.pos),
        'funct5': getBits(binary, FIELDS.r_funct5.pos),
        'funct7': getBits(binary, FIELDS.r_funct7.pos),
        'aq': getBits(binary, FIELDS.r_aq.pos),
        'rl': getBits(binary, FIELDS.r_rl.pos),
        'fmt': getBits(binary, FIELDS.r_fp_fmt.pos),
    };
}

// Extract I-types fields from instruction
function extractIFields(binary) {
    return {
        'imm': getBits(binary, FIELDS.i_imm_11_0.pos),
        'rs1': getBits(binary, FIELDS.rs1.pos),
        'funct3': getBits(binary, FIELDS.funct3.pos),
        'rd': getBits(binary, FIELDS.rd.pos),

        /* Shift instructions */
        'shtyp': getBits(binary, FIELDS.i_shtyp.pos),
        'shamt': getBits(binary, FIELDS.i_shamt.pos),
        'shamt_5': getBits(binary, FIELDS.i_shamt_5.pos),
        'shamt_6': getBits(binary, FIELDS.i_shamt_6.pos),
        /* System instructions */
        'funct12': getBits(binary, FIELDS.i_funct12.pos),
        /* Fence insructions */
        'fm': getBits(binary, FIELDS.i_fm.pos),
        'pred': getBits(binary, FIELDS.i_pred.pos),
        'succ': getBits(binary, FIELDS.i_succ.pos),
    };
}

// Extract S-types fields from instruction
function extractSFields(binary) {
    return {
        'imm_11_5': getBits(binary, FIELDS.s_imm_11_5.pos),
        'rs2': getBits(binary, FIELDS.rs2.pos),
        'rs1': getBits(binary, FIELDS.rs1.pos),
        'funct3': getBits(binary, FIELDS.funct3.pos),
        'imm_4_0': getBits(binary, FIELDS.s_imm_4_0.pos),
    };
}

// Extract B-types fields from instruction
function extractBFields(binary) {
    return {
        'imm_12': getBits(binary, FIELDS.b_imm_12.pos),
        'imm_10_5': getBits(binary, FIELDS.b_imm_10_5.pos),
        'rs2': getBits(binary, FIELDS.rs2.pos),
        'rs1': getBits(binary, FIELDS.rs1.pos),
        'funct3': getBits(binary, FIELDS.funct3.pos),
        'imm_4_1': getBits(binary, FIELDS.b_imm_4_1.pos),
        'imm_11': getBits(binary, FIELDS.b_imm_11.pos),
    };
}

// Extract C-instruction fields for mnemonic lookup
function extractCLookupFields(binary) {
    return {
        'funct6': getBits(binary, FIELDS.c_funct6.pos),
        'funct4': getBits(binary, FIELDS.c_funct4.pos),
        'funct3': getBits(binary, FIELDS.c_funct3.pos),
        'funct2': getBits(binary, FIELDS.c_funct2.pos),
        'funct2_cb': getBits(binary, FIELDS.c_funct2_cb.pos),
        'rd_rs1': getBits(binary, FIELDS.c_rd_rs1.pos),
        'rs2': getBits(binary, FIELDS.c_rs2.pos),
    };
}

// Get bits out of binary instruction
function getBits(binary, pos) {
    if (!Array.isArray(pos)) {
        throw new OperationError(getBits.name + ": position should be an array");
    }

    let end = pos[0] + 1;
    let start = end - pos[1];

    if (start > end || binary.length < end) {
        throw new OperationError(getBits.name + ": position error");
    }

    return binary.substring(binary.length - end, binary.length - start);
}

// Parse given immediate to decimal
function decImm(immediate, signExtend = true) {
    // Sign extension requested and sign bit set
    if (signExtend && immediate[0] === '1') {
        return parseInt(immediate, BASE.bin) - Number('0b1' + ''.padStart(immediate.length, '0'));
    }
    return parseInt(immediate, BASE.bin);
}

// Decode immediate value using the given immBits configuration
function decImmBits(immFields, immBits, uimm = false) {
    // Construct full immediate binary to decode
    // - Start with 18 as length since that supports the widest compressed immediate value
    //     Specifically, `c.lui` provides imm[17:12], so there's 6 encoded bits in the upper-portion,
    //     While the 12 LSBs are assumed to be 0, for a total of 18 bits (hence, len = 18)
    const len = 18;
    let binArray = ''.padStart(len, '0').split('');
    let maxBit = 0;

    // Create singleton arrays if only one immediate field present
    if (typeof immFields === 'string') {
        immFields = [immFields];
        immBits = [immBits];
    }

    // Iterate over fields, if multiple
    for (let i = 0; i < immFields.length; i++) {
        const fieldBin = immFields[i];
        const fieldBits = immBits[i];

        // Iterate over bits configuration
        let k = 0; // Iterator for fieldBin
        for (let j = 0; j < fieldBits.length; j++) {
            let bit = fieldBits[j];
            // Check for highest bit
            maxBit = Math.max(maxBit, bit?.[0] ?? bit);

            // Check for single bit vs bit span
            if (typeof bit === 'number') {
                // Single bit
                binArray[len - 1 - bit] = fieldBin[k];
                k++;
            } else {
                // Bit span
                const bitStart = bit[0];
                const bitSpan = bitStart - bit[1] + 1;
                for (let l = 0; l < bitSpan; l++, k++) {
                    binArray[len - 1 - bitStart + l] = fieldBin[k];
                }
            }
        }
    }

    // Join bit array
    let bin = binArray.join('');

    // If sign extending, truncate leading 0s to only include up to max bit
    const signExtend = !uimm;
    if (signExtend) {
        bin = bin.substring(len - maxBit - 1);
    }

    // Decode as coherent binary value
    return decImm(bin, signExtend);
}

// Convert register numbers from binary to string
function decReg(reg, floatReg=false) {
    return (floatReg ? 'f' : 'x') + parseInt(reg, BASE.bin);
}

// Convert register numbers from binary to ABI name string
function decRegAbi(regDec, floatReg=false) {
    return Object.keys(
            (floatReg ? FLOAT_REGISTER : REGISTER)
        )[parseInt(regDec, BASE.dec)];
}

// Get device I/O and memory accesses corresponding to given bits
function decMem(bits) {
    let output = "";

    // I: Device input, O: device output, R: memory reads, W: memory writes
    const access = ['i', 'o', 'r', 'w'];

    // Loop through the access array and binary string
    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === '1') {
            output += access[i];
        }
    }

    if (output === "") {
        throw new OperationError(`Invalid IO/Mem field`);
    }

    return output;
}

// Search for CSR name from the given binary string
function decCSR(binStr) {
    // Decode binary string into numerical value
    const val = parseInt(binStr, BASE.bin);

    // Attempt to search for entry in CSR object with matching value
    const entry = Object.entries(CSR).find(e => e[1] === val);

    // Get CSR name if it exists,
    //   otherwise construct an immediate hex string
    let csr = entry
        ? entry[0]
        : ('0x' + val.toString(16).padStart(3, '0'));

    return csr;
}

// search for float rounding mode name from the given binary string
function decFrm(binstr) {
    // decode binary string into numerical value
    const val = parseInt(binstr, BASE.bin);
  
    // attempt to search for entry in csr object with matching value
    const entry = Object.entries(FLOAT_ROUNDING_MODE).find(e => e[1] === val);
    if (entry === undefined) {
        throw new OperationError(`Invalid float rounding mode field`);
    }
  
    return entry[0];
}

// Convert C instruction immediate bit configurations
//   To a string for binFrag name information
function immBitsToString(immBits) {
    let out = '[';
    let addPipe = false;
    for (const e of immBits) {
        if (!addPipe) {
            addPipe = true;
        } else {
            out += '|';
        }
        if (e instanceof Array) {
            out += e[0] + ':' + e[1];
        } else {
            out += e;
        }
    }
    return out + ']';
}

// Convert C instruction immediate bit configurations
//   To a string for binFrag name information
function regExclToString(excl) {
    if (excl.length === 1)
        return excl[0].toString();
    let out = '{';
    let addComma = false;
    for (const e of excl) {
        if (!addComma) {
            addComma = true;
        } else {
            out += ',';
        }
        out += e;
    }
    return out + '}';
}

// Render assembly instruction
function renderAsm(asmFrags, abi = false, hex = false) {
    // Extract assembly tokens and build instruction
    let inst = asmFrags[0].asm;
    for (let i = 1; i < asmFrags.length; i++) {
        // Conditionally use ABI names for registers
        let asm = abi ? convertRegToAbi(asmFrags[i].asm) : asmFrags[i].asm;

        // Append delimeter
        if (i === 1) {
            inst += ' ';
        }
        else if (!asmFrags[i].mem || !/^(?:nz)?(?:u)?imm/.test(asmFrags[i-1].field)) {
            inst += ', ';
        }

        // Append assembly fragment
        if (asmFrags[i].mem) {
            inst += '(' + asm + ')';
        } else {
            if (hex && typeof(asm) === "number") {
                if (asm < 0) {
                    inst += '-0x' + (-asm).toString(16);
                } else {
                    inst += '0x' + asm.toString(16);
                }
            } else {
                inst += asm;
            }
        }
    }

    return inst.trim();
}

class Encoder {
    /**
     * Binary representation of instruction
     * @type String
     */
    bin;

    /**
     * Value from XLEN_MASK for passing the expected xlen to the decoder
     * - Only matters for C instructions,
     *   set to `XLEN_MASK.all` for all standard 32-bit instructions
     * @type Integer
     */
    xlens;

    /* Private members */
    #config;
    #inst;
    #mne;
    #opr;

    /**
     * Creates an Encoder to convert an assembly instruction to binary
     * @param {String} asm
     */
    constructor(asm, config) {
        this.#config = config;

        // Tokenize assembly instruction
        const tokens = asm.toLowerCase().split(/[ ,()]+/);

        // Convert assembly instruction to binary
        this.#convertAsmToBin(tokens);
    }

    /**
     * Convert assembly instruction to binary
     * @param {String[]} tokens
     */
    #convertAsmToBin(tokens) {
        // The first token is necessarily the instruction's mnemonic
        this.#mne = tokens[0];
        // The following tokens are its operands
        this.#opr = tokens.splice(1);

        // Find instruction based on given mnemonic
        this.#inst = ISA[this.#mne];
        if (this.#inst === undefined) {
            throw new OperationError("Invalid mnemonic: " + this.#mne);
        }
        // Detect C instructions
        const cInst = this.#inst.opcode.length === 2;

        // Determine compatible ISA xlens
        let isa = this.#inst.isa;
        this.xlens = 0;
        if (cInst) {
            this.xlens = this.#inst.xlens;
            // Determine lowest-allowable ISA given instruction xlens
            //   Mainly for error messaging on encoding side
            if ((this.xlens & XLEN_MASK.rv32) !== 0) {
                isa = `RV32${isa}`;
            } else if ((this.xlens & XLEN_MASK.rv64) !== 0) {
                isa = `RV64${isa}`;
            } else if ((this.xlens & XLEN_MASK.rv128) !== 0) {
                isa = `RV128${isa}`;
            }
        } else {
            const isaXlen = parseInt(/^RV(\d+)/.exec(this.#inst.isa)?.[1]);
            switch (isaXlen) {
                // Build up xlens bit-mask to include lowest compatible xlen and all higher ones
                case 32:
                    this.xlens |= XLEN_MASK.rv32;
                case 64:
                    this.xlens |= XLEN_MASK.rv64;
                case 128:
                    this.xlens |= XLEN_MASK.rv128;
                    break;
                default:
                    // All ISAs that do not have an explicit xlen are inferred to support all xlens
                    //   Ex. Zicsr, Zifencei
                    this.xlens = XLEN_MASK.all;
            }
        }

        // Detect mismatch between ISA and configuration
        if (this.#config.ISA !== COPTS_ISA.AUTO) {
            if (this.#config.ISA === COPTS_ISA.RV32I && (this.xlens & XLEN_MASK.rv32) === 0) {
                throw new OperationError(`Detected ${isa} instruction incompatible with configuration ISA: RV32I`);
            } else if (this.#config.ISA === COPTS_ISA.RV64I && (this.xlens & XLEN_MASK.rv64) === 0) {
                throw new OperationError(`Detected ${isa} instruction incompatible with configuration ISA: RV64I`);
            } else if (this.#config.ISA === COPTS_ISA.RV128I && (this.xlens & XLEN_MASK.rv128) === 0) {
                throw new OperationError(`Detected ${isa} instruction incompatible with configuration ISA: RV128I`);
            }
        }

        // Encode instruction
        if (cInst) {
            // 16-bit C instructions
            //   Encode according to instruction format
            const fmt = /^([^-]+)-/.exec(this.#inst.fmt)?.[1];
            switch (fmt) {
                case 'CR':
                    this.#encodeCR();
                    break;
                case 'CI':
                    this.#encodeCI();
                    break;
                case 'CSS':
                    this.#encodeCSS();
                    break;
                case 'CIW':
                    this.#encodeCIW();
                    break;
                case 'CL':
                    this.#encodeCL();
                    break;
                case 'CS':
                    this.#encodeCS();
                    break;
                case 'CA':
                    this.#encodeCA();
                    break;
                case 'CB':
                    this.#encodeCB();
                    break;
                case 'CJ':
                    this.#encodeCJ();
                    break;
                default:
                    throw new OperationError(`Unsupported C instruction format: ${this.#inst.fmt}`);
            }
        } else {
            // Standard 32-bit instructions
            //   Encode according to opcode
            switch (this.#inst.opcode) {
                    // R-type
                case OPCODE.OP:
                case OPCODE.OP_32:
                case OPCODE.OP_64:
                    this.#encodeOP();
                    break;
                case OPCODE.OP_FP:
                    this.#encodeOP_FP();
                    break;
                case OPCODE.AMO:
                    this.#encodeAMO();
                    break;

                    // I-type
                case OPCODE.JALR:
                    this.#encodeJALR();
                    break;
                case OPCODE.LOAD:
                case OPCODE.LOAD_FP:
                    this.#encodeLOAD();
                    break;
                case OPCODE.OP_IMM:
                case OPCODE.OP_IMM_32:
                case OPCODE.OP_IMM_64:
                    this.#encodeOP_IMM();
                    break;
                case OPCODE.MISC_MEM:
                    this.#encodeMISC_MEM();
                    break;
                case OPCODE.SYSTEM:
                    this.#encodeSYSTEM();
                    break;

                    // S-type
                case OPCODE.STORE:
                case OPCODE.STORE_FP:
                    this.#encodeSTORE();
                    break;

                    // B-type
                case OPCODE.BRANCH:
                    this.#encodeBRANCH();
                    break;

                    // U-type
                case OPCODE.LUI:
                case OPCODE.AUIPC:
                    this.#encodeUType();
                    break;

                    // J-type:
                case OPCODE.JAL:
                    this.#encodeJAL();
                    break;

                    // R4-type
                case OPCODE.MADD:
                case OPCODE.MSUB:
                case OPCODE.NMADD:
                case OPCODE.NMSUB:
                    this.#encodeR4();
                    break;

                    // Invalid opcode
                default:
                    throw new OperationError("Unsupported opcode: " + this.#inst.opcode);
            }
        }
    }

    /**
     * Encodes OP instruction
     */
    #encodeOP() {
        // Get operands
        const dest = this.#opr[0], src1 = this.#opr[1], src2 = this.#opr[2];

        // Convert to binary representation
        const rd = encReg(dest), rs1 = encReg(src1), rs2 = encReg(src2);

        // Construct binary instruction
        this.bin = this.#inst.funct7 + rs2 + rs1 + this.#inst.funct3 + rd +
            this.#inst.opcode;
    }

    /**
     * Encodes OP-FP instruction
     */
    #encodeOP_FP() {
        // Get operands
        const dest = this.#opr[0],
              src1 = this.#opr[1],
              src2 = this.#opr[2],
              frm  = this.#inst.rs2 !== undefined ? this.#opr[2] : this.#opr[3];

        // Convert to binary representation
        let floatRd = true;
        let floatRs1 = true;
        if (this.#inst.funct5[0] === '1') {
            // Conditionally encode rd or rs1 as an int register, based on funct7
            if (this.#inst.funct5[3] === '1') {
                floatRs1 = false;
            } else {
                floatRd = false;
            }
        }
        const rd = encReg(dest, floatRd),
            rs1 = encReg(src1, floatRs1),
            rs2 = this.#inst.rs2 ?? encReg(src2, true),
            funct3 = this.#inst.funct3 ?? encFrm(frm) ?? '111'; /* dym rm */

        // Construct binary instruction
        this.bin = this.#inst.funct5 + this.#inst.fp_fmt + rs2 + rs1 + funct3 + rd +
            this.#inst.opcode;
    }

    /**
     * Encodes JALR instruction
     */
    #encodeJALR() {
        // Get operands
        const dest = this.#opr[0], offset = this.#opr[1], base = this.#opr[2];

        // Convert to binary representation
        const rd = encReg(dest), rs1 = encReg(base),
            imm = encImm(offset, FIELDS.i_imm_11_0.pos[1]);

        // Construct binary instruction
        this.bin = imm + rs1 + this.#inst.funct3 + rd + this.#inst.opcode;
    }

    /**
     * Encodes LOAD instruction
     */
    #encodeLOAD() {
        // Get operands
        const dest = this.#opr[0], offset = this.#opr[1], base = this.#opr[2];

        // Convert to binary representation
        const floatInst = this.#inst.opcode === OPCODE.LOAD_FP;
        const rd = encReg(dest, floatInst),
            rs1 = encReg(base),
            imm = encImm(offset, FIELDS.i_imm_11_0.pos[1]);

        // Construct binary instruction
        this.bin = imm + rs1 + this.#inst.funct3 + rd + this.#inst.opcode;
    }

    /**
     * Encodes OP_IMM instruction
     */
    #encodeOP_IMM() {
        // Get fields
        const dest = this.#opr[0], src = this.#opr[1];
        let immediate = this.#opr[2];
        if (immediate.indexOf("0x") !== -1) {
            immediate = parseInt(immediate, 16);
        }

        // Convert to binary representation
        const rd = encReg(dest), rs1 = encReg(src);

        let imm = ''.padStart('0', FIELDS.i_imm_11_0.pos[1]);

        // Shift instruction
        if (/^s[lr][al]i/.test(this.#mne)) {
            // Determine shift-amount width based on opcode or config ISA
            //   For encoding, default to the widest shamt possible with the given parameters
            let shamtWidth;
            if (this.#config.isa === COPTS_ISA.RV32I || this.#inst.opcode === OPCODE.OP_IMM_32) {
                shamtWidth = FIELDS.i_shamt.pos[1];     // 5bit width (RV32I)
            } else if (this.#config.isa === COPTS_ISA.RV64I || this.#inst.opcode === OPCODE.OP_IMM_64) {
                shamtWidth = FIELDS.i_shamt_5_0.pos[1]; // 6bit width (RV64I)
            } else {
                shamtWidth = FIELDS.i_shamt_6_0.pos[1]; // 7bit width (RV128I)
            }

            // Construct immediate field from shift type and shift amount
            if (immediate < 0 || immediate >= (1 << shamtWidth)) {
                throw new OperationError('Invalid shamt field (out of range): "' + immediate + '"');
            }
            const imm_11_7 = '0' + this.#inst.shtyp + '000';
            const imm_6_0 = encImm(immediate, FIELDS.i_shamt_6_0.pos[1]);

            imm = imm_11_7 + imm_6_0;

        } else {
            // Non-shift instructions
            imm = encImm(immediate, FIELDS.i_imm_11_0.pos[1]);
        }

        // Construct binary instruction
        this.bin = imm + rs1 + this.#inst.funct3 + rd + this.#inst.opcode;
    }

    /**
     * Encodes MISC_MEM instruction
     */
    #encodeMISC_MEM() {
        // Default values
        let rs1 = ''.padStart(FIELDS.rs1.pos[1], '0'),
            rd = ''.padStart(FIELDS.rd.pos[1], '0'),
            imm = ''.padStart(FIELDS.i_imm_11_0.pos[1], '0');

        // Signals when MISC-MEM used as extended encoding space for load operations
        const loadExt = this.#mne === 'lq';

        if (loadExt) {
            // Get operands
            const dest = this.#opr[0], offset = this.#opr[1], base = this.#opr[2];

            // Convert to binary representation
            rd = encReg(dest);
            imm = encImm(offset, FIELDS.i_imm_11_0.pos[1]);
            rs1 = encReg(base);

        } else if (this.#mne === 'fence') {
            // Get operands
            const predecessor = this.#opr[0], successor = this.#opr[1];

            // Convert to binary representation
            const pred = encMem(predecessor), succ = encMem(successor);

            imm = '0000' + pred + succ;
        }

        // Construct binary instruction
        this.bin = imm + rs1 + this.#inst.funct3 + rd + this.#inst.opcode;
    }

    /**
     * Encodes SYSTEM instruction
     */
    #encodeSYSTEM() {
        // Declare operands
        let rs1, rd, imm;

        // Zicsr Instructions
        if (this.#inst.isa == 'Zicsr') {
            // Get operands
            const dest = this.#opr[0], csr = this.#opr[1], src = this.#opr[2];

            // Convert to binary representation
            rd = encReg(dest);
            imm = encCSR(csr);

            // Convert src to register or immediate
            //   based off high bit of funct3 (0:reg, 1:imm)
            rs1 = (this.#inst.funct3[0] === '0')
                ? encReg(src)
                : encImm(src, FIELDS.rs1.pos[1]);

        } else {
            // Trap instructions
            rs1 = ''.padStart(FIELDS.rs1.pos[1], '0');
            rd = ''.padStart(FIELDS.rd.pos[1], '0');
            imm = this.#inst.funct12;
        }

        // Construct binary instruction
        this.bin = imm + rs1 + this.#inst.funct3 + rd + this.#inst.opcode;
    }

    /**
     * Encodes STORE instruction
     */
    #encodeSTORE() {
        // Get operands
        const src = this.#opr[0], offset = this.#opr[1], base = this.#opr[2];

        // Immediate len
        const len_11_5 = FIELDS.s_imm_11_5.pos[1],
            len_4_0 = FIELDS.s_imm_4_0.pos[1];

        // Convert to binary representation
        const floatInst = this.#inst.opcode === OPCODE.STORE_FP;
        const rs2 = encReg(src, floatInst),
            rs1 = encReg(base),
            imm = encImm(offset, len_11_5 + len_4_0),
            imm_11_5 = imm.substring(0, len_11_5),
            imm_4_0 = imm.substring(len_11_5, len_11_5 + len_4_0);

        // Construct binary instruction
        this.bin = imm_11_5 + rs2 + rs1 + this.#inst.funct3 + imm_4_0 +
            this.#inst.opcode;
    }

    /**
     * Encodes BRANCH instruction
     */
    #encodeBRANCH() {
        // Get operands
        const src1 = this.#opr[0], src2 = this.#opr[1], offset = this.#opr[2];

        // Immediate len
        const len_12 = FIELDS.b_imm_12.pos[1],
            len_11 = FIELDS.b_imm_11.pos[1],
            len_10_5 = FIELDS.b_imm_10_5.pos[1],
            len_4_1 = FIELDS.b_imm_4_1.pos[1];

        // Convert to binary representation
        const rs1 = encReg(src1), rs2 = encReg(src2),
            imm = encImm(offset, len_12 + len_11 + len_10_5 + len_4_1 + 1);

        const imm_12 = imm.substring(0, len_12),
            imm_11 = imm.substring(len_12, len_12 + len_11),
            imm_10_5 = imm.substring(len_12 + len_11, len_12 + len_11 + len_10_5),
            imm_4_1 = imm.substring(len_12 + len_11 + len_10_5,
                len_12 + len_11 + len_10_5 + len_4_1);

        // Construct binary instruction
        this.bin = imm_12 + imm_10_5 + rs2 + rs1 + this.#inst.funct3 +
            imm_4_1 + imm_11 + this.#inst.opcode;
    }

    /**
     * Encodes U-type instruction
     */
    #encodeUType() {
        // Get operands
        const dest = this.#opr[0];
        
        let immediate = this.#opr[1];
        if (immediate.indexOf("0x") !== -1) {
            immediate = parseInt(immediate, 16);
        }
        immediate = immediate << 12;

        // Convert to binary representation
        const rd = encReg(dest);
        // U-type immediate value range requires 32 bits for initial binary representation
        const imm = encImm(immediate, 32);

        // Grab the upper 20 bits of the 32-bit encoded value
        // - Lower 12 bits not encoded, inferred/forced to be 0s
        const imm_31_12 = imm.substring(0, FIELDS.u_imm_31_12.pos[1]);

        // Construct binary instruction
        this.bin = imm_31_12 + rd + this.#inst.opcode;
    }

    /**
     * Encodes J-type instruction
     */
    #encodeJAL() {
        // Get operands
        const dest = this.#opr[0],
            offset = this.#opr[1];

        // Immediate len
        const len_20 = FIELDS.j_imm_20.pos[1],
            len_10_1 = FIELDS.j_imm_10_1.pos[1],
            len_11 = FIELDS.j_imm_11.pos[1],
            len_19_12 = FIELDS.j_imm_19_12.pos[1];

        // Convert to binary representation
        const rd = encReg(dest),
            imm = encImm(offset, len_20 + len_19_12 + len_11 + len_10_1 + 1);

        const imm_20 = imm.substring(0, len_20),
            imm_19_12 = imm.substring(len_20, len_20 + len_19_12),
            imm_11 = imm.substring(len_20 + len_19_12, len_20 + len_19_12 + len_11),
            imm_10_1 = imm.substring(len_20 + len_19_12 + len_11,
                len_20 + len_19_12 + len_11 + len_10_1);

        // Construct binary instruction
        this.bin = imm_20 + imm_10_1 + imm_11 + imm_19_12 + rd + this.#inst.opcode;
    }

    /**
     * Encodes AMO instruction
     */
    #encodeAMO() {
        // Declare operands
        let dest, addr, src;

        // Get operands, separately for 'lr' instruction
        if (/^lr\./.test(this.#mne)) {
            dest = this.#opr[0];
            addr = this.#opr[1];
            src  = 'x0'; // converts to '00000'
        }
        else {
            dest = this.#opr[0];
            addr = this.#opr[2];
            src  = this.#opr[1];
        }

        // Convert to binary representation
        const rd = encReg(dest), rs1 = encReg(addr), rs2 = encReg(src),
            aq = '0', rl = '0';

        // Construct binary instruction
        this.bin = this.#inst.funct5 + aq + rl + rs2 + rs1 +
            this.#inst.funct3 + rd + this.#inst.opcode;
    }

    /**
     * Encodes R4 instruction
     */
    #encodeR4() {
        // Get operands
        const dest = this.#opr[0], src1 = this.#opr[1],
            src2 = this.#opr[2], src3 = this.#opr[3],
            frm = this.#opr[4];

        // Convert to binary representation
        const rd = encReg(dest, true), rs1 = encReg(src1, true),
            rs2 = encReg(src2, true), rs3 = encReg(src3, true),
            fmt = this.#inst.fp_fmt, funct3 = encFrm(frm) ?? '111'; /* dym rm */

        // Construct binary instruction
        this.bin = rs3 + fmt + rs2 + rs1 + funct3 + rd +
            this.#inst.opcode;
    }

    /**
     * Encodes CR-type instruction
     */
    #encodeCR() {
        // Get operands
        const destSrc1 = this.#opr[0], src2 = this.#opr[1];

        // Encode registers, but overwite with static values if present
        const rdRs1 = this.#inst.rdRs1Val !== undefined
            ? encImm(this.#inst.rdRs1Val, FIELDS.c_rd_rs1.pos[1])
            : (destSrc1 === undefined ? '01000' : encReg(destSrc1));
        const rs2 = this.#inst.rs2Val !== undefined
            ? encImm(this.#inst.rs2Val, FIELDS.c_rs2.pos[1])
            : (src2 === undefined ? '01000' : encReg(src2));

        // Validate operands
        if (this.#inst.rdRs1Excl !== undefined) {
            const val = parseInt(rdRs1, BASE.bin);
            for (const excl of this.#inst.rdRs1Excl) {
                if (val === excl) {
                    throw new OperationError(`Illegal value "${destSrc1}" in rd/rs1 field for instruction ${this.#mne}`);
                }
            }
        }
        if (this.#inst.rs2Excl !== undefined) {
            const val = parseInt(rs2, BASE.bin);
            for (const excl of this.#inst.rs2Excl) {
                if (val === excl) {
                    throw new OperationError(`Illegal value "${src2}" in rs2 field for instruction ${this.#mne}`);
                }
            }
        }

        // Construct binary instruction
        this.bin = this.#inst.funct4 + rdRs1 + rs2 + this.#inst.opcode;
    }

    /**
     * Encodes CI-type instruction
     */
    #encodeCI() {
        // Determine operand order
        const skipRdRs1 = this.#inst.rdRs1Val !== undefined;

        // Get operands
        const destSrc1 = this.#opr[0];
        let immediate = this.#opr[skipRdRs1 ? 0 : 1];
        if (immediate.indexOf("0x") !== -1) {
            immediate = parseInt(immediate, 16);
        }

        // Determine if rdRs1 should be float register from mnemonic
        const floatRdRs1 = /^c\.f/.test(this.#mne);

        // Encode operands, but overwite with static values if present
        const rdRs1 = skipRdRs1
            ? encImm(this.#inst.rdRs1Val, FIELDS.c_rd_rs1.pos[1])
            : (destSrc1 === undefined ? '01000' : encReg(destSrc1, floatRdRs1));
        let immVal = this.#inst.immVal ?? Number(immediate);

        // Validate operands
        if (this.#inst.rdRs1Excl !== undefined) {
            const val = parseInt(rdRs1, BASE.bin);
            for (const excl of this.#inst.rdRs1Excl) {
                if (val === excl) {
                    throw new OperationError(`Illegal value "${destSrc1}" in rd/rs1 field for instruction ${this.#mne}`);
                }
            }
        }
        if (this.#inst.nzimm && (immVal === 0 || isNaN(immVal))) {
            // If missing immediate, generate lowest non-zero immediate value
            if (immediate === undefined) {
                immVal = minImmFromBits(this.#inst.immBits);
            } else {
                throw new OperationError(`Invalid immediate "${immediate}", ${this.#mne} instruction expects non-zero value`);
            }
        }
        if (this.#inst.uimm && immVal < 0) {
            throw new OperationError(`Invalid immediate "${immediate}", ${this.#mne} instruction expects non-negative value`);
        }

        // Construct immediate fields
        const imm0 = encImmBits(immVal, this.#inst.immBits[0]);
        const imm1 = encImmBits(immVal, this.#inst.immBits[1]);

        // Construct binary instruction
        this.bin = this.#inst.funct3 + imm0 + rdRs1 + imm1 + this.#inst.opcode;
    }

    /**
     * Encodes CSS-type instruction
     */
    #encodeCSS() {
        // Get operands
        const src = this.#opr[0], offset = this.#opr[1];

        // Determine if rs2 should be float register from mnemonic
        const floatRs2 = /^c\.f/.test(this.#mne);

        // Encode operands and parse immediate for validation
        const rs2 = encReg(src, floatRs2);
        let immVal = Number(offset);

        // Validate operands
        if (this.#inst.uimm && immVal < 0) {
            throw new OperationError(`Invalid immediate "${offset}", ${this.#mne} instruction expects non-negative value`);
        }

        // Construct immediate field
        const imm = encImmBits(immVal, this.#inst.immBits);

        // Construct binary instruction
        this.bin = this.#inst.funct3 + imm + rs2 + this.#inst.opcode;
    }

    /**
     * Encodes CIW-type instruction
     */
    #encodeCIW() {
        // Get operands
        const dest = this.#opr[0];
        let immediate = this.#opr[1];
        if (immediate.indexOf("0x") !== -1) {
            immediate = parseInt(immediate, 16);
        }

        // Encode operands and parse immediate for validation
        const rdPrime = encRegPrime(dest);
        let immVal = Number(immediate);

        // Validate operands
        if (this.#inst.nzimm && (immVal === 0 || isNaN(immVal))) {
            // If missing immediate, generate lowest non-zero immediate value
            if (immediate === undefined) {
                immVal = minImmFromBits(this.#inst.immBits);
            } else {
                throw new OperationError(`Invalid immediate "${immediate}", ${this.#mne} instruction expects non-zero value`);
            }
        }
        if (this.#inst.uimm && immVal < 0) {
            throw new OperationError(`Invalid immediate "${immediate}", ${this.#mne} instruction expects non-negative value`);
        }

        // Construct immediate field
        const imm = encImmBits(immVal, this.#inst.immBits);

        // Construct binary instruction
        this.bin = this.#inst.funct3 + imm + rdPrime + this.#inst.opcode;
    }

    /**
     * Encodes CL-type instruction
     */
    #encodeCL() {
        // Get operands
        const dest = this.#opr[0], offset = this.#opr[1], base = this.#opr[2];

        // Determine if rd' should be float register from mnemonic
        const floatRd = /^c\.f/.test(this.#mne);

        // Encode operands and parse immediate for validation
        const rdPrime = encRegPrime(dest, floatRd);
        const rs1Prime = encRegPrime(base);
        let immVal = Number(offset);

        // Validate operands
        if (this.#inst.uimm && immVal < 0) {
            throw new OperationError(`Invalid immediate "${offset}", ${this.#mne} instruction expects non-negative value`);
        }

        // Construct immediate fields
        const imm0 = encImmBits(immVal, this.#inst.immBits[0]);
        const imm1 = encImmBits(immVal, this.#inst.immBits[1]);

        // Construct binary instruction
        this.bin = this.#inst.funct3 + imm0 + rs1Prime + imm1 + rdPrime + this.#inst.opcode;
    }

    /**
     * Encodes CS-type instruction
     */
    #encodeCS() {
        // Get operands
        const src = this.#opr[0], base = this.#opr[2];
        let immediate = this.#opr[1];
        if (immediate.indexOf("0x") !== -1) {
            immediate = parseInt(immediate, 16);
        }

        // Determine if rd' should be float register from mnemonic
        const floatRs2 = /^c\.f/.test(this.#mne);

        // Encode operands and parse immediate for validation
        const rs2Prime = encRegPrime(src, floatRs2);
        const rs1Prime = encRegPrime(base);
        let immVal = Number(immediate);

        // Validate operands
        if (this.#inst.uimm && immVal < 0) {
            throw new OperationError(`Invalid immediate "${immediate}", ${this.#mne} instruction expects non-negative value`);
        }

        // Construct immediate fields
        const imm0 = encImmBits(immVal, this.#inst.immBits[0]);
        const imm1 = encImmBits(immVal, this.#inst.immBits[1]);

        // Construct binary instruction
        this.bin = this.#inst.funct3 + imm0 + rs1Prime + imm1 + rs2Prime + this.#inst.opcode;
    }

    /**
     * Encodes CA-type instruction
     */
    #encodeCA() {
        // Get operands
        const destSrc1 = this.#opr[0], src2 = this.#opr[1];

        // Encode operands and parse immediate for validation
        const rdRs1Prime = encRegPrime(destSrc1);
        const rs2Prime = encRegPrime(src2);

        // Construct binary instruction
        this.bin = this.#inst.funct6 + rdRs1Prime + this.#inst.funct2 + rs2Prime + this.#inst.opcode;
    }

    /**
     * Encodes CB-type instruction
     */
    #encodeCB() {
        // Get operands
        const destSrc1 = this.#opr[0];
        let immediate = this.#opr[1];
        if (immediate.indexOf("0x") !== -1) {
            immediate = parseInt(immediate, 16);
        }

        // Encode operands, but overwite with static values if present
        const rdRs1Prime = encRegPrime(destSrc1);
        let immVal = this.#inst.immVal ?? Number(immediate);

        // Validate operands
        if (this.#inst.nzimm && (immVal === 0 || isNaN(immVal))) {
            // If missing immediate, generate lowest non-zero immediate value
            if (immediate === undefined) {
                immVal = minImmFromBits(this.#inst.immBits);
            } else {
                throw new OperationError(`Invalid immediate "${immediate}", ${this.#mne} instruction expects non-zero value`);
            }
        }
        if (this.#inst.uimm && immVal < 0) {
            throw new OperationError(`Invalid immediate "${immediate}", ${this.#mne} instruction expects non-negative value`);
        }

        // Construct immediate fields
        const imm0 = encImmBits(immVal, this.#inst.immBits[0]);
        const imm1 = encImmBits(immVal, this.#inst.immBits[1]);

        // Conditionally construct funct2 field, if present
        const funct2 = this.#inst.funct2 ?? '';

        // Construct binary instruction
        this.bin = this.#inst.funct3 + imm0 + funct2 + rdRs1Prime + imm1 + this.#inst.opcode;
    }

    /**
     * Encodes CJ-type instruction
     */
    #encodeCJ() {
        // Get operands
        let immediate = this.#opr[0];
        if (immediate.indexOf("0x") !== -1) {
            immediate = parseInt(immediate, 16);
        }

        // Construct immediate fields
        const jumpTarget = encImmBits(immediate, this.#inst.immBits);

        // Construct binary instruction
        this.bin = this.#inst.funct3 + jumpTarget + this.#inst.opcode;
    }
}

// Parse given immediate to binary
function encImm(immediate, len) {
    let bin = (Number(immediate) >>> 0).toString(BASE.bin);
    // Extend or reduce binary representation to `len` bits
    return bin.padStart(len, '0').slice(-len);
}

// Encode immediate value using the given immBits configuration
function encImmBits(immediate, immBits) {
    // Full length is 18 as no C instruction immediate will be longer
    const len = 18;
    let binFull = encImm(immediate, len);
    let bin = '';
    for (let b of immBits) {
        // Detect singular bit vs bit span
        if (typeof b === 'number') {
            bin += binFull[len - 1 - b];
        } else {
            bin += binFull.substring(len - 1 - b[0], len - b[1]);
        }
    }
    return bin;
}

// Get the lowest possible non-zero value from an immBits configuration
function minImmFromBits(immBits) {
    // Local recursive function for finding mininum value from arbitrarily nested arrays
    function deepMin(numOrArr) {
        let minVal = Infinity;
        if (typeof numOrArr === 'number') {
            return numOrArr;
        }
        for (let e of numOrArr) {
            minVal = Math.min(minVal, deepMin(e));
        }
        return minVal;
    }
    return Number('0b1' + ''.padStart(deepMin(immBits), '0'));
}

// Convert register numbers to binary
function encReg(reg, floatReg=false) {
    // Attempt to convert from ABI name to x<num> or f<num>, depending on `floatReg`
    reg = (floatReg ? FLOAT_REGISTER[reg] : REGISTER[reg]) ?? reg;
    // Validate using register file prefix determined from `floatReg` parameter
    let regFile = floatReg ? 'f' : 'x';
    if (reg === undefined || reg.length === 0) {
        // Missing operand, helpfully return 'x0' or 'f0' by default
        return '00000';
    } else if (reg[0] !== regFile || !(/^[fx]\d+/.test(reg))) {
        throw new OperationError(`Invalid or unknown ${floatReg ? 'float ' : ''}register format: "${reg}"`);
    }
    // Attempt to parse the decimal register address, set to 0 on failed parse
    let dec = parseInt(reg.substring(1));
    if (isNaN(dec)) {
        dec = 0;
    } else if (dec < 0 || dec > 31) {
        throw new OperationError(`Register address out of range: "${reg}"`);
    }
    return convertBase(dec, BASE.dec, BASE.bin, 5);
}

// Convert compressed register numbers to binary
function encRegPrime(reg, floatReg=false) {
    // Missing operand, use x8 or f8
    if (reg === undefined) {
        return '000';
    }

    // Encode register
    const encoded = encReg(reg, floatReg);
    // Make sure that compressed register belongs to x8-x15/f8-15 range
    // - Full 5-bit encoded register should conform to '01xxx', use the 'xxx' in the encoded instruction
    if (encoded.substring(0, 2) !== '01') {
        const regFile = floatReg ? 'f' : 'x';
        throw new OperationError(`Invalid register "${reg}", rd' field expects compressable register from ${regFile}8 to ${regFile}15`);
    }
    return encoded.substring(2);
}

// Convert memory ordering to binary
function encMem(input) {
    // Default input to 'iorw'
    input = input ?? 'iorw';

    // I: Device input, O: device output, R: memory reads, W: memory writes
    const access = ['i', 'o', 'r', 'w'];

    // Construct bits from input character flags
    let bits = '';
    let one_count = 0;
    for (let i = 0; i < access.length; i++) {
        if (input.includes(access[i])) {
            bits += '1';
            one_count++;
        } else {
            bits += '0';
        }
    }

    if (one_count !== input.length || bits === '0000') {
        throw new OperationError(`Invalid IO/Mem field '${input}', expected some combination of 'iorw'`);
    }

    return bits;
}

// Convert CSR (name or imm) to binary
function encCSR(csr) {
    // Attempt to find CSR value from CSR name map
    let csrVal = CSR[csr ?? 'cycle'];

    // If failed, attempt to parse as immediate
    if (csrVal === undefined) {
        csrVal = Number(csr) >>> 0;

        // If parse failed, neither number nor valid CSR name
        if (csrVal === 0 && csr != 0) {
            throw new OperationError(`Invalid or unknown CSR name: "${csr}"`);
        }
    }

    return encImm(csrVal, FIELDS.i_csr.pos[1]);
}

// Convert float rounding mode name to binary
function encFrm(frm) {
    // Default input to 'dyn'
    frm = frm ?? 'dyn';
  
    // Lookup name in frm table
    const frmVal = FLOAT_ROUNDING_MODE[frm];
    if (frmVal === undefined) {
        throw new OperationError(`Invalid float rounding mode field '${frm}'`);
    }
  
    return encImm(frmVal, FIELDS.r_fp_rm.pos[1]);
}
  