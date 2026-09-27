import { endOfMonth, format, isValid, parseISO, startOfMonth, subMonths } from "date-fns";
import { z } from "zod";

export const invoiceValuesSchema = z.object({
  number: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, "Use letters, numbers, dots, hyphens or underscores for the invoice number."),
  serviceMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine((value) => Number(value.slice(0, 4)) >= 1900, "Choose a valid service month."),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => isValid(parseISO(value)) && format(parseISO(value), "yyyy-MM-dd") === value && Number(value.slice(0, 4)) >= 1900, "Choose a valid invoice date.")
});

export type InvoiceValues = z.infer<typeof invoiceValuesSchema>;

export function servicePeriod(month: string) {
  const date = parseISO(`${month}-01`);
  return `${format(date, "MMMM")} 1–${format(endOfMonth(date), "d, yyyy")}`;
}

export function invoiceDefaults(now = new Date()) {
  return {
    serviceMonth: format(startOfMonth(subMonths(now, 1)), "yyyy-MM"),
    invoiceDate: format(now, "yyyy-MM-dd")
  };
}

export function nextInvoiceNumber(numbers: string[], templateNumber: string | undefined, year: string) {
  const prefix = `RC-${year}-`;
  const previous = [...numbers, templateNumber ?? ""].reduce((max, number) => {
    const suffix = number.startsWith(prefix) ? number.slice(prefix.length) : "";
    return /^\d+$/.test(suffix) && BigInt(suffix) > max ? BigInt(suffix) : max;
  }, 0n);
  return `${prefix}${String(previous + 1n).padStart(3, "0")}`;
}
