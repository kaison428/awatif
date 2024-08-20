import { LoadAnalysisInput } from "../../../awatif-data-structure";

/**
 * Load time history data from the CSV file from the filepath provided.
 * Acceleration is expected to be uniaxial.
 * Acceleration data will be assigned to the specified dimension.
 */
export async function loadTimeHistoryFromCSV(
  filepath: string,
  dimension: number
): Promise<Record<number, LoadAnalysisInput>> {
  return new Promise<Record<number, LoadAnalysisInput>>((resolve, reject) => {
    fetch(filepath)
      .then((res) => res.text())
      .then((text) => {
        if (!text) {
          reject(new Error("No text found in file"));
        }

        const rows = text.split("\r\n").slice(1); // skip header
        const timeHistoryAnalysisInputs: Record<number, LoadAnalysisInput> = {}; // use LoadAnalysisInput as a temporary solution
        rows.forEach((row) => {
          const data = row.split(",").map(Number);
          const time: number = data[0];
          const accelVal: number = data[1];

          let accelAnalysisInput: [
            number,
            number,
            number,
            number,
            number,
            number
          ] = [0, 0, 0, 0, 0, 0];
          accelAnalysisInput[dimension] = accelVal;

          timeHistoryAnalysisInputs[time] = {
            node: -1,
            load: accelAnalysisInput,
          };
        });

        console.log("Time history analysis", timeHistoryAnalysisInputs);

        resolve(timeHistoryAnalysisInputs);
      });
  });
}
