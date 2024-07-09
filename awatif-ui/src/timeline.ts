import van from "vanjs-core";
import { ModelState, SettingsState } from "./types";
import { GoogleCharts } from "google-charts";

import "./styles/timeline.css";

// todo: convert from vanjs templates to lit-html
export function timeline(modelState: ModelState, settingsState: SettingsState) {
  const { button, div, input } = van.tags;

  const frame = van.state(0); // the frame in consideration
  const isPlayed = van.state(false);
  const fps = 30; // default value
  const dt = settingsState.dynamicSettings.val.timeStep;
  const frameIncrement = Math.floor(1 / dt / fps);

  const numFrames = modelState.val.analysisOutputs.position.size - 1;

  const isGraphUpdated = van.state(false);
  const file = van.state(new File([""], "null"));
  const fileData = van.state([[0]]);

  // TODO
  // 1. add graph element here
  // 2. add a sample ground motion input here for demo purposes
  const uploadButton = () =>
    div(
      { id: "upload-button" },
      input({
        type: "file",
        id: "inputFile",
        accept: ".csv",
        oninput: (e) => {
          file.val = e.target.files[0];
          isGraphUpdated.val = false;
        },
      })
    );

  const graph = () => div({ id: "chart" });

  const slider = () =>
    div(
      { class: "slidecontainer" },
      input({
        type: "range",
        min: "0",
        max: numFrames,
        value: "0",
        class: "slider",
        id: "playerBar",
        oninput: (e) => {
          frame.val = Number(e.target.value);
          isPlayed.val = false;
        },
      })
    );

  const playButton = () =>
    div(
      { class: "player-button", onclick: () => (isPlayed.val = !isPlayed.val) },
      button({
        role: "play",
        class: () => (isPlayed.val ? "play hidden" : "play"),
      }),
      button({
        role: "pause",
        class: () => (isPlayed.val ? "pause" : "pause hidden"),
      })
    );

  const player = () => div({ class: "player" }, playButton(), slider());

  van.add(document.body, uploadButton());
  van.add(document.body, graph());
  van.add(document.body, player());

  // events -----------------------------------

  // change nodes positions according to frame state (note. state.val is immutable)
  van.derive(() => {
    // Update model geometry
    let newModel = structuredClone(modelState.val);
    newModel.nodes =
      modelState.val.analysisOutputs.position.get(frame.val) ?? [];
    modelState.val = newModel;

    console.log(file.val);

    //Load the charts library with a callback
    GoogleCharts.load("current", { packages: ["corechart"] });
    window.onresize = () => (isGraphUpdated.val = false);
  });

  // animate slider value
  setInterval(async () => {
    if (isPlayed.val) {
      const playBar = document.getElementById("playerBar") as HTMLInputElement;
      const newFrameVal = Math.min(numFrames, frame.val + frameIncrement); // cap frame value to numFrames
      if (newFrameVal === numFrames) isPlayed.val = false;
      playBar.value = newFrameVal.toString();
      frame.val = newFrameVal;
    }

    if (file.val.name != 'null' && !isGraphUpdated.val) {
      console.log("drawing graph...");
      await loadDataFromFile();
      GoogleCharts.load(drawChart, { packages: ["corechart"] });
      isGraphUpdated.val = true;
    }
  }, 1000 / fps);

  async function loadDataFromFile() {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result);
        if (text) {
          const rows = text.split("\n").slice(1);
          const interval = Math.floor(rows.length / 100);
          fileData.val = rows
            .map((row) => row.split(",").map(Number))
            .filter((row, i) => row.length == 2 && i % interval == 0);
            
          resolve();
        } else {
          reject(new Error("No text found in file"));
        }
      };
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsText(file.val);
    });
  }

  function drawChart() {
    // Set Data
    const header = ["time", "val"];
    console.log(fileData.val);
    const data = GoogleCharts.api.visualization.arrayToDataTable([
      header,
      ...fileData.val,
    ]);

    // Set Options
    const options = {
      legend: "none",
      backgroundColor: {
        fill: "black",
        fillOpacity: 0,
      },
      hAxis: {
        gridlines: { color: "black", opacity: 0 },
        minorGridlines: { color: "black", opacity: 0 },
        baselineColor: { fill: "black", opacity: 0 },
        textPosition: "none",
      },
      vAxis: {
        gridlines: { color: "black", opacity: 0 },
        minorGridlines: { color: "black", opacity: 0 },
        baselineColor: { fill: "black", opacity: 0 },
        textPosition: "none",
      },
      chartArea: {
        left: 35,
        bottom: 35,
        top: 0,
        width: "100%",
      },
      annotations: {
        alwaysOutside: false,
        textStyle: {
          fontSize: 0, // Set font size to 0 to hide text labels
          auraColor: "none", // Remove the aura/background color around the text
        },
      },
    };
    // Draw
    const chart = new GoogleCharts.api.visualization.LineChart(
      document.getElementById("chart")
    );
    chart.draw(data, options);
  }
}
