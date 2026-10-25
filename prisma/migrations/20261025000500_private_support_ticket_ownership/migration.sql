ALTER TABLE "Ticket"
  ADD COLUMN "creatorId" TEXT;

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Ticket_creatorId_idx" ON "Ticket"("creatorId");
