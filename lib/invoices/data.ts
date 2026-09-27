import { prisma } from "@/lib/prisma";
import type { TemplateFields } from "./template";

export async function getInvoiceState(ownerId: string) {
  const [template, invoices, numbers] = await Promise.all([
    prisma.invoiceTemplate.findFirst({
      where: { ownerId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, filename: true, fields: true, createdAt: true }
    }),
    prisma.invoice.findMany({
      where: { ownerId }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, number: true, serviceMonth: true, invoiceDate: true, templateName: true, createdAt: true }
    }),
    prisma.invoice.findMany({ where: { ownerId }, select: { number: true } })
  ]);
  return {
    template: template ? { ...template, fields: template.fields as TemplateFields, createdAt: template.createdAt.toISOString() } : null,
    invoices: invoices.map((invoice) => ({ ...invoice, invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10), createdAt: invoice.createdAt.toISOString() })),
    numbers: numbers.map(({ number }) => number)
  };
}

export type InvoiceState = Awaited<ReturnType<typeof getInvoiceState>>;
