// ";" instead of "," — Excel under a Spanish regional locale (es-CR among
// them) expects ";" as the field separator and "," as the decimal mark;
// with "," as the delimiter, Excel opened the whole file as one column.
const CSV_DELIMITER = ";"

// A cell starting with one of these is a classic CSV/formula-injection
// vector (OWASP): spreadsheet apps evaluate a leading =, +, -, or @ as a
// formula when the file is opened, and a leading tab/CR can shift fields
// in some parsers. The documented mitigation is prefixing with a literal
// single quote, which Excel/Sheets then render as plain text instead of
// evaluating. Checked on the RAW value, before the quoting-for-delimiter
// logic below, so the prefix is added exactly once and still gets quoted
// afterward if the (now-prefixed) content also contains ";", a '"', or a
// newline.
const DANGEROUS_LEADING_CHAR = /^[=+\-@\t\r]/

function escapeCsvField(value: string | number): string {
  let str = String(value)
  // Only ever applied to actual strings — a JS `number` can never start
  // with one of these characters, and turning a real number into a
  // quote-prefixed string would break Excel's own numeric handling of it
  // (right-alignment, sorting, formulas) for no security benefit.
  if (typeof value === "string" && DANGEROUS_LEADING_CHAR.test(str)) {
    str = `'${str}`
  }
  if (/[;"\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(CSV_DELIMITER))
  return lines.join("\r\n")
}
