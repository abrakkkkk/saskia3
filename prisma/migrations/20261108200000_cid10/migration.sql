-- CID-10 oficial (DATASUS). So cria tabela e indice.
CREATE TABLE "Cid10" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "folha" BOOLEAN NOT NULL,
  "busca" TEXT NOT NULL,
  CONSTRAINT "Cid10_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cid10_codigo_key" ON "Cid10"("codigo");
CREATE INDEX "Cid10_busca_idx" ON "Cid10"("busca");
