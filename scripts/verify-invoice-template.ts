import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { fillInvoiceTemplate, inspectTemplate } from "../lib/invoices/template";
import { convertInvoiceToPdf } from "../lib/invoices/pdf";

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error("Usage: node --import tsx scripts/verify-invoice-template.ts /path/to/template.docx");
  const output = path.resolve("tmp/invoices");
  await mkdir(output, { recursive: true });
  const original = await readFile(source);
  console.log("Recognized fields:", inspectTemplate(original));
  const generated = fillInvoiceTemplate(original, { number: "RC-2026-003", invoiceDate: "2026-09-28", serviceMonth: "2026-08" });
  const before = unzipSync(original);
  const after = unzipSync(generated);
  for (const part of Object.keys(before)) {
    if (part !== "word/document.xml") assert.deepEqual(after[part], before[part], `Package part changed: ${part}`);
  }
  const xml = strFromU8(after["word/document.xml"]);
  const plain = xml.replace(/<[^>]*>/g, "");
  assert.ok(plain.includes("RC-2026-003"));
  assert.ok(plain.includes("September 28, 2026"));
  assert.equal(plain.match(/August 1–31, 2026/g)?.length, 2);
  const structure = (value: string) => value.replace(/<w:t[^>]*>[\s\S]*?<\/w:t>/g, "<w:t/>");
  assert.equal(structure(xml), structure(strFromU8(before["word/document.xml"])));
  await writeFile(path.join(output, "generated.docx"), generated);
  await writeFile(path.join(output, "reference.pdf"), await convertInvoiceToPdf(original));
  await writeFile(path.join(output, "generated.pdf"), await convertInvoiceToPdf(generated));
  console.log("All package preservation checks passed. PDFs written to", output);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
