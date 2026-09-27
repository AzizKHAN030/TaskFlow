import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

// Explicit smoke test: creates two temporary users and removes only those users
// (and their cascading sessions/templates/invoices) in finally.
async function main() {
  const source = process.argv[2];
  const base = process.env.INVOICE_TEST_URL ?? "http://127.0.0.1:3100";
  if (!source) throw new Error("Pass a DOCX template path.");
  if (!process.env.INVOICE_TEST_ALLOW_DB_WRITES) throw new Error("Set INVOICE_TEST_ALLOW_DB_WRITES=1 to allow temporary test users in the configured database.");
  const prisma = new PrismaClient();
  const ids: string[] = [];
  try {
    const tokens: string[] = [];
    for (let i = 0; i < 2; i++) {
      const token = randomUUID();
      const user = await prisma.user.create({ data: { name: "Invoice smoke test", email: `invoice-smoke-${randomUUID()}@example.invalid`, sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600_000) } } } });
      ids.push(user.id);
      tokens.push(token);
    }
    const headers = (user = 0) => ({ Cookie: `authjs.session-token=${tokens[user]}`, Origin: base });
    const call = (route: string, init: RequestInit = {}, user = 0) => fetch(`${base}${route}`, { ...init, headers: { ...headers(user), ...init.headers }, redirect: "manual" });
    const form = new FormData();
    form.append("template", new Blob([await readFile(source)]), "invoice-template.docx");
    const upload = await call("/api/invoices/template", { method: "POST", body: form });
    assert.equal(upload.status, 201, await upload.clone().text());
    const template = await upload.json();
    const values = { templateId: template.id, requestId: randomUUID(), number: "RC-2026-003", invoiceDate: "2026-09-28", serviceMonth: "2026-08" };
    const post = (input = values, user = 0) => call("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }, user);
    const exportResponse = await post();
    assert.equal(exportResponse.status, 200, await exportResponse.clone().text());
    assert.equal(exportResponse.headers.get("content-type"), "application/pdf");
    const pdf = Buffer.from(await exportResponse.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
    const retry = await post();
    assert.equal(retry.status, 200);
    assert.deepEqual(Buffer.from(await retry.arrayBuffer()), pdf);
    const duplicate = await post({ ...values, requestId: randomUUID() });
    assert.equal(duplicate.status, 409);
    const state = await (await call("/api/invoices")).json();
    assert.equal(state.invoices.length, 1);
    const download = await call(`/api/invoices/${state.invoices[0].id}`);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), pdf);
    const otherDownload = await call(`/api/invoices/${state.invoices[0].id}`, {}, 1);
    assert.equal(otherDownload.status, 404);
    const otherExport = await post({ ...values, requestId: randomUUID() }, 1);
    assert.equal(otherExport.status, 404);
    const otherState = await (await call("/api/invoices", {}, 1)).json();
    assert.equal(otherState.template, null);
    assert.equal(otherState.invoices.length, 0);
    const forbidden = await call("/api/invoices", { method: "POST", headers: { Origin: "https://unrelated.example", "Content-Type": "application/json" }, body: JSON.stringify(values) });
    assert.equal(forbidden.status, 403);
    const unsigned = await fetch(`${base}/api/invoices`, { headers: { Cookie: "authjs.session-token=invalid" }, redirect: "manual" });
    assert.equal(unsigned.status, 401);
    const replacement = new FormData();
    replacement.append("template", new Blob([await readFile(source)]), "replacement.docx");
    assert.equal((await call("/api/invoices/template", { method: "POST", body: replacement })).status, 201);
    const preserved = await call(`/api/invoices/${state.invoices[0].id}`);
    assert.deepEqual(Buffer.from(await preserved.arrayBuffer()), pdf);
    const page = await call("/invoices");
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(html.includes("Generation history"));
    assert.ok(html.includes("RC-2026-003"));
    const invoiceRoute = `/api/invoices/${state.invoices[0].id}`;
    assert.equal((await call(invoiceRoute, { method: "DELETE" }, 1)).status, 404);
    assert.equal((await call(invoiceRoute, { method: "DELETE", headers: { Origin: "https://unrelated.example" } })).status, 403);
    assert.equal((await fetch(`${base}${invoiceRoute}`, { method: "DELETE", headers: { Cookie: "authjs.session-token=invalid" }, redirect: "manual" })).status, 401);
    assert.equal((await call(invoiceRoute)).status, 200);
    assert.equal((await call(invoiceRoute, { method: "DELETE" })).status, 204);
    assert.equal((await call(invoiceRoute)).status, 404);
    assert.equal((await call(invoiceRoute, { method: "DELETE" })).status, 404);
    const afterDelete = await (await call("/api/invoices")).json();
    assert.equal(afterDelete.invoices.length, 0);
    assert.equal(afterDelete.numbers.length, 0);
    assert.equal(afterDelete.template.filename, "replacement.docx");
    console.log("PASS: upload, PDF export, retries, duplicate rejection, history, re-download, page render, authenticated owner-only deletion, template preservation and origin checks.");
  } finally {
    for (const id of ids) await prisma.user.delete({ where: { id } });
    await prisma.$disconnect();
    console.log("Temporary test users and their invoice records removed.");
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
