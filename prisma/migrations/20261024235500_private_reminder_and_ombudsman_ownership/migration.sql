ALTER TABLE "Lembrete"
  ADD COLUMN "criadoPorId" TEXT;

ALTER TABLE "OuvidoriaTicket"
  ADD COLUMN "autorId" TEXT;

ALTER TABLE "Lembrete"
  ADD CONSTRAINT "Lembrete_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OuvidoriaTicket"
  ADD CONSTRAINT "OuvidoriaTicket_autorId_fkey"
  FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Lembrete_criadoPorId_idx" ON "Lembrete"("criadoPorId");
CREATE INDEX "OuvidoriaTicket_autorId_idx" ON "OuvidoriaTicket"("autorId");
