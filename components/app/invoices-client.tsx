"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import type { InvoiceState } from "@/lib/invoices/data";
import { invoiceDefaults, nextInvoiceNumber, servicePeriod } from "@/lib/invoices/values";

async function checked(response: Response) {
  if (!response.ok) throw new Error((await response.text()) || "Request failed.");
  if (response.redirected) throw new Error("Your session has expired. Please sign in again.");
  return response;
}

async function savePdf(response: Response, filename: string) {
  await checked(response);
  if (!response.headers.get("content-type")?.includes("application/pdf")) throw new Error("Expected a PDF download. Please sign in again.");
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function InvoicesClient({ initial }: { initial: InvoiceState }) {
  const [state, setState] = useState(initial);
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const [number, setNumber] = useState("");
  const [customNumber, setCustomNumber] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const retry = useRef<{ signature: string; requestId: string } | null>(null);

  useEffect(() => {
    const defaults = invoiceDefaults();
    setMonth(defaults.serviceMonth);
    setDate(defaults.invoiceDate);
  }, []);

  useEffect(() => {
    if (date && !customNumber) setNumber(nextInvoiceNumber(state.numbers, state.template?.fields.number, date.slice(0, 4)));
  }, [date, customNumber, state.numbers, state.template]);

  const refresh = async () => {
    const response = await checked(await fetch("/api/invoices", { cache: "no-store" }));
    const data: InvoiceState = await response.json();
    setState(data);
  };

  const perform = async (key: string, action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(key);
    setError(null);
    try { await action(); }
    catch (error) { setError(error instanceof Error ? error.message : "Something went wrong. Please try again."); }
    finally { inFlight.current = false; setBusy(null); }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">Generate a monthly invoice from your Word template and keep a copy of every PDF.</p>
      </div>
      {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Invoice template</CardTitle>
            <CardDescription>Your DOCX controls the layout, company details and amounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {state.template ? <div className="rounded-md border bg-muted/30 p-3">
              <p className="break-all text-sm font-medium">{state.template.filename}</p>
              <p className="mt-1 text-xs text-muted-foreground">Saved {date ? format(parseISO(state.template.createdAt), "d MMM yyyy") : state.template.createdAt.slice(0, 10)}</p>
            </div> : <p className="text-sm text-muted-foreground">Upload your Rough Country invoice template to get started.</p>}
            <form className="space-y-3" onSubmit={(event) => {
              event.preventDefault();
              if (!file) return;
              void perform("upload", async () => {
                const form = new FormData();
                form.append("template", file);
                await checked(await fetch("/api/invoices/template", { method: "POST", body: form }));
                await refresh();
                setFile(null);
                setCustomNumber(false);
                if (fileInput.current) fileInput.current.value = "";
                toast.success("Invoice template saved");
              });
            }}>
              <Label htmlFor="invoice-template">{state.template ? "Replace template" : "Word template"}</Label>
              <Input ref={fileInput} id="invoice-template" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={!!busy} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">DOCX, up to 4 MB. Replacing the template keeps previous invoices intact.</p>
              <Button type="submit" variant="outline" disabled={!file || !!busy}>
                {busy === "upload" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Save template
              </Button>
            </form>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Using a different DOCX layout?</summary>
              <p className="mt-2 text-muted-foreground">Place <code>{"{{invoice_number}}"}</code>, <code>{"{{invoice_date}}"}</code> and <code>{"{{service_period}}"}</code> in your template. Repeat the service-period placeholder in the description. The supplied Rough Country layout is recognized automatically.</p>
            </details>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>New invoice</CardTitle><CardDescription>Select the month, check the details, then export.</CardDescription></CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={(event) => {
              event.preventDefault();
              if (!state.template) return;
              void perform("export", async () => {
                const values = { number, serviceMonth: month, invoiceDate: date, templateId: state.template!.id };
                const signature = JSON.stringify(values);
                if (retry.current?.signature !== signature) retry.current = { signature, requestId: crypto.randomUUID() };
                const response = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, requestId: retry.current.requestId }) });
                await savePdf(response, `${number}.pdf`);
                toast.success("Invoice saved and PDF downloaded");
                // Keep the request ID until history refresh succeeds so a retry cannot create a second invoice.
                await refresh();
                retry.current = null;
                setCustomNumber(false);
              });
            }}>
              <fieldset disabled={!!busy} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="invoice-number">Invoice number</Label>
                  <Input id="invoice-number" required maxLength={60} pattern="[A-Za-z0-9][A-Za-z0-9._\-]*" value={number} onChange={(event) => { setNumber(event.target.value); setCustomNumber(true); }} />
                  <p className="text-xs text-muted-foreground">Suggested from the highest saved number or template number for the invoice year. You can edit it.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="invoice-month">Service month</Label><Input id="invoice-month" type="month" min="1900-01" max="9999-12" required value={month} onChange={(event) => setMonth(event.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="invoice-date">Invoice date</Label><Input id="invoice-date" type="date" min="1900-01-01" max="9999-12-31" required value={date} onChange={(event) => setDate(event.target.value)} /></div>
                </div>
                <div className="rounded-md bg-muted/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service period</p>
                  <p className="mt-1 font-medium">{/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? servicePeriod(month) : "Choose a month"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Also used in the invoice description.</p>
                </div>
                <Button type="submit" className="w-full sm:w-auto" disabled={!state.template || !date || !month}>
                  {busy === "export" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  {busy === "export" ? "Generating PDF…" : "Export PDF"}
                </Button>
              </fieldset>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Generation history</CardTitle><CardDescription>Latest 100 invoices. Downloads use the original saved PDF.</CardDescription></CardHeader>
        <CardContent>
          {!state.invoices.length ? <div className="py-10 text-center text-sm text-muted-foreground">No invoices generated yet. Your first export will appear here.</div> :
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead><tr className="border-b text-muted-foreground"><th className="pb-3 pr-4 font-medium">Invoice</th><th className="pb-3 pr-4 font-medium">Service period</th><th className="pb-3 pr-4 font-medium">Invoice date</th><th className="pb-3 pr-4 font-medium">Generated</th><th className="pb-3 text-right font-medium">Actions</th></tr></thead>
              <tbody>{state.invoices.map((invoice) => <tr key={invoice.id} className="border-b last:border-0">
                <td className="py-4 pr-4 font-medium"><span>{invoice.number}</span><span className="mt-1 block max-w-52 truncate text-xs font-normal text-muted-foreground" title={invoice.templateName}>{invoice.templateName}</span></td>
                <td className="whitespace-nowrap py-4 pr-4">{servicePeriod(invoice.serviceMonth)}</td>
                <td className="whitespace-nowrap py-4 pr-4">{format(parseISO(invoice.invoiceDate), "d MMM yyyy")}</td>
                <td className="whitespace-nowrap py-4 pr-4">{date ? format(parseISO(invoice.createdAt), "d MMM yyyy, HH:mm") : invoice.createdAt.slice(0, 10)}</td>
                <td className="py-4 text-right"><div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={!!busy} aria-label={`Download ${invoice.number}`} onClick={() => void perform(invoice.id, async () => { await savePdf(await fetch(`/api/invoices/${invoice.id}`), `${invoice.number}.pdf`); })}>{busy === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={!!busy} aria-label={`Delete ${invoice.number}`} onClick={() => { setError(null); setDeleteTarget({ id: invoice.id, number: invoice.number }); }}><Trash2 className="h-4 w-4" /></Button>
                </div></td>
              </tr>)}</tbody>
            </table></div>}
        </CardContent>
      </Card>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open && !inFlight.current) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.number}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the invoice record and its saved PDF. Files already downloaded to your device and your template are kept.</AlertDialogDescription>
          </AlertDialogHeader>
          {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={!!busy} onClick={() => {
              if (!deleteTarget) return;
              const target = deleteTarget;
              void perform("delete", async () => {
                await checked(await fetch(`/api/invoices/${target.id}`, { method: "DELETE" }));
                setState((current) => ({ ...current, invoices: current.invoices.filter((invoice) => invoice.id !== target.id), numbers: current.numbers.filter((value) => value !== target.number) }));
                retry.current = null;
                setDeleteTarget(null);
                toast.success("Invoice record and saved PDF deleted");
                await refresh();
              });
            }}>
              {busy === "delete" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {busy === "delete" ? "Deleting…" : "Delete invoice"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
