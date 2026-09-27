import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getInvoiceState } from "@/lib/invoices/data";
import { invoiceValuesSchema } from "@/lib/invoices/values";
import { fillInvoiceTemplate } from "@/lib/invoices/template";
import { convertInvoiceToPdf } from "@/lib/invoices/pdf";
import { invoicePdfResponse, sameOrigin } from "@/lib/invoices/http";

export const runtime = "nodejs";
export const maxDuration = 120;
const schema = invoiceValuesSchema.extend({ templateId: z.string().cuid(), requestId: z.string().uuid() });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  return Response.json(await getInvoiceState(session.user.id), { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(parsed.error.issues[0]?.message ?? "Invalid invoice details.", { status: 400 });
  const { templateId, requestId, ...values } = parsed.data;
  const ownerId = session.user.id;
  try {
    const previous = await prisma.invoice.findUnique({ where: { ownerId_requestId: { ownerId, requestId } } });
    if (previous) return invoicePdfResponse(previous);
    if (await prisma.invoice.findUnique({ where: { ownerId_number: { ownerId, number: values.number } }, select: { id: true } })) {
      return new Response("This invoice number already exists. Download it from history or choose a new number.", { status: 409 });
    }
    const template = await prisma.invoiceTemplate.findFirst({ where: { id: templateId, ownerId } });
    if (!template) return new Response("Upload a template before exporting.", { status: 404 });
    let pdf: Uint8Array;
    try {
      pdf = await convertInvoiceToPdf(fillInvoiceTemplate(template.document, values));
    } catch (error) {
      return new Response(error instanceof Error ? error.message : "Could not generate the invoice PDF.", { status: 502 });
    }
    // Save only after conversion succeeds. Unique constraints protect parallel requests.
    const invoice = await prisma.invoice.create({ data: {
      ownerId, requestId, number: values.number, serviceMonth: values.serviceMonth,
      invoiceDate: new Date(`${values.invoiceDate}T00:00:00.000Z`), templateName: template.filename, pdf: Buffer.from(pdf)
    } });
    return invoicePdfResponse(invoice);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const previous = await prisma.invoice.findUnique({ where: { ownerId_requestId: { ownerId, requestId } } });
      if (previous) return invoicePdfResponse(previous);
      return new Response("This invoice number was just used. Refresh and choose the next number.", { status: 409 });
    }
    return new Response("Could not save the invoice. Please retry with the same details.", { status: 500 });
  }
}
