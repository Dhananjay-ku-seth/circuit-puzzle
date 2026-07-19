# Circuit Puzzle

A logic-design puzzle game: match a target truth table using as few gates as possible. Some levels lock
out the "obvious" gate to force you to actually compose one from scratch.

Part of the [LabBench](https://labbench-hub.vercel.app/) suite of interactive engineering tools.

**Live demo:** https://circuit-puzzle.vercel.app/

## Features
- 6 levels of increasing difficulty: Basic AND/OR warm-ups, XOR built from AND/OR/NOT only, a Half
  Adder, a 3-input Majority Vote, and a 2:1 Multiplexer built from AND/OR/NOT only
- Live truth-table diffing — every row shows correct/incorrect as you wire, no "submit" button needed
- Star rating (1–3) based on gate count vs. each level's par
- Locked gates are greyed out per-level, forcing real synthesis instead of reaching for the matching
  built-in gate

## LabBench Pro
Sign in to save and reload an in-progress attempt — part of the same optional ₹29/mo LabBench Pro
subscription as the rest of the suite. Upgrade from
[Logic Circuit Simulator](https://logic-circuit-sim.vercel.app/), which hosts the checkout for all the
LabBench tools.

## Tech
React + TypeScript + Vite. Same hand-rolled iterative-relaxation gate-evaluation engine as Logic Circuit
Simulator, reused as-is — no libraries. Auth/save-load via Supabase (Postgres + RLS).

## Run locally
```sh
npm install
npm run dev
```

_Built by Dhananjay Kumar Seth — part of [LabBench](https://labbench-hub.vercel.app/)._
