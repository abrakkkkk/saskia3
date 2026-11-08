-- Catalogo de medicamentos (lista CMED/ANVISA). So cria tabela e indice.
CREATE TABLE "Medicamento" (
  "id" TEXT NOT NULL,
  "codigoGgrem" TEXT NOT NULL,
  "substancia" TEXT NOT NULL,
  "produto" TEXT NOT NULL,
  "apresentacao" TEXT NOT NULL,
  "laboratorio" TEXT NOT NULL,
  "registro" TEXT,
  "classe" TEXT,
  "tipo" TEXT,
  "tarja" TEXT,
  "restricaoHospitalar" BOOLEAN NOT NULL DEFAULT false,
  "rename" BOOLEAN NOT NULL DEFAULT false,
  "busca" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Medicamento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Medicamento_codigoGgrem_key" ON "Medicamento"("codigoGgrem");
CREATE INDEX "Medicamento_busca_idx" ON "Medicamento"("busca");
