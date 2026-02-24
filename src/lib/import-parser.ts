export interface ParsedFile {
  columns: string[];
  sampleRows: Record<string, string>[]; // first 50 rows
  totalRows: number;
  allRows: Record<string, string>[]; // ALL rows (for execution phase)
}

/**
 * Parse a CSV string according to RFC 4180.
 * Handles quoted fields (including embedded commas, quotes, and newlines),
 * BOM markers, \r\n and \n line endings, and trailing commas.
 */
function parseCSVString(text: string): string[][] {
  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows: string[][] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row: string[] = [];

    // Parse each field in the row
    while (i < len) {
      if (text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        let field = "";
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              // Escaped quote ""
              field += '"';
              i += 2;
            } else {
              // Closing quote
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);

        // After closing quote, expect comma, newline, or EOF
        if (i < len && text[i] === ",") {
          i++; // skip comma, continue to next field
        } else if (i < len && text[i] === "\r" && i + 1 < len && text[i + 1] === "\n") {
          i += 2; // skip \r\n
          break; // end of row
        } else if (i < len && text[i] === "\n") {
          i++; // skip \n
          break; // end of row
        } else {
          // EOF or unexpected character
          break;
        }
      } else {
        // Unquoted field — read until comma or newline
        let field = "";
        while (i < len && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i];
          i++;
        }
        row.push(field);

        if (i < len && text[i] === ",") {
          i++; // skip comma, continue to next field
        } else if (i < len && text[i] === "\r" && i + 1 < len && text[i + 1] === "\n") {
          i += 2; // skip \r\n
          break; // end of row
        } else if (i < len && text[i] === "\n") {
          i++; // skip \n
          break; // end of row
        } else {
          // EOF
          break;
        }
      }
    }

    // Skip completely empty rows (a row with a single empty string from trailing newline)
    if (row.length === 1 && row[0] === "" && i >= len) {
      continue;
    }

    rows.push(row);
  }

  return rows;
}

/**
 * Convert a 2D array (with header row) into an array of Record<string, string>.
 * All values are coerced to strings. Empty trailing rows are filtered out.
 */
function toRecords(rows: string[][], columns: string[]): Record<string, string>[] {
  const records: Record<string, string>[] = [];

  for (const row of rows) {
    // Skip rows that are entirely empty
    const isEmptyRow = row.every((cell) => cell.trim() === "");
    if (isEmptyRow) continue;

    const record: Record<string, string> = {};
    for (let j = 0; j < columns.length; j++) {
      record[columns[j]] = j < row.length ? String(row[j]) : "";
    }
    records.push(record);
  }

  return records;
}

/**
 * Parse a CSV file from an ArrayBuffer.
 */
export function parseCSV(buffer: ArrayBuffer): ParsedFile {
  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(buffer);

  const rawRows = parseCSVString(text);

  if (rawRows.length === 0) {
    return { columns: [], sampleRows: [], totalRows: 0, allRows: [] };
  }

  // First row is the header
  const columns = rawRows[0].map((col) => col.trim());

  // Remaining rows are data
  const dataRows = rawRows.slice(1);
  const allRows = toRecords(dataRows, columns);
  const totalRows = allRows.length;
  const sampleRows = allRows.slice(0, 50);

  return { columns, sampleRows, totalRows, allRows };
}

/**
 * Parse an Excel file from an ArrayBuffer.
 * Uses the xlsx package. Reads the first sheet by default, or the sheet at sheetIndex.
 */
export function parseExcel(buffer: ArrayBuffer, sheetIndex?: number): ParsedFile {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx");

  const workbook = XLSX.read(buffer, { type: "array" });
  const idx = sheetIndex ?? 0;
  const sheetName = workbook.SheetNames[idx];

  if (!sheetName) {
    return { columns: [], sampleRows: [], totalRows: 0, allRows: [] };
  }

  const sheet = workbook.Sheets[sheetName];

  // Convert sheet to 2D array (header: 1 gives array of arrays)
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (rawRows.length === 0) {
    return { columns: [], sampleRows: [], totalRows: 0, allRows: [] };
  }

  // First row is the header — convert all header values to strings and trim
  const columns = rawRows[0].map((cell) => String(cell ?? "").trim());

  // Remaining rows are data — convert every cell to string
  const dataRows = rawRows.slice(1);
  const allRows: Record<string, string>[] = [];

  for (const row of dataRows) {
    // Skip entirely empty rows
    const isEmptyRow = row.every((cell) => String(cell ?? "").trim() === "");
    if (isEmptyRow) continue;

    const record: Record<string, string> = {};
    for (let j = 0; j < columns.length; j++) {
      const cellValue = j < row.length ? row[j] : "";
      record[columns[j]] = String(cellValue ?? "");
    }
    allRows.push(record);
  }

  const totalRows = allRows.length;
  const sampleRows = allRows.slice(0, 50);

  return { columns, sampleRows, totalRows, allRows };
}

/**
 * Auto-detect file format from the filename extension and parse accordingly.
 * Supports .csv, .xlsx, and .xls files.
 */
export function parseFile(buffer: ArrayBuffer, filename: string): ParsedFile {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  switch (ext) {
    case "csv":
    case "tsv":
      return parseCSV(buffer);
    case "xlsx":
    case "xls":
      return parseExcel(buffer);
    default:
      throw new Error(
        `Unsupported file format: .${ext}. Supported formats: .csv, .xlsx, .xls`
      );
  }
}
