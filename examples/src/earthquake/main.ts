import { app, Model } from "../../../awatif-ui/";
import { Node, Element, AnalysisInput, LoadAnalysisInput } from "../../../awatif-data-structure";
import { analyzeDynamically } from "./analyzeDynamically.ts";
import { loadTimeHistoryFromCSV } from "./dataParser.ts";

const nodes: Node[] = [
  [0, 0, 0],
  [0, 0, 2],
  [2, 0, 0],
  [2, 0, 2],
  [0, 0, 4],
  [2, 0, 4],
];

const elements: Element[] = [
  [0, 1],
  [2, 3],
  [1, 3],
  [1, 4],
  [3, 5],
  [4, 5],
  // [0, 3],
  // [1, 5],
];

const massMomentOfInertia: number =  0.01;

const analysisInputs: AnalysisInput[] = [
  {
    node: 0,
    support: [true, true, true, true, true, true],
  },
  {
    node: 2,
    support: [true, true, true, true, true, true],
  },
  {
    node: 0,
    mass: [1, 1, 1, massMomentOfInertia, massMomentOfInertia, massMomentOfInertia],
  },
  {
    node: 1,
    mass: [1, 1, 1, massMomentOfInertia, massMomentOfInertia, massMomentOfInertia],
  },
  {
    node: 2,
    mass: [1, 1, 1, massMomentOfInertia, massMomentOfInertia, massMomentOfInertia],
  },
  {
    node: 3,
    mass: [1, 1, 1, massMomentOfInertia, massMomentOfInertia, massMomentOfInertia],
  },
  {
    node: 4,
    mass: [1, 1, 1, massMomentOfInertia, massMomentOfInertia, massMomentOfInertia],
  },
  {
    node: 5,
    mass: [1, 1, 1, massMomentOfInertia, massMomentOfInertia, massMomentOfInertia],
  },
  {
    element: 0,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1,
  },
  {
    element: 1,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1,
  },
  {
    element: 2,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1,
  },
  {
    element: 3,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1,
  },
  {
    element: 4,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1,
  },
  {
    element: 5,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1,
  },
  {
    element: 6,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1,
  },
  {
    element: 7,
    elasticity: 70,
    area: 100,
    momentOfInertiaZ: 1,
    momentOfInertiaY: 1,
  },
];

const timeHistoryAnalysisInputs: Record<number, LoadAnalysisInput> = await loadTimeHistoryFromCSV("./data/GM_1.csv", 0);

const dynamicSettings = {
  time: 20,
  timeStep: 0.001,
};

const analysisOutputs = analyzeDynamically(
  nodes,
  elements,
  analysisInputs,
  timeHistoryAnalysisInputs,
  dynamicSettings
);

// TODO:
// 1. create a sample ground motion (e.g. GM_1) and store as json - done
// 2. incorporate that into analysis module, under external forces that vary based on timesteps - todo!
// 3. connect file data to analysis module thru parameters maybe?
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
