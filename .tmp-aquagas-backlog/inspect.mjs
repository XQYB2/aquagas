import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/Acer/Downloads/AquaGas_ Sprint Backlog.xlsx";
const workDir = "C:/xampp/htdocs/aquagas1/.tmp-aquagas-backlog";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 12,
  tableMaxCols: 14,
  tableMaxCellChars: 140,
});
console.log(summary.ndjson);

await fs.mkdir(`${workDir}/previews-before`, { recursive: true });
const sheetInfo = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
console.log(sheetInfo.ndjson);
const names = [...sheetInfo.ndjson.matchAll(/"name":"([^"]+)"/g)].map((m) => m[1]);
for (const name of [...new Set(names)]) {
  try {
    const preview = await workbook.render({ sheetName: name, autoCrop: "all", scale: 1, format: "png" });
    const safe = name.replace(/[^a-z0-9_-]+/gi, "_");
    await fs.writeFile(`${workDir}/previews-before/${safe}.png`, new Uint8Array(await preview.arrayBuffer()));
  } catch (error) {
    console.error(`RENDER_FAIL ${name}: ${error.message}`);
  }
}
