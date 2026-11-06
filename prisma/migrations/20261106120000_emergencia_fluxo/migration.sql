-- Fluxo de emergência (pânico e PCR): local, situação e quem encerrou. Só adiciona colunas e índice.
ALTER TABLE "Emergencia"
  ADD COLUMN "local" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ATIVA',
  ADD COLUMN "usuarioId" TEXT,
  ADD COLUMN "encerradaEm" TIMESTAMP(3),
  ADD COLUMN "encerradaPorId" TEXT,
  ADD COLUMN "encerradaPorNome" TEXT;

CREATE INDEX "Emergencia_hospitalId_status_createdAt_idx" ON "Emergencia"("hospitalId", "status", "createdAt");
