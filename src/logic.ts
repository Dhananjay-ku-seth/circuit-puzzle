// Same gate-evaluation engine as Logic Circuit Simulator (iterative relaxation,
// handles feedback), reused as-is since the math doesn't change for a puzzle game.

export type Kind = "IN" | "OUT" | "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR";
export type Bit = 0 | 1;

export type Comp = { id: string; kind: Kind; x: number; y: number; val?: Bit; label?: string; fixed?: boolean };
export type Wire = { id: string; from: string; to: string; toPort: number };

export function numInputs(kind: Kind): number {
  if (kind === "IN") return 0;
  if (kind === "OUT" || kind === "NOT") return 1;
  return 2;
}
export function hasOutput(kind: Kind): boolean {
  return kind !== "OUT";
}
export function dims(kind: Kind): { w: number; h: number } {
  if (kind === "IN" || kind === "OUT") return { w: 58, h: 40 };
  return { w: 80, h: 54 };
}
export function outPort(c: Comp) {
  const { w, h } = dims(c.kind);
  return { x: c.x + w, y: c.y + h / 2 };
}
export function inPort(c: Comp, i: number) {
  const { h } = dims(c.kind);
  const n = numInputs(c.kind);
  return { x: c.x, y: c.y + ((i + 1) * h) / (n + 1) };
}

function gate(kind: Kind, a: Bit, b: Bit): Bit {
  switch (kind) {
    case "AND": return (a && b) ? 1 : 0;
    case "OR": return (a || b) ? 1 : 0;
    case "NOT": return a ? 0 : 1;
    case "NAND": return (a && b) ? 0 : 1;
    case "NOR": return (a || b) ? 0 : 1;
    case "XOR": return (a ^ b) as Bit;
    case "XNOR": return (a ^ b) ? 0 : 1;
    default: return 0;
  }
}

export function evaluate(comps: Comp[], wires: Wire[]): Record<string, Bit> {
  const val: Record<string, Bit> = {};
  for (const c of comps) val[c.id] = c.kind === "IN" ? (c.val ?? 0) : 0;

  const inputsOf = (compId: string, port: number): Bit => {
    const w = wires.find((w) => w.to === compId && w.toPort === port);
    return w ? (val[w.from] ?? 0) : 0;
  };

  for (let iter = 0; iter < 40; iter++) {
    const next: Record<string, Bit> = { ...val };
    for (const c of comps) {
      if (c.kind === "IN") { next[c.id] = c.val ?? 0; continue; }
      if (c.kind === "OUT") { next[c.id] = inputsOf(c.id, 0); continue; }
      const a = inputsOf(c.id, 0);
      const b = numInputs(c.kind) > 1 ? inputsOf(c.id, 1) : 0;
      next[c.id] = gate(c.kind, a, b);
    }
    let changed = false;
    for (const c of comps) if (next[c.id] !== val[c.id]) changed = true;
    Object.assign(val, next);
    if (!changed) break;
  }
  return val;
}
