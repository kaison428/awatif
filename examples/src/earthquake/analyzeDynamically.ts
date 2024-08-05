import {
  PositionAnalysisOutput,
  AnalysisOutputs,
  MassAnalysisInput,
  FrameAnalysisInput,
  Node,
  Element,
  AnalysisInput,
  LoadAnalysisInput,
} from "../../../awatif-data-structure";
import * as math from "mathjs";

export function analyzeDynamically(
  nodalCoordinates: Node[],
  elements: Element[],
  analysisInputs: AnalysisInput[],
  timeHistoryAnalysisInputs: Record<number, LoadAnalysisInput>,
  { time: t, timeStep: dt }: { time: number; timeStep: number }
): AnalysisOutputs {
  const analysisOutputs: AnalysisOutputs = {};

  // TESTING
  const numSteps: number = math.floor(t / dt);

  // define constants
  const coordToNode = [
    { initDim: 0, newDim: 0 },
    { initDim: 1, newDim: 1 },
    { initDim: 2, newDim: 2 },
  ];

  const nodeToCoord = [
    { initDim: 0, newDim: 0 },
    { initDim: 1, newDim: 1 },
    { initDim: 2, newDim: 2 },
  ];

  // define position, velocity, and mass vectors
  const nodes: number[][] = nodalCoordinates.map((coord) =>
    convertVector(coord, 6, coordToNode)
  );

  let x = nodes.flat();
  let v = Array(x.length).fill(0) as number[];
  let m = nodes
    .map((_, nid) => {
      const massAnalysisInput = analysisInputs.find(
        (a) => "mass" in a && "node" in a && a.node === nid
      ) as MassAnalysisInput;
      return massAnalysisInput?.mass ?? [0, 0, 0, 0, 0, 0];
    })
    .flat();

  // forward euler formulation
  for (let step = 0; step < numSteps; step++) {
    let xn = x;
    let y = math.chain(x).add(math.multiply(v, dt)).done();

    console.log("F(x): ", F(x, nodes, elements, analysisInputs));

    x = math.add(
      y,
      math
        .chain(F(x, nodes, elements, analysisInputs))
        .dotDivide(m)
        .multiply(dt ** 2)
        .done()
    ) as number[];

    v = math.chain(x).subtract(xn).divide(dt).done() as number[];

    // enforce constraints
    analysisInputs.forEach((a) => {
      if ("node" in a && "support" in a) {
        const nid = a.node;
        a.support.forEach((s, i) => {
          if (s) x[i + nid * a.support.length] = nodes[nid][i];
        });
      }
    });

    // store
    let output: PositionAnalysisOutput[] = [];
    const dofs: any = getDOFs(nodes);

    nodes.forEach((_, nid) => {
      const currPosition = math.subset(x, math.index(dofs[nid]));

      const currCoord = convertVector(
        currPosition,
        3,
        nodeToCoord
      ) as PositionAnalysisOutput["position"];
      output.push({
        node: nid,
        position: currCoord,
      });
    });

    console.log("output:", output);

    analysisOutputs[step] = output;
  }

  return analysisOutputs;
}

/**
 * Calculate nodal forces based on current geometry and loading conditions in the XZ plane.
 * This function will do the conversion internally.
 * The output will be in three-dimensional space.
 */
export function F(
  x: number[],
  nodes: number[][],
  elements: Element[],
  analysisInputs: AnalysisInput[]
): number[] {
  // convert nodes to XZ plane coordinates
  const conversion2D = [
    { initDim: 0, newDim: 0 },
    { initDim: 2, newDim: 1 },
    { initDim: 4, newDim: 2 },
  ];
  const xzNodes = nodes.map((node) => convertVector(node, 3, conversion2D));

  // convert positional vector x to XZ plane coordinates
  const xExpanded: number[][] = nodes.map((node, i) =>
    node.map((_, j) => x[i * node.length + j])
  );
  const xzX: number[] = xExpanded
    .map((x) => convertVector(x, 3, conversion2D))
    .flat();

  // force calculation
  const numDOFs2D = 3;
  let f_nodal: number[] = Array(xzNodes.length * numDOFs2D).fill(0);

  // external force
  let f_ext: number[] = Array(xzNodes.length * numDOFs2D).fill(0);
  analysisInputs.forEach((item) => {
    if ("load" in item) {
      const xzLoad = convertVector(item.load, 3, conversion2D);
      xzLoad.forEach((loadValue, index) => {
        const position = item.node * xzLoad.length + index;
        f_ext[position] += (f_ext[position] || 0) + loadValue;
      });
    }
  });

  console.log("f_ext", f_ext);

  f_nodal = math.add(f_nodal, f_ext);

  // find global displacement vector at time n
  let d_global: number[] = math.subtract(xzX, xzNodes.flat());

  // elastic force
  elements.forEach((e, eid) => {
    const dofs: any = getDOFs(xzNodes);

    const n1_dof: number[] = dofs[e[0]];
    const n2_dof: number[] = dofs[e[1]];

    const edgeProperties: FrameAnalysisInput = analysisInputs.find((item) => {
      if (
        "element" in item &&
        "elasticity" in item &&
        "area" in item &&
        "momentOfInertiaZ" in item &&
        "momentOfInertiaY" in item
      ) {
        return item.element === eid;
      }
      return false;
    }) as FrameAnalysisInput;

    const dof_local: number[] = n1_dof.concat(n2_dof);

    const x1 = xzNodes[e[0]];
    const x2 = xzNodes[e[1]];

    const Ti: number[][] = findT2DFrame(x1, x2);
    const k_local = findKLocal(x1, x2, edgeProperties);

    const d_local = math.multiply(
      Ti,
      math.subset(d_global, math.index(dof_local))
    );

    const f_member = math.multiply(k_local, d_local);

    // transform force in member axis to nodal axis

    f_nodal = math.subset(
      f_nodal,
      math.index(dof_local),
      math.subtract(
        math.subset(f_nodal, math.index(dof_local)),
        math.multiply(math.transpose(Ti), f_member)
      )
    );
  });

  console.log("f_nodal = " + f_nodal);

  const conversion3D = [
    { initDim: 0, newDim: 0 },
    { initDim: 1, newDim: 2 },
    { initDim: 2, newDim: 4 },
  ];

  const f_nodal_expanded = xzNodes.map((node, i) =>
    node.map((_, j) => f_nodal[i * node.length + j])
  );
  const f_nodal_3D = f_nodal_expanded.map((f) =>
    convertVector(f, 6, conversion3D)
  );

  return f_nodal_3D.flat();
}

// utility functions ---------------------------------------------------------------
function findT2DFrame(x1: number[], x2: number[]): number[][] {
  const d: number[] = math.subtract(x1.slice(0, 2), x2.slice(0, 2));
  const i: number[] = [1, 0];
  const j: number[] = [0, 1];

  const length: number = math.norm(d) as number;

  const cos: number = math.dot(d, i) / length;
  const sin: number = math.dot(d, j) / length;

  return [
    [cos, sin, 0, 0, 0, 0],
    [-sin, cos, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, cos, sin, 0],
    [0, 0, 0, -sin, cos, 0],
    [0, 0, 0, 0, 0, 1],
  ];
}

function findKLocal(
  x1: number[],
  x2: number[],
  edgeProperties: FrameAnalysisInput
): number[][] {
  const d: number[] = math.subtract(x2, x1);

  const L: number = math.norm(d) as number;
  const A: number = edgeProperties.area as number;
  const E: number = edgeProperties.elasticity as number;
  const I: number = edgeProperties.momentOfInertiaZ as number; // assume strong axis bending

  return [
    [(A * E) / L, 0, 0, (-A * E) / L, 0, 0],
    [
      0,
      (12 * E * I) / L ** 3,
      (6 * E * I) / L ** 2,
      0,
      (-12 * E * I) / L ** 3,
      (6 * E * I) / L ** 2,
    ],
    [
      0,
      (6 * E * I) / L ** 2,
      (4 * E * I) / L,
      0,
      (-6 * E * I) / L ** 2,
      (2 * E * I) / L,
    ],
    [(-A * E) / L, 0, 0, (A * E) / L, 0, 0],
    [
      0,
      (-12 * E * I) / L ** 3,
      (-6 * E * I) / L ** 2,
      0,
      (12 * E * I) / L ** 3,
      (-6 * E * I) / L ** 2,
    ],
    [
      0,
      (6 * E * I) / L ** 2,
      (2 * E * I) / L,
      0,
      (-6 * E * I) / L ** 2,
      (4 * E * I) / L,
    ],
  ];
}

function getDOFs(nodes: number[][]): { node: number[] } {
  let dofs: any = {};

  nodes.forEach((node, nid) => {
    const dof_loc = Array(node.length).fill(0) as number[];
    dofs[nid] = dof_loc.map((_, i) => i + node.length * nid);
  });

  return dofs;
}

function convertVector(
  vector: number[],
  numDim: number,
  conversions: { initDim: number; newDim: number }[]
): number[] {
  let newVector: number[] = Array(numDim).fill(0) as number[];

  conversions.forEach((c) => {
    newVector[c.newDim] = vector[c.initDim];
  });

  return newVector;
}
