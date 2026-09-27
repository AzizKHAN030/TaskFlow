CREATE TABLE "InvoiceTemplate" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "document" BYTEA NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "serviceMonth" TEXT NOT NULL,
    "invoiceDate" DATE NOT NULL,
    "templateName" TEXT NOT NULL,
    "pdf" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceTemplate_ownerId_createdAt_idx" ON "InvoiceTemplate"("ownerId", "createdAt");
CREATE INDEX "Invoice_ownerId_createdAt_idx" ON "Invoice"("ownerId", "createdAt");
CREATE UNIQUE INDEX "Invoice_ownerId_number_key" ON "Invoice"("ownerId", "number");
CREATE UNIQUE INDEX "Invoice_ownerId_requestId_key" ON "Invoice"("ownerId", "requestId");
ALTER TABLE "InvoiceTemplate" ADD CONSTRAINT "InvoiceTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
