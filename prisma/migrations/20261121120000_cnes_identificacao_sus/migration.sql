-- Item 8 (interoperabilidade), fase 1: CNS/CPF/CBO de profissionais, CNS do paciente e equipe do CNES (aditiva).
-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "cns" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "cbo" TEXT,
ADD COLUMN     "cns" TEXT,
ADD COLUMN     "cpf" TEXT;

-- CreateTable
CREATE TABLE "CnesProfissional" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "cnes" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "cns" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cbo" TEXT NOT NULL,
    "cargaHoraria" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CnesProfissional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CnesProfissional_hospitalId_idx" ON "CnesProfissional"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "CnesProfissional_hospitalId_cns_cbo_key" ON "CnesProfissional"("hospitalId", "cns", "cbo");

-- AddForeignKey
ALTER TABLE "CnesProfissional" ADD CONSTRAINT "CnesProfissional_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

