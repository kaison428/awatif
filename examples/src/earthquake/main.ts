import { app, Model } from "../../../awatif-ui/";
import { Node, Element, AnalysisInput } from "../../../awatif-data-structure";
import { analyzeDynamically } from "./analyzeDynamically.ts";

const nodes: Node[] = [
  [0, 0, 0],
  [0, 0, 2],
  [2, 0, 0],
  [2, 0, 2],
  [0, 0, 4],
  [2, 0, 4]
];

const elements: Element[] = [
  [0, 1],
  [2, 3],
  [1, 3],
  [1, 4],
  [3, 5],
  [4, 5]
];

const analysisInputs: AnalysisInput[] = [
  {
    node: 0,
    support: [true, true, true],
  },
  {
    node: 2,
    support: [true, true, true],
  },
  {
    node: 5,
    load: [-2, 0, 0],
  },
  {
    node: 0,
    mass: [1, 1, 1],
    
  },
  {
    node: 1,
    mass: [1, 1, 1],
    
  },
  {
    node: 2,
    mass: [1, 1, 1],
  },
  {
    node: 3,
    mass: [1, 1, 1],
    
  },
  {
    node: 4,
    mass: [1, 1, 1],
    
  },
  {
    node: 5,
    mass: [1, 1, 1],
  },
  {
    element: 0,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1

  },
  {
    element: 1,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1
  },
  {
    element: 2,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1

  },
  {
    element: 3,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1
  },
  {
    element: 4,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1

  },
  {
    element: 5,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1
  },
];

const dynamicSettings = {
  time: 10,
  timeStep: 0.001,
};

const analysisOutputs = analyzeDynamically(
  nodes,
  elements,
  analysisInputs,
  dynamicSettings
);

app({
  onParameterChange: (): Model => ({
    nodes,
    elements,
    analysisInputs,
    analysisOutputs,
  }),
  settings: {
    gridSize: 10,
    dynamic: true,
    loads: false,
    dynamicSettings: dynamicSettings,
  },
});
