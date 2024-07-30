// ref: https://neu-se.github.io/CS4530-Spring-2024/tutorials/week1-unit-testing

import * as math from "mathjs";

import { Element, AnalysisInput } from "../../../../awatif-data-structure";

import { F } from "../analyzeDynamically";

describe("dynamic analysis for frame elements with condensed dimensions (i.e. 3 DOFs)", () => {
  test("force calculation for 2D cantilever on the XZ plane", () => {
    const x: number[] = [0, 0, 0, 0, 0, 0, 0.333333333333333, 0, 1, 0, 0.5, 0];
    const nodes: number[][] = [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0],
    ];
    const elements: Element[] = [[0, 1]];
    const analysisInputs: AnalysisInput[] = [
      {
        node: 1,
        load: [1, 0, 0, 0, 0, 0],
      },
      {
        element: 0,
        elasticity: 1,
        area: 1,
        momentOfInertiaZ: 1,
        momentOfInertiaY: 1,
      },
    ];

    expect(math.round(F(x, nodes, elements, analysisInputs))).toStrictEqual([
      -1, 0, 0, 0, -1, 0, 1, 0, 0, 0, 0, 0,
    ]);
  });
});
