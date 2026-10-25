ALTER TABLE "MensagemChat"
  ADD COLUMN "senderId" TEXT,
  ADD COLUMN "recipientId" TEXT;

CREATE INDEX "MensagemChat_hospitalId_senderId_recipientId_dataHora_idx"
  ON "MensagemChat"("hospitalId", "senderId", "recipientId", "dataHora");

ALTER TABLE "MensagemChat"
  ADD CONSTRAINT "MensagemChat_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "MensagemChat_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
