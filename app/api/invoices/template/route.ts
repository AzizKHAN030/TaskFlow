import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { inspectTemplate, MAX_TEMPLATE_BYTES } from "@/lib/invoices/template";
import { sameOrigin } from "@/lib/invoices/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  if (Number(request.headers.get("content-length")) > MAX_TEMPLATE_BYTES + 65536) return new Response("Upload a DOCX file smaller than 4 MB.", { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("template");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".docx")) return new Response("Choose a .docx template.", { status: 400 });
    if (file.size > MAX_TEMPLATE_BYTES) return new Response("Upload a DOCX file smaller than 4 MB.", { status: 413 });
    const document = new Uint8Array(await file.arrayBuffer());
    let fields;
    try { fields = inspectTemplate(document); }
    catch (error) { return new Response(error instanceof Error ? error.message : "Invalid template.", { status: 400 }); }
    const template = await prisma.invoiceTemplate.create({ data: {
      ownerId: session.user.id, filename: file.name.slice(0, 200), document: Buffer.from(document), fields
    }, select: { id: true } });
    return Response.json(template, { status: 201 });
  } catch {
    return new Response("Could not save the template. Please try again.", { status: 500 });
  }
}
