-- Chat: leitura das conversas diretas e canais por setor. So adiciona colunas e tabelas.
ALTER TABLE "MensagemChat"
  ADD COLUMN "lidaEm" TIMESTAMP(3),
  ADD COLUMN "canalId" TEXT;

-- Mensagens que ja existem contam como lidas (senao todo mundo abriria com um monte de "nao lidas").
UPDATE "MensagemChat" SET "lidaEm" = "dataHora" WHERE "recipientId" IS NOT NULL;

CREATE TABLE "CanalChat" (
  "id" TEXT NOT NULL,
  "hospitalId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CanalChat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeituraCanal" (
  "id" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "canalId" TEXT NOT NULL,
  "lidoAte" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeituraCanal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CanalChat_hospitalId_slug_key" ON "CanalChat"("hospitalId", "slug");
CREATE UNIQUE INDEX "LeituraCanal_usuarioId_canalId_key" ON "LeituraCanal"("usuarioId", "canalId");
CREATE INDEX "MensagemChat_recipientId_lidaEm_idx" ON "MensagemChat"("recipientId", "lidaEm");
CREATE INDEX "MensagemChat_canalId_dataHora_idx" ON "MensagemChat"("canalId", "dataHora");

ALTER TABLE "MensagemChat" ADD CONSTRAINT "MensagemChat_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "CanalChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CanalChat" ADD CONSTRAINT "CanalChat_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeituraCanal" ADD CONSTRAINT "LeituraCanal_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeituraCanal" ADD CONSTRAINT "LeituraCanal_canalId_fkey" FOREIGN KEY ("canalId") REFERENCES "CanalChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
