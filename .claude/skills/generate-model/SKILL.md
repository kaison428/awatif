---
name: generate-model
description: Turn a scoped building/structure description (geometry, stories, loads, supports) into a runnable Awatif app instance — a folder with its own main.ts + index.html. Use this whenever a structural model needs to be built or regenerated programmatically in this repo, especially multi-story frames. Not for editing Awatif's own engineering core (@awatif/components / @awatif/ui source) — that's extend-awatif-component.
---

# Generate an Awatif model

An Awatif "model" is not a document format — it's a small Awatif **app instance**: a
`main.ts` that builds `Geometry` + `Components` data and wires it into `@awatif/ui`,
plus an `index.html` that boots it. This skill produces exactly that, following the
pattern already used by the repo's own root `main.ts` — don't invent a different shape.

## The data model (ground truth — don't recall this from memory, these are the real types)

- `components/data-model.ts` — `Geometry` (`points`/`lines`/`polygons` as
  `Map<number, [...]>`), `Mesh`, `ComponentsType` enum, `ComponentEntry`
  (`{ id?, name, templateId, geometry: number[], params?, loadCase? }`), `Components`
  (`Map<ComponentsType, ComponentEntry[]>`).
- Units are fixed by convention (see comment at top of root `main.ts`): **positions in
  meters, forces in kilo-Newtons**, angles/moments follow from those. Don't mix units.
- `points`: `Map<pointId, [x, y, z]>`. `lines`: `Map<lineId, [startPointId, endPointId]>`
  — a line is one structural member (column or beam) before meshing.
- Every `ComponentEntry.geometry` is a list of point IDs (point-kind templates, e.g.
  loads/supports) or line/polygon IDs (line/polygon-kind templates, e.g. design,
  distributed loads).
- Registered `templateId`s today, by `ComponentsType` (from `components/templates.ts`):
  - `LOADS`: `point-load`, `distributed-load`
  - `SUPPORTS`: `point-support` (`params.type`: `fixed | pinned | x-roller | y-roller |
    z-roller`)
  - `MESH`: `line-mesh`, `triangle-mesh`
  - `RELEASES`: `releases`
  - `LOCAL_AXES`: `local-axes`
  - `DESIGN`: `generic-member`, `generic-shell`, `concrete-member`, `steel-member`,
    `timber-member`
  - `IMPERFECTIONS`: `imperfections`
  If a project needs a `templateId` that isn't in this list, stop and hand off to
  `extend-awatif-component` — do not fake it with `generic-member`/hardcoded numbers
  unless the brief genuinely calls for a placeholder section.
- Load cases today are one of the literal 3 strings `"dead" | "live" | "wind"`
  (`components/loads/data-model.ts`, `LoadCase` type) — set per `ComponentEntry.loadCase`
  (defaults to `"dead"` if omitted). There is no general load-case system yet; see
  `extend-awatif-component` if the brief needs more than dead/live/wind.

## Building a multi-story frame programmatically

Generate geometry with loops, not by hand-listing every point. Pattern:

```ts
// One grid of columns repeated per story, beams connecting each story's grid.
const bayX = 6; // m, edit per brief
const bayY = 6;
const nBaysX = 3;
const nBaysY = 2;
const storyHeight = 3.5;
const nStories = 5;

const points = new Map<number, [number, number, number]>();
const lines = new Map<number, [number, number]>();
let pid = 1;
let lid = 1;

// pointId(ix, iy, story) — deterministic so columns/beams can reference by grid index
const gridPoint = new Map<string, number>();
function addPoint(ix: number, iy: number, story: number) {
  const key = `${ix},${iy},${story}`;
  if (gridPoint.has(key)) return gridPoint.get(key)!;
  const id = pid++;
  points.set(id, [ix * bayX, story * storyHeight, iy * bayY]);
  gridPoint.set(key, id);
  return id;
}

for (let story = 0; story <= nStories; story++) {
  for (let ix = 0; ix <= nBaysX; ix++) {
    for (let iy = 0; iy <= nBaysY; iy++) {
      const top = addPoint(ix, iy, story);
      if (story > 0) {
        const bottom = gridPoint.get(`${ix},${iy},${story - 1}`)!;
        lines.set(lid++, [bottom, top]); // column
      }
      if (story > 0 && ix > 0) {
        lines.set(lid++, [gridPoint.get(`${ix - 1},${iy},${story}`)!, top]); // beam X
      }
      if (story > 0 && iy > 0) {
        lines.set(lid++, [gridPoint.get(`${ix},${iy - 1},${story}`)!, top]); // beam Y
      }
    }
  }
}
```

Attach components exactly like the repo's root `main.ts` does — a `Map<ComponentsType,
ComponentEntry[]>`. Base-level supports: iterate `story === 0` points and add one
`point-support` component per point (`params: { type: "fixed" }`). Loads: attach
`point-load` or `distributed-load` per story with `loadCase` set. Design/section:
attach a `DESIGN` component (`generic-member`, `steel-member`, etc.) covering every line
— an unassigned line silently falls back to `genericMember`'s defaults, which is a real
QAQC finding (see `qaqc-review`), so assign explicitly.

## Assembling and self-checking (do this before handing off, every time)

Don't just write files and stop — run the pipeline exactly like `main.ts` does, using
the pure-JS solver (no WASM init needed, cheaper for a scripted check):

```ts
import {
  getMesh, getLoads, getSupports, getElementsProps, getReleases,
  getPositionsAndForces, getReactions, templates, ComponentsType,
} from "../../components"; // relative import — see note below

const meshData = getMesh({ geometry: { points, lines }, components, templates });
const loads = getLoads({ components, geometryMapping: meshData.geometryMapping, templates, nodes: meshData.nodes, elements: meshData.elements });
const supports = getSupports({ components, geometryMapping: meshData.geometryMapping, templates });
const releases = getReleases({ components, geometryMapping: meshData.geometryMapping, templates });
const elementsProps = getElementsProps({ components, geometryMapping: meshData.geometryMapping, templates, elements: meshData.elements });

const { positions, internalForces } = getPositionsAndForces(
  meshData.nodes, meshData.elements, loads, supports, elementsProps, releases,
);
const reactions = getReactions(meshData.nodes, meshData.elements, internalForces, loads, supports);
```

Check, and fix before handing off (don't hand a broken model to QAQC):
1. `getPositionsAndForces` didn't throw and `positions` isn't empty for a non-empty mesh
   (an empty result on real geometry usually means an unstable/mechanism model — often a
   missing support).
2. No `NaN`/`Infinity` in `positions` or `internalForces`.
3. Reactions roughly balance total applied load (sum of vertical reaction forces ≈ sum
   of applied vertical loads, within a percent or two) — a large mismatch means a
   modeling error, not a QAQC nuance.
4. Every line has DESIGN coverage (compute unassigned lines exactly like `main.ts` does:
   collect all line IDs referenced by `ComponentsType.DESIGN` entries whose template
   `geometryKind === "line"`, diff against `geometry.lines.keys()`).

This is a self-check, not the QAQC pass — it catches "this doesn't run," QAQC checks
"this is right for the brief."

## Module resolution (practical, not a fix for the underlying issue)

There's no declared npm `workspaces` field in the root `package.json`, so `@awatif/*`
specifiers only resolve from repo root today. Generated model folders should import via
**relative paths** back to the source (`../../components`, `../../ui` from
`models/<name>/main.ts`), not `@awatif/components`/`@awatif/ui` — that's the only path
proven to work without touching the root package.json. If this becomes a recurring
friction point, that's a small standalone fix (add `"workspaces": ["components", "ui"]`
to root `package.json`) — flag it, don't silently work around it every time.

## Output

Create `models/<project-name>/`:
- `main.ts` — adapted from root `main.ts`: same `Geometry`/`Components`/`Display`/`Mesh`
  wiring and `van.derive` analysis pipeline, but with this project's generated
  points/lines/components instead of the demo data, and relative imports per above.
- `index.html` — copy of root `index.html` with `<script type="module" src="./main.ts">`
  (already relative, no change needed) and an updated `<title>`.

Tell the user how to preview it: `npx vite --root models/<project-name> --open` (needs
`node_modules` at repo root, so run from repo root).
