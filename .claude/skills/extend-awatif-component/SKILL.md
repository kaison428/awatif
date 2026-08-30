---
name: extend-awatif-component
description: Add a missing capability to Awatif's engineering core (components/) or UI (ui/) itself, using Awatif's own template/plugin system — not a one-off workaround inside a single model. Use this whenever a model needs a templateId, load case, design check, or component type that doesn't exist yet in components/templates.ts. Not for building a specific project's model — that's generate-model.
---

# Extend Awatif's component system

Awatif is already built to be extended this way — don't invent a parallel mechanism.
Every domain (loads, supports, mesh, design, releases, local axes, imperfections) is a
`Map<ComponentsType, Map<templateId, Template>>` registered in `components/templates.ts`,
where each `Template` implements a typed interface declared in that domain's
`data-model.ts` (e.g. `LoadTemplate` in `components/loads/data-model.ts`,
`SupportTemplate` in `components/supports/data-model.ts`, `DesignTemplate` in
`components/design/data-model.ts`). "Adding a component" means writing one of these and
registering it — nothing more exotic.

## Extension points (the real interfaces — check the actual file before implementing,
these can drift)

| Domain | Interface | File | Registry key |
|---|---|---|---|
| Loads | `LoadTemplate<Params>` | `components/loads/data-model.ts` | `ComponentsType.LOADS` |
| Supports | `SupportTemplate<Params>` | `components/supports/data-model.ts` | `ComponentsType.SUPPORTS` |
| Mesh | `MeshTemplate` / `PolygonMeshTemplate` | `components/mesh/data-model.ts` | `ComponentsType.MESH` |
| Design | `DesignTemplate<Params, Design>` | `components/design/data-model.ts` | `ComponentsType.DESIGN` |
| Releases | (see `components/releases/data-model.ts`) | — | `ComponentsType.RELEASES` |
| Local axes | `LocalAxesTemplate` | `components/local-axes/data-model.ts` | `ComponentsType.LOCAL_AXES` |
| Imperfections | (see `components/imperfections/imperfections.ts`) | — | `ComponentsType.IMPERFECTIONS` |

Every template needs `name`, `geometryKind` (`"point" | "line" | "polygon"`),
`defaultParams`, `getParamsTemplate` (the `lit-html` UI form), and the domain-specific
compute function (`getLoad`, `getSupport`, `getElementsProps`/`getDesign`, etc.).
Register it in `components/templates.ts` under the right `ComponentsType`, and export any
new public type from `components/index.ts` if downstream code needs it.

## The repo's own pattern for new engineering capability

Don't write ad hoc code — this codebase has a consistent, load-bearing precedent: **spec
doc → typed implementation → colocated vitest**. Follow it:
1. A markdown spec doc laying out the formula/algorithm/data model, worked examples, and
   known limitations — see `components/design/steel-member/eurocode-steel-design-checks.md`,
   `components/design/concrete-member/ec2_design_checks.md`,
   `components/design/timber-member/eurocode5-timber-design-checks.md` for the expected
   depth and shape.
2. A typed implementation matching the spec, e.g.
   `components/design/steel-member/steelMember.ts` (the `DesignTemplate`) plus any pure
   helper functions.
3. A colocated `*.test.ts` (vitest) exercising the worked example(s) from the spec doc —
   e.g. `components/design/steel-member/getDesign.test.ts`.

If you're implementing against a spec doc that already exists in the repo, treat it as
the source of truth over anything you'd otherwise guess.

## Worked example: general load combinations (do this as the first real exercise, not
as part of scaffolding)

This is the concrete case that motivated this skill. Today's state:
- Implemented (`components/loads/data-model.ts`): `LoadCase = "dead" | "live" | "wind"`,
  a hardcoded `ULS_COMBINATIONS` record with exactly 2 fixed combinations
  (`"uls-live"`, `"uls-wind"`) and fixed factors. `getLoads.ts` reads this directly by
  literal string comparison (`activeLoadCase === "uls-live" || ... === "uls-wind"`).
- Spec, already written but unimplemented:
  `components/loads/uls-load-combination-spec.md` — general EN 1990 Eq. 6.10, arbitrary
  `LoadCase` objects (`{ id, name, type, category, psi0, group }`), a
  `LoadCombination` (`{ id, name, entries: [{loadCaseId, factor}] }`), the
  `generateULSCombinations(loadCases)` algorithm (leading/accompanying variable actions,
  mutually-exclusive groups, envelope logic).

Implementing it means:
- Replacing the hardcoded `LoadCase`/`LoadCombination`/`ULS_COMBINATIONS` types in
  `components/loads/data-model.ts` with the spec's data model, and implementing
  `generateULSCombinations` per the spec's algorithm.
- Reworking `getLoads.ts`'s combination branch: instead of `activeLoadCase === "uls-live"
  | "uls-wind"` string checks and a fixed lookup table, resolve the active
  `LoadCombination`'s `entries` and apply each `{loadCaseId, factor}` — this is a real
  behavior change to a call site, not additive.
  - `ComponentEntry.loadCase` (currently typed `LoadCase` = a fixed string literal) needs
    to become a reference to a user-defined `LoadCase.id` instead.
- Updating `main.ts`'s `display.loadCase` state and `LOAD_SELECTION_LABELS` (currently
  keyed on the fixed literals) to be driven by whatever load cases/combinations exist in
  the project rather than a fixed enum.
- A `*.test.ts` reproducing the spec's worked example (5 predefined load cases → 4
  combinations, verifying the W1/W2 mutual-exclusion behavior) as the acceptance check.

Write a spec-doc-conformant implementation, don't invent new factors/logic — the ψ₀
values, partial factors, and combination algorithm are already fully specified.

## Guardrail

Never patch around a missing capability inside one project's `models/<name>/main.ts` —
that fixes one model and leaves the gap for the next. If `generate-model` hits a wall
(missing `templateId`, missing load-case flexibility, missing design check), come here
first.
