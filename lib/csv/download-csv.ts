export function downloadCSV(filename: string, csvContent: string): void {
  // ﻿ (UTF-8 BOM) so Excel opens accented characters (á, é, ñ...) correctly
  // instead of guessing the wrong encoding.
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
