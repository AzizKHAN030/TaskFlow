export async function convertInvoiceToPdf(document: Uint8Array) {
  const base = process.env.GOTENBERG_URL ?? (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3001" : undefined);
  if (!base) throw new Error("PDF conversion is not configured. Set GOTENBERG_URL on the server.");
  const form = new FormData();
  form.append("files", new Blob([new Uint8Array(document)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "invoice.docx");
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, "")}/forms/libreoffice/convert`, {
      method: "POST",
      body: form,
      headers: process.env.GOTENBERG_AUTHORIZATION ? { Authorization: process.env.GOTENBERG_AUTHORIZATION } : undefined,
      signal: AbortSignal.timeout(90_000)
    });
  } catch {
    throw new Error("The PDF service is unavailable or timed out. Try again once the conversion service is running.");
  }
  if (!response.ok) throw new Error("The PDF service could not convert this template. Check that it opens correctly in Word.");
  const pdf = new Uint8Array(await response.arrayBuffer());
  if (pdf.length > 16 * 1024 * 1024 || new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") throw new Error("The conversion service returned an invalid or oversized PDF.");
  return pdf;
}
