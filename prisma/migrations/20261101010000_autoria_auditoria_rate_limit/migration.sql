-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CargoUsuario" ADD VALUE 'NUTRICIONISTA';
ALTER TYPE "CargoUsuario" ADD VALUE 'ASSISTENTE_SOCIAL';

-- DropIndex
DROP INDEX "AnotacaoEnfermagem_pacienteId_idx";

-- DropIndex
DROP INDEX "AvaliacaoMedica_pacienteId_idx";

-- DropIndex
DROP INDEX "AvaliacaoNutricional_pacienteId_idx";

-- DropIndex
DROP INDEX "EscoreClinico_pacienteId_idx";

-- DropIndex
DROP INDEX "Paciente_hospitalId_idx";

-- DropIndex
DROP INDEX "SinalVital_pacienteId_idx";

-- DropIndex
DROP INDEX "TimelineEvent_pacienteId_idx";

-- AlterTable
ALTER TABLE "AnotacaoEnfermagem" ADD COLUMN     "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "AvaliacaoMedica" ADD COLUMN     "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "AvaliacaoNutricional" ADD COLUMN     "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "EscoreClinico" ADD COLUMN     "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "Exame" ADD COLUMN     "indicacao" TEXT,
ADD COLUMN     "liberadoEm" TIMESTAMP(3),
ADD COLUMN     "liberadoPorId" TEXT,
ADD COLUMN     "prioridade" TEXT,
ADD COLUMN     "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "Obito" ADD COLUMN     "pacienteId" TEXT,
ADD COLUMN     "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "SinalVital" ADD COLUMN     "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "TimelineEvent" ADD COLUMN     "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativaLogin" (
    "chave" TEXT NOT NULL,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "inicioJanela" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaLogin_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "Auditoria_hospitalId_createdAt_idx" ON "Auditoria"("hospitalId", "createdAt");

-- CreateIndex
CREATE INDEX "Auditoria_hospitalId_entidade_entidadeId_idx" ON "Auditoria"("hospitalId", "entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "AnotacaoEnfermagem_pacienteId_createdAt_idx" ON "AnotacaoEnfermagem"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "AnotacaoEnfermagem_usuarioId_idx" ON "AnotacaoEnfermagem"("usuarioId");

-- CreateIndex
CREATE INDEX "AvaliacaoMedica_pacienteId_createdAt_idx" ON "AvaliacaoMedica"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "AvaliacaoMedica_usuarioId_idx" ON "AvaliacaoMedica"("usuarioId");

-- CreateIndex
CREATE INDEX "AvaliacaoNutricional_pacienteId_createdAt_idx" ON "AvaliacaoNutricional"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "AvaliacaoNutricional_usuarioId_idx" ON "AvaliacaoNutricional"("usuarioId");

-- CreateIndex
CREATE INDEX "EscoreClinico_pacienteId_createdAt_idx" ON "EscoreClinico"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "EscoreClinico_usuarioId_idx" ON "EscoreClinico"("usuarioId");

-- CreateIndex
CREATE INDEX "Paciente_hospitalId_arquivadoEm_createdAt_idx" ON "Paciente"("hospitalId", "arquivadoEm", "createdAt");

-- CreateIndex
CREATE INDEX "Paciente_hospitalId_status_idx" ON "Paciente"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "SinalVital_pacienteId_createdAt_idx" ON "SinalVital"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "SinalVital_usuarioId_idx" ON "SinalVital"("usuarioId");

-- CreateIndex
CREATE INDEX "TimelineEvent_pacienteId_createdAt_idx" ON "TimelineEvent"("pacienteId", "createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_usuarioId_idx" ON "TimelineEvent"("usuarioId");

-- AddForeignKey
ALTER TABLE "Exame" ADD CONSTRAINT "Exame_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exame" ADD CONSTRAINT "Exame_liberadoPorId_fkey" FOREIGN KEY ("liberadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obito" ADD CONSTRAINT "Obito_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obito" ADD CONSTRAINT "Obito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SinalVital" ADD CONSTRAINT "SinalVital_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscoreClinico" ADD CONSTRAINT "EscoreClinico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoNutricional" ADD CONSTRAINT "AvaliacaoNutricional_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoMedica" ADD CONSTRAINT "AvaliacaoMedica_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnotacaoEnfermagem" ADD CONSTRAINT "AnotacaoEnfermagem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Normaliza status legados para a jornada oficial
UPDATE "Paciente" SET "status" = 'Em Atendimento Médico' WHERE "status" = 'Em Atendimento';
UPDATE "Paciente" SET "status" = 'Alta Médica' WHERE "status" = 'Alta';
