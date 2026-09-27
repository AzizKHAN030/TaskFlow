import assert from "node:assert/strict";
import { test } from "node:test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { fillInvoiceTemplate, inspectTemplate } from "./template";
import { invoiceDefaults, invoiceValuesSchema, nextInvoiceNumber, servicePeriod } from "./values";
import { sameOrigin } from "./http";

const paragraph = (...runs: string[]) => `<w:p><w:pPr><w:jc w:val="right"/></w:pPr>${runs.map((text) => `<w:r><w:rPr><w:b/></w:rPr><w:t>${text}</w:t></w:r>`).join("")}</w:p>`;
function fixture() {
  return zipSync({
    "[Content_Types].xml": strToU8("<Types/>"),
    "word/styles.xml": strToU8("<styles>Preserve fonts and spacing exactly</styles>"),
    "word/document.xml": strToU8(`<w:document><w:body>${[
      paragraph("Invoice No."), paragraph("RC-2026-", "002"),
      paragraph("Invoice Date"), paragraph("October ", "1, 2026"),
      paragraph("Service Period"), paragraph("September", " 1–", "3", "0, 2026"),
      paragraph("Agreement dated July 28, 2026."),
      paragraph("1 month: ", "September", " 1–", "30", ", 2026", "."),
      paragraph("USD 6,250.00")
    ].join("")}</w:body></w:document>`)
  });
}

test("replaces all four fields across split runs and preserves everything else", () => {
  const source = fixture();
  assert.deepEqual(inspectTemplate(source), { number: "RC-2026-002", invoiceDate: "October 1, 2026", servicePeriod: "September 1–30, 2026" });
  const result = fillInvoiceTemplate(source, { number: "RC-2026-003", invoiceDate: "2026-09-28", serviceMonth: "2024-02" });
  const before = unzipSync(source);
  const after = unzipSync(result);
  assert.deepEqual(after["word/styles.xml"], before["word/styles.xml"]);
  const xml = strFromU8(after["word/document.xml"]);
  const text = xml.replace(/<[^>]*>/g, "");
  assert.equal(text.match(/February 1–29, 2024/g)?.length, 2);
  assert.ok(text.includes("1 month: February 1–29, 2024."));
  assert.ok(text.includes("September 28, 2026"));
  assert.ok(text.includes("RC-2026-003"));
  assert.ok(text.includes("Agreement dated July 28, 2026."));
  assert.ok(text.includes("USD 6,250.00"));
  const structural = (value: string) => value.replace(/<w:t[^>]*>[\s\S]*?<\/w:t>/g, "<w:t/>");
  assert.equal(structural(xml), structural(strFromU8(before["word/document.xml"])));
});

test("supports placeholders split across Word runs", () => {
  const packageFiles = unzipSync(fixture());
  packageFiles["word/document.xml"] = strToU8(`<w:document>${paragraph("{{invoice_", "number}}")}${paragraph("{{invoice_date}}")}${paragraph("{{service_", "period}}")}${paragraph("1 month: {{service_period}}.")}</w:document>`);
  const result = unzipSync(fillInvoiceTemplate(zipSync(packageFiles), { number: "RC-2027-001", invoiceDate: "2027-01-01", serviceMonth: "2026-12" }));
  const text = strFromU8(result["word/document.xml"]).replace(/<[^>]*>/g, "");
  assert.ok(!text.includes("{{"));
  assert.equal(text.match(/December 1–31, 2026/g)?.length, 2);
});

test("defaults handle year boundaries and calendar month lengths", () => {
  assert.deepEqual(invoiceDefaults(new Date(2027, 0, 1)), { serviceMonth: "2026-12", invoiceDate: "2027-01-01" });
  assert.equal(servicePeriod("2026-02"), "February 1–28, 2026");
  assert.equal(servicePeriod("2024-02"), "February 1–29, 2024");
  assert.equal(nextInvoiceNumber([], "RC-2026-002", "2026"), "RC-2026-003");
  assert.equal(nextInvoiceNumber(["RC-2026-010", "RC-2026-004"], "RC-2026-002", "2026"), "RC-2026-011");
  assert.equal(nextInvoiceNumber(["RC-2026-010"], "RC-2026-002", "2027"), "RC-2027-001");
});

test("rejects invalid dates and unsafe file names", () => {
  const valid = { number: "RC-2026-003", invoiceDate: "2026-09-28", serviceMonth: "2026-08" };
  assert.equal(invoiceValuesSchema.safeParse({ ...valid, invoiceDate: "2026-02-30" }).success, false);
  assert.equal(invoiceValuesSchema.safeParse({ ...valid, serviceMonth: "2026-13" }).success, false);
  assert.equal(invoiceValuesSchema.safeParse({ ...valid, number: "../../invoice" }).success, false);
});

test("rejects invalid archives, missing description dates and remote content", () => {
  assert.throws(() => inspectTemplate(strToU8("not a docx")), /Invalid/);
  const files = unzipSync(fixture());
  files["word/document.xml"] = strToU8(strFromU8(files["word/document.xml"]).replace(paragraph("1 month: ", "September", " 1–", "30", ", 2026", "."), ""));
  assert.throws(() => inspectTemplate(zipSync(files)), /description/);
  files["word/_rels/document.xml.rels"] = strToU8('<Relationships><Relationship Type="http://example/image" TargetMode="External" Target="http://internal/image"/></Relationships>');
  assert.throws(() => inspectTemplate(zipSync(files)), /external/);
});

test("validates the public host when Next.js uses an internal request URL", () => {
  const request = (origin: string) => new Request("http://localhost:3100/api/invoices", { headers: { host: "127.0.0.1:3100", origin } });
  assert.equal(sameOrigin(request("http://127.0.0.1:3100")), true);
  assert.equal(sameOrigin(request("https://unrelated.example")), false);
  assert.equal(sameOrigin(request("null")), false);
});
