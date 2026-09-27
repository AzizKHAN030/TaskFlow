import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { invoicePdfResponse, sameOrigin } from "@/lib/invoices/http";

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, ownerId: session.user.id } });
  if (!invoice) return new Response("Invoice not found", { status: 404 });
  return invoicePdfResponse(invoice);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const { invoiceId } = await params;
  try {
    const deleted = await prisma.invoice.deleteMany({
      where: { id: invoiceId, ownerId: session.user.id }
    });
    if (!deleted.count) return new Response("Invoice not found", { status: 404 });
    return new Response(null, { status: 204 });
  } catch {
    return new Response("Could not delete the invoice. Please try again.", { status: 500 });
  }
}
