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
  const csvFile = new File([""], filepath);

  return new Promise<Record<number, LoadAnalysisInput>>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);

      if (!text) {
        reject(new Error("No text found in file"));
      }

      const rows = text.split("\n").slice(1); // skip header
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

      resolve(timeHistoryAnalysisInputs);
    };

    reader.onerror = () => reject(new Error("Error reading file"));
    reader.readAsText(csvFile);
  });
}
