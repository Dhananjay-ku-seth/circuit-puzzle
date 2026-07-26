import { useEffect, useMemo, useRef, useState } from "react";
import {
  Kind, Comp, Wire, numInputs, hasOutput, dims, outPort, inPort, evaluate,
} from "./logic";
import { PUZZLES, checkCircuit, starsFor, type Puzzle } from "./puzzles";
import AuthPanel from "./AuthPanel";
import SaveCircuit, { type PuzzleSaveConfig } from "./SaveCircuit";

const SVW = 900, SVH = 380;
let counter = 1;
const nid = (p: string) => `${p}${counter++}_${Math.random().toString(36).slice(2, 6)}`;

function layoutFor(puzzle: Puzzle): { comps: Comp[]; wires: Wire[] } {
  const inGap = SVH / (puzzle.inputs.length + 1);
  const outGap = SVH / (puzzle.outputs.length + 1);
  const comps: Comp[] = [
    ...puzzle.inputs.map((label, i) => ({
      id: nid("in"), kind: "IN" as Kind, x: 50, y: inGap * (i + 1) - 20, val: 0 as const, label, fixed: true,
    })),
    ...puzzle.outputs.map((label, i) => ({
      id: nid("out"), kind: "OUT" as Kind, x: SVW - 110, y: outGap * (i + 1) - 20, label, fixed: true,
    })),
  ];
  return { comps, wires: [] };
}

export default function App() {
  const [puzzleId, setPuzzleId] = useState(PUZZLES[0].id);
  const puzzle = PUZZLES.find((p) => p.id === puzzleId)!;
  const [comps, setComps] = useState<Comp[]>(() => layoutFor(PUZZLES[0]).comps);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<{ from: string; x: number; y: number } | null>(null);
  const [solvedStars, setSolvedStars] = useState<Record<string, number>>({});

  const svgRef = useRef<SVGSVGElement>(null);
  const compsRef = useRef(comps); compsRef.current = comps;
  const drag = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);
  const wiring = useRef<string | null>(null);
  const hoverPort = useRef<{ id: string; port: number } | null>(null);

  const values = useMemo(() => evaluate(comps, wires), [comps, wires]);
  const result = useMemo(() => checkCircuit(puzzle, comps, wires), [puzzle, comps, wires]);

  useEffect(() => {
    if (result.solved) {
      const stars = starsFor(puzzle, result.gateCount);
      setSolvedStars((s) => (s[puzzle.id] && s[puzzle.id] >= stars ? s : { ...s, [puzzle.id]: stars }));
    }
  }, [result.solved, result.gateCount, puzzle]);

  function toSvg(clientX: number, clientY: number) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) * (SVW / r.width), y: (clientY - r.top) * (SVH / r.height) };
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = toSvg(e.clientX, e.clientY);
      if (drag.current) {
        const d = drag.current;
        setComps((cs) => cs.map((c) => c.id === d.id ? { ...c, x: p.x - d.ox, y: p.y - d.oy } : c));
        d.moved = true;
      } else if (wiring.current) {
        setPending({ from: wiring.current, x: p.x, y: p.y });
      }
    };
    const up = () => {
      if (drag.current) {
        const d = drag.current;
        if (!d.moved) {
          const c = compsRef.current.find((c) => c.id === d.id);
          if (c?.kind === "IN") setComps((cs) => cs.map((x) => x.id === d.id ? { ...x, val: x.val ? 0 : 1 } : x));
          setSelected(d.id);
        }
        drag.current = null;
      }
      if (wiring.current) {
        const hp = hoverPort.current;
        const from = wiring.current;
        if (hp && hp.id !== from) {
          setWires((ws) => [...ws.filter((w) => !(w.to === hp.id && w.toPort === hp.port)),
            { id: nid("w"), from, to: hp.id, toPort: hp.port }]);
        }
        wiring.current = null;
        setPending(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  function addGate(kind: Kind) {
    const c: Comp = { id: nid(kind), kind, x: 320 + (counter % 4) * 90, y: 60 + (counter % 4) * 70 };
    setComps((cs) => [...cs, c]);
  }
  function startWire(id: string, e: React.PointerEvent) {
    e.stopPropagation();
    wiring.current = id;
    const p = toSvg(e.clientX, e.clientY);
    setPending({ from: id, x: p.x, y: p.y });
  }
  function startDrag(id: string, e: React.PointerEvent) {
    const c = comps.find((c) => c.id === id)!;
    const p = toSvg(e.clientX, e.clientY);
    drag.current = { id, ox: p.x - c.x, oy: p.y - c.y, moved: false };
    setSelected(id);
  }
  function deleteSelected() {
    if (!selected) return;
    const c = comps.find((c) => c.id === selected);
    if (c?.fixed) return;
    setComps((cs) => cs.filter((c) => c.id !== selected));
    setWires((ws) => ws.filter((w) => w.from !== selected && w.to !== selected));
    setSelected(null);
  }
  function loadPuzzle(id: string) {
    const p = PUZZLES.find((p) => p.id === id)!;
    counter += 1000;
    const layout = layoutFor(p);
    setPuzzleId(id);
    setComps(layout.comps);
    setWires(layout.wires);
    setSelected(null);
  }
  function clearGates() {
    setComps((cs) => cs.filter((c) => c.fixed));
    setWires([]);
    setSelected(null);
  }

  const wirePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.max(30, Math.abs(x2 - x1) * 0.5);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="app">
      <header>
        <div className="mark">◈</div>
        <div>
          <h1>CIRCUIT PUZZLE</h1>
          <p>Match the truth table with the fewest gates — logic design as an interactive challenge</p>
        </div>
        <div className="badges">
          <AuthPanel />
          <div className="badge-links">
            <a className="labbench-badge" href="https://labbench-hub.vercel.app/" target="_blank" rel="noopener noreferrer">⚡ LabBench</a>
            <a className="src" href="https://dhananjay-kumar-seth.vercel.app/" target="_blank" rel="noopener noreferrer">ECE Portfolio · Dhananjay Seth</a>
          </div>
        </div>
      </header>

      <div className="palette">
        <span className="p-label">LEVELS</span>
        {PUZZLES.map((p) => (
          <button key={p.id} className={"level" + (p.id === puzzleId ? " on" : "") + (solvedStars[p.id] ? " done" : "")}
            onClick={() => loadPuzzle(p.id)}>
            {p.name}{solvedStars[p.id] ? " " + "★".repeat(solvedStars[p.id]) : ""}
          </button>
        ))}
      </div>

      <div className="palette">
        <span className="p-label">GATES</span>
        {(["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"] as Kind[]).map((g) => (
          <button key={g} disabled={!puzzle.allowedGates.includes(g)} onClick={() => addGate(g)}>{g}</button>
        ))}
        <span className="sep" />
        <button className="clear" onClick={clearGates}>Clear Gates</button>
        {selected && comps.find((c) => c.id === selected && !c.fixed) &&
          <button className="clear" onClick={deleteSelected}>Delete Selected</button>}
      </div>

      <div className="palette">
        <SaveCircuit
          config={{ puzzleId, comps, wires }}
          onLoad={(c: PuzzleSaveConfig) => {
            counter += 1000;
            setPuzzleId(c.puzzleId); setComps(c.comps); setWires(c.wires); setSelected(null);
          }}
        />
      </div>

      <div className="stage">
        <svg ref={svgRef} viewBox={`0 0 ${SVW} ${SVH}`} className="board" onPointerDown={() => setSelected(null)}>
          <defs>
            <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M 26 0 L 0 0 0 26" fill="none" stroke="#1a0f16" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={SVW} height={SVH} fill="url(#grid)" />

          {wires.map((w) => {
            const fc = comps.find((c) => c.id === w.from), tc = comps.find((c) => c.id === w.to);
            if (!fc || !tc) return null;
            const a = outPort(fc), b = inPort(tc, w.toPort);
            const on = values[w.from] === 1;
            return (
              <path key={w.id} d={wirePath(a.x, a.y, b.x, b.y)} fill="none"
                stroke={on ? "#fb7185" : "#4a3040"} strokeWidth={on ? 3.5 : 2.5}
                className="wire" onClick={(e) => { e.stopPropagation(); setWires((ws) => ws.filter((x) => x.id !== w.id)); }} />
            );
          })}

          {pending && (() => {
            const fc = comps.find((c) => c.id === pending.from); if (!fc) return null;
            const a = outPort(fc);
            return <path d={wirePath(a.x, a.y, pending.x, pending.y)} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 4" />;
          })()}

          {comps.map((c) => {
            const { w, h } = dims(c.kind);
            const out = values[c.id] === 1;
            const isIn = c.kind === "IN", isOut = c.kind === "OUT";
            const disallowed = !isIn && !isOut && !puzzle.allowedGates.includes(c.kind);
            return (
              <g key={c.id} transform={`translate(${c.x},${c.y})`}
                className={"node" + (selected === c.id ? " sel" : "")}
                onPointerDown={(e) => { e.stopPropagation(); startDrag(c.id, e); }}>
                <rect width={w} height={h} rx={isIn || isOut ? 8 : 10}
                  className={isIn ? (c.val ? "c-in on" : "c-in") : isOut ? (out ? "c-out on" : "c-out") : (disallowed ? "c-gate bad" : "c-gate")} />
                <text x={w / 2} y={h / 2} className="glabel">
                  {isIn ? `${c.label}=${c.val}` : isOut ? `${c.label}` : c.kind}
                </text>
                {isOut && <text x={w / 2} y={h / 2 + 13} className="obit">{out ? 1 : 0}</text>}
                {Array.from({ length: numInputs(c.kind) }).map((_, i) => {
                  const p = inPort(c, i);
                  return <circle key={i} cx={p.x - c.x} cy={p.y - c.y} r={6} className="port in-port"
                    onPointerEnter={() => (hoverPort.current = { id: c.id, port: i })}
                    onPointerLeave={() => (hoverPort.current = null)} />;
                })}
                {hasOutput(c.kind) && (() => { const p = outPort(c);
                  return <circle cx={p.x - c.x} cy={p.y - c.y} r={6} className={"port out-port" + (out ? " hot" : "")}
                    onPointerDown={(e) => startWire(c.id, e)} />; })()}
              </g>
            );
          })}
        </svg>

        <aside className="tt">
          <div className="tt-head">{puzzle.name}</div>
          <p className="tt-desc">{puzzle.description}</p>
          <table>
            <thead><tr>
              {puzzle.inputs.map((l) => <th key={l} className="th-in">{l}</th>)}
              {puzzle.outputs.map((l) => <th key={l} className="th-out">{l}</th>)}
            </tr></thead>
            <tbody>
              {result.rows.map((r, i) => (
                <tr key={i} className={r.ok ? "row-ok" : "row-bad"}>
                  {r.inputs.map((b, j) => <td key={j} className={b ? "one" : "zero"}>{b}</td>)}
                  {r.expected.map((b, j) => <td key={j} className={"o " + (b ? "one" : "zero")}>{r.actual[j]}{r.ok ? "" : ` (want ${b})`}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="gate-count">Gates used: <b>{result.gateCount}</b> · par {puzzle.par}</div>
          {result.usedDisallowedGate && <p className="warn-line">✕ Using a locked gate for this level.</p>}
          {result.solved && (
            <div className="solved-banner">
              ✓ SOLVED — {"★".repeat(starsFor(puzzle, result.gateCount))}
              {PUZZLES.findIndex((p) => p.id === puzzleId) < PUZZLES.length - 1 && (
                <button onClick={() => loadPuzzle(PUZZLES[PUZZLES.findIndex((p) => p.id === puzzleId) + 1].id)}>Next Level →</button>
              )}
            </div>
          )}
        </aside>
      </div>

      <p className="hint">
        <b>Click a gate</b> in GATES to add it · <b>drag</b> from a gate's output port ● to an input port to wire ·
        <b> click a wire</b> to delete it · toggle an input by clicking it. Locked gates are greyed out for that level —
        build the function from what's allowed. Fewer gates than <b>par</b> earns 3 stars.
      </p>
      <footer>Same gate-evaluation engine as Logic Circuit Simulator — hand-rolled, no libraries.</footer>
    </div>
  );
}
