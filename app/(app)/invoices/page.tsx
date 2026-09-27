import { requireUser } from "@/lib/auth-helpers";
import { getInvoiceState } from "@/lib/invoices/data";
import { InvoicesClient } from "@/components/app/invoices-client";

export default async function InvoicesPage() {
  const user = await requireUser();
  return <InvoicesClient initial={await getInvoiceState(user.id)} />;
}
