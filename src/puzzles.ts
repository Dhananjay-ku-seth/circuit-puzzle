import type { Bit, Comp, Wire, Kind } from "./logic";
import { evaluate } from "./logic";

export type Puzzle = {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  allowedGates: Kind[];
  par: number;
  compute: (inputs: Bit[]) => Bit[];
};

const ALL_GATES: Kind[] = ["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"];
const BASIC_GATES: Kind[] = ["AND", "OR", "NOT"];

export const PUZZLES: Puzzle[] = [
  {
    id: "and",
    name: "1. Basic AND",
    description: "Warm-up: build Y = A AND B.",
    inputs: ["A", "B"],
    outputs: ["Y"],
    allowedGates: ALL_GATES,
    par: 1,
    compute: ([a, b]) => [(a && b) ? 1 : 0],
  },
  {
    id: "or",
    name: "2. Basic OR",
    description: "Build Y = A OR B.",
    inputs: ["A", "B"],
    outputs: ["Y"],
    allowedGates: ALL_GATES,
    par: 1,
    compute: ([a, b]) => [(a || b) ? 1 : 0],
  },
  {
    id: "xor-restricted",
    name: "3. XOR, the hard way",
    description: 'Build Y = A XOR B — but XOR/XNOR/NAND/NOR are locked. AND, OR, and NOT only.',
    inputs: ["A", "B"],
    outputs: ["Y"],
    allowedGates: BASIC_GATES,
    par: 4,
    compute: ([a, b]) => [(a ^ b) as Bit],
  },
  {
    id: "half-adder",
    name: "4. Half Adder",
    description: "Two outputs this time: Sum = A XOR B, Carry = A AND B.",
    inputs: ["A", "B"],
    outputs: ["Sum", "Carry"],
    allowedGates: ALL_GATES,
    par: 2,
    compute: ([a, b]) => [(a ^ b) as Bit, (a && b) ? 1 : 0],
  },
  {
    id: "majority",
    name: "5. Majority Vote",
    description: "Three inputs. Y = 1 whenever at least two of A, B, C are 1.",
    inputs: ["A", "B", "C"],
    outputs: ["Y"],
    allowedGates: ALL_GATES,
    par: 4,
    compute: ([a, b, c]) => [((a && b) || (b && c) || (a && c)) ? 1 : 0],
  },
  {
    id: "mux",
    name: "6. 2:1 Multiplexer",
    description: "Y = A when S is 0, B when S is 1 — the classic MUX. AND, OR, NOT only.",
    inputs: ["A", "B", "S"],
    outputs: ["Y"],
    allowedGates: BASIC_GATES,
    par: 4,
    compute: ([a, b, s]) => [(s ? b : a) as Bit],
  },
];

export type CheckResult = {
  solved: boolean;
  rows: { inputs: Bit[]; expected: Bit[]; actual: Bit[]; ok: boolean }[];
  gateCount: number;
  usedDisallowedGate: boolean;
};

export function checkCircuit(puzzle: Puzzle, comps: Comp[], wires: Wire[]): CheckResult {
  const inNodes = puzzle.inputs.map((label) => comps.find((c) => c.kind === "IN" && c.label === label)!);
  const outNodes = puzzle.outputs.map((label) => comps.find((c) => c.kind === "OUT" && c.label === label)!);
  const gateComps = comps.filter((c) => c.kind !== "IN" && c.kind !== "OUT");
  const usedDisallowedGate = gateComps.some((c) => !puzzle.allowedGates.includes(c.kind));

  const n = puzzle.inputs.length;
  const rows: CheckResult["rows"] = [];
  let solved = true;
  for (let m = 0; m < (1 << n); m++) {
    const bits = puzzle.inputs.map((_, i) => ((m >> i) & 1) as Bit);
    const trial = comps.map((c) => {
      const idx = inNodes.findIndex((n) => n.id === c.id);
      return idx >= 0 ? { ...c, val: bits[idx] } : c;
    });
    const v = evaluate(trial, wires);
    const expected = puzzle.compute(bits);
    const actual = outNodes.map((o) => v[o.id] ?? 0);
    const ok = expected.every((e, i) => e === actual[i]);
    if (!ok) solved = false;
    rows.push({ inputs: bits, expected, actual, ok });
  }
  if (usedDisallowedGate) solved = false;
  return { solved, rows, gateCount: gateComps.length, usedDisallowedGate };
}

export function starsFor(puzzle: Puzzle, gateCount: number): number {
  if (gateCount <= puzzle.par) return 3;
  if (gateCount <= puzzle.par + 2) return 2;
  return 1;
}
