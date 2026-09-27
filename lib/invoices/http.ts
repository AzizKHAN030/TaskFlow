export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    // Next.js can use an internal hostname in request.url. Host is the address
    // the browser actually requested, including its port.
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return (source.protocol === "https:" || source.protocol === "http:") && source.host === host;
  } catch {
    return false;
  }
}

export function invoicePdfResponse(invoice: { pdf: Uint8Array; number: string }) {
  return new Response(new Uint8Array(invoice.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
