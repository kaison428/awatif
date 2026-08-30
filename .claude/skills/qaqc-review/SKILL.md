---
name: qaqc-review
description: Independently review a generated Awatif model (models/<name>/) against its brief using checks computable from the model's own data — not a prose read-through. Use this after generate-model produces or updates a model, before it's considered done.
---

# QAQC review of an Awatif model

Re-derive the mesh/loads/supports/analysis from the model's `main.ts` yourself — don't
trust the modeler's self-report of what it built. Every check below is computable from
data already exported by `@awatif/components` (see `components/index.ts`); this is a
checklist against real signals, not a subjective read.

Load the model's geometry/components (read `models/<name>/main.ts`, or better, import
its data if it's factored into a separate module) and run the same pipeline
`generate-model`'s self-check uses: `getMesh` → `getLoads`/`getSupports`/`getReleases`/
`getElementsProps` → `getPositionsAndForces` → `getReactions` → `getDesigns`.

## Checklist

1. **Solve succeeded.** `getPositionsAndForces` didn't throw, `positions` is non-empty
   for non-empty geometry, no `NaN`/`Infinity` anywhere in `positions` or
   `internalForces`. A thrown error or empty result on real geometry is almost always an
   unstable model (commonly: a story with no lateral restraint, or a support left off a
   column base) — fail, name the likely cause, send back to modeler.

2. **Global equilibrium.** Sum the vertical (and horizontal, if lateral loads exist)
   components of `getReactions`'s output; compare against the sum of applied loads from
   `getLoads` for the same load case. They should balance within a percent or two —
   float/rounding tolerance only. A larger mismatch is a real modeling defect (sign
   error, double-counted or missing load), not noise.

3. **Design coverage — no silently-defaulted members.** Compute unassigned lines the
   same way `main.ts` does: collect line IDs referenced by `ComponentsType.DESIGN`
   entries whose template has `geometryKind === "line"`, diff against
   `geometry.lines.keys()`. Any line left over is silently using `genericMember`'s
   generic 250×250 section defaults — flag every one by line ID; this is never a pass
   unless the brief explicitly calls for placeholder sections.

4. **Support completeness.** For every column line whose bottom node is meant to be a
   foundation (typically `story === 0` in a multi-story generation), confirm a
   `ComponentsType.SUPPORTS` entry's `geometry` list includes that point ID. A base-level
   column point with no support component is a floating node — fail, name the point ID.

5. **Load-case coverage.** Every distinct `loadCase` value actually used across
   `ComponentsType.LOADS` entries should be represented in whatever load combinations the
   model uses for design (today: `"uls-live"`/`"uls-wind"` per
   `components/loads/data-model.ts`, or the project's own combinations if
   `extend-awatif-component`'s load-combination work has landed). A load case defined but
   never combined is a load silently excluded from design — flag it.

6. **Design check results, not just "did it run."** Where `ComponentsType.DESIGN`
   entries use a code-check template (`concrete-member`, `steel-member`,
   `timber-member`), read `getDesigns`'s output for that line/polygon and check for
   failing utilization (each design template's `getDesign` returns its own
   pass/fail-bearing fields — read the specific template's `data-model.ts`/`getDesign.ts`
   for the exact shape rather than assuming a common field name). A model that "runs
   clean" but has overstressed members is not a pass.

7. **Brief conformance.** Re-read the original brief (story count, bay layout, story
   heights, occupancy/loading intent) against the actual generated `points`/`lines` and
   attached loads — story count and grid dimensions are trivially verifiable by counting
   `points`/reading their coordinates; don't skip this because the numeric checks above
   passed.

## Reporting

Report as a pass/fail list, each failing item naming the specific `templateId`, line ID,
point ID, or load case at fault — e.g. "FAIL: lines 14, 22 have no DESIGN component
(defaulting to genericMember 250×250)" — not "some members may need review." This goes
back to the modeler to fix; QAQC does not edit the model itself.
