import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { format, parseISO } from "date-fns";
import { invoiceValuesSchema, servicePeriod, type InvoiceValues } from "./values";

export const MAX_TEMPLATE_BYTES = 4 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 24 * 1024 * 1024;
const tokens = { number: "{{invoice_number}}", invoiceDate: "{{invoice_date}}", servicePeriod: "{{service_period}}" };
export type TemplateFields = { number: string; invoiceDate: string; servicePeriod: string };

function decodeXml(text: string) {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) return String.fromCodePoint(parseInt(entity.slice(entity[1] === "x" ? 2 : 1), entity[1] === "x" ? 16 : 10));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[entity] ?? match;
  });
}

function encodeXml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function textNodes(xml: string) {
  return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
}

function paragraphText(xml: string) {
  return textNodes(xml).map((match) => decodeXml(match[1])).join("");
}

function paragraphs(xml: string) {
  return [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map((match) => paragraphText(match[0]));
}

function readPackage(document: Uint8Array) {
  if (!document.length || document.length > MAX_TEMPLATE_BYTES) throw new Error("Upload a DOCX file smaller than 4 MB.");
  let expanded = 0;
  let count = 0;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(document, { filter: (file) => {
      expanded += file.originalSize;
      if (++count > 1500 || expanded > MAX_EXPANDED_BYTES) throw new Error("Template is too large when uncompressed.");
      return true;
    } });
  } catch {
    throw new Error("Invalid or oversized DOCX file. Please upload an unencrypted Word document.");
  }
  if (!files["word/document.xml"] || !files["[Content_Types].xml"]) throw new Error("This file is not a Word DOCX document.");
  if (Object.keys(files).some((name) => /vbaProject|word\/embeddings\//i.test(name))) throw new Error("Please remove macros or embedded files from the template.");
  for (const [name, bytes] of Object.entries(files)) {
    if (/\.xml$|\.rels$/.test(name)) {
      const xml = strFromU8(bytes);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unsupported XML in template.");
      // Avoid fetching remote images or attached templates during conversion. Ordinary hyperlinks are fine.
      if (name.endsWith(".rels") && [...xml.matchAll(/<Relationship\b[^>]*>/g)].some(([rel]) => /TargetMode=["']External["']/i.test(rel) && !/\/hyperlink["']/i.test(rel))) {
        throw new Error("Embed linked images and remove external document references before uploading.");
      }
    }
  }
  return files;
}

export function inspectTemplate(document: Uint8Array): TemplateFields {
  const files = readPackage(document);
  const lines = paragraphs(strFromU8(files["word/document.xml"])).map((line) => line.trim()).filter(Boolean);
  const text = lines.join("\n");
  const afterLabel = (label: RegExp) => {
    const index = lines.findIndex((line) => label.test(line));
    return index >= 0 ? lines[index + 1] : undefined;
  };
  const fields = {
    number: text.includes(tokens.number) ? tokens.number : afterLabel(/^Invoice (No\.?|Number):?$/i),
    invoiceDate: text.includes(tokens.invoiceDate) ? tokens.invoiceDate : afterLabel(/^Invoice Date:?$/i),
    servicePeriod: text.includes(tokens.servicePeriod) ? tokens.servicePeriod : afterLabel(/^Service Period:?$/i)
  };
  if (!fields.number || !fields.invoiceDate || !fields.servicePeriod ||
      (fields.number !== tokens.number && !/^[A-Za-z0-9]+-\d{4}-\d+$/.test(fields.number)) ||
      (fields.invoiceDate !== tokens.invoiceDate && !/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(fields.invoiceDate)) ||
      (fields.servicePeriod !== tokens.servicePeriod && !/^[A-Za-z]+ \d{1,2}\s*[–—-]\s*\d{1,2}, \d{4}$/.test(fields.servicePeriod))) {
    throw new Error("Could not locate the invoice fields. Use the Rough Country layout, or add {{invoice_number}}, {{invoice_date}} and {{service_period}} to your DOCX (repeat {{service_period}} in the description).");
  }
  if (lines.filter((line) => line.includes(fields.servicePeriod!)).length < 2) {
    throw new Error("Include the same service period in both the invoice header and description, or use {{service_period}} in both places.");
  }
  return fields as TemplateFields;
}

// Replace across Word's split runs without rewriting paragraph/run properties or other package parts.
function replaceParagraph(xml: string, source: string, replacement: string) {
  const nodes = textNodes(xml);
  const values = nodes.map((match) => decodeXml(match[1]));
  const text = values.join("");
  const occurrences = [...text.matchAll(new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))];
  const starts: number[] = [];
  let offset = 0;
  for (const value of values) { starts.push(offset); offset += value.length; }
  for (const occurrence of occurrences.reverse()) {
    const start = occurrence.index!;
    const end = start + source.length;
    for (let i = values.length - 1; i >= 0; i--) {
      const nodeStart = starts[i];
      const nodeEnd = nodeStart + decodeXml(nodes[i][1]).length;
      if (nodeEnd <= start || nodeStart >= end) continue;
      values[i] = values[i].slice(0, Math.max(0, start - nodeStart)) +
        (start >= nodeStart ? replacement : "") + values[i].slice(Math.min(values[i].length, end - nodeStart));
    }
  }
  let index = 0;
  return xml.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, (node) => {
    const i = index++;
    if (values[i] === decodeXml(nodes[i][1])) return node;
    return node.replace(/^(<w:t)(\s[^>]*|)>[\s\S]*<\/w:t>$/, (_match, tag, attrs: string) => `${tag}${attrs.replace(/\sxml:space="[^"]*"/g, "")} xml:space="preserve">${encodeXml(values[i])}</w:t>`);
  });
}

export function fillInvoiceTemplate(document: Uint8Array, input: InvoiceValues) {
  const values = invoiceValuesSchema.parse(input);
  const fields = inspectTemplate(document);
  const files = readPackage(document);
  const replacements = [
    [fields.number, values.number],
    [fields.invoiceDate, format(parseISO(values.invoiceDate), "MMMM d, yyyy")],
    [fields.servicePeriod, servicePeriod(values.serviceMonth)]
  ];
  for (const name of Object.keys(files)) {
    if (!/^word\/(document|header\d*|footer\d*)\.xml$/.test(name)) continue;
    let xml = strFromU8(files[name]);
    for (const [source, replacement] of replacements) {
      xml = xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => replaceParagraph(paragraph, source, replacement));
    }
    files[name] = strToU8(xml);
  }
  return zipSync(files, { level: 6 });
}
