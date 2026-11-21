-- Item 8 (interoperabilidade), fase 2: RNDS (configuração, doses aplicadas e fila de envio). Aditiva.
-- CreateEnum
CREATE TYPE "StatusEnvioRnds" AS ENUM ('PENDENTE', 'ENVIADO', 'ERRO', 'SIMULADO');

-- CreateTable
CREATE TABLE "IntegracaoRnds" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "ambiente" TEXT NOT NULL DEFAULT 'SIMULACAO',
    "identificadorSolicitante" TEXT,
    "cnsRequisitante" TEXT,
    "envioAutomatico" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegracaoRnds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacinaAplicada" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "imunobiologico" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "validade" TIMESTAMP(3),
    "dose" TEXT NOT NULL,
    "estrategia" TEXT NOT NULL DEFAULT '1',
    "via" TEXT NOT NULL,
    "localAplicacao" TEXT NOT NULL,
    "grupoAtendimento" TEXT NOT NULL DEFAULT '00',
    "condicaoMaternal" TEXT NOT NULL DEFAULT '1',
    "registroOrigem" TEXT,
    "pais" TEXT,
    "aplicadaEm" TIMESTAMP(3) NOT NULL,
    "profissionalId" TEXT,
    "profissionalNome" TEXT NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacinaAplicada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioRnds" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "origemId" TEXT NOT NULL,
    "identificadorLocal" TEXT NOT NULL,
    "status" "StatusEnvioRnds" NOT NULL DEFAULT 'PENDENTE',
    "ambiente" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,
    "problemas" JSONB,
    "dadosExame" JSONB,
    "idRnds" TEXT,
    "criadoPorId" TEXT,
    "criadoPorNome" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvioRnds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegracaoRnds_hospitalId_key" ON "IntegracaoRnds"("hospitalId");

-- CreateIndex
CREATE INDEX "VacinaAplicada_hospitalId_pacienteId_idx" ON "VacinaAplicada"("hospitalId", "pacienteId");

-- CreateIndex
CREATE INDEX "VacinaAplicada_hospitalId_aplicadaEm_idx" ON "VacinaAplicada"("hospitalId", "aplicadaEm");

-- CreateIndex
CREATE UNIQUE INDEX "EnvioRnds_identificadorLocal_key" ON "EnvioRnds"("identificadorLocal");

-- CreateIndex
CREATE INDEX "EnvioRnds_hospitalId_status_idx" ON "EnvioRnds"("hospitalId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EnvioRnds_hospitalId_tipo_origemId_key" ON "EnvioRnds"("hospitalId", "tipo", "origemId");

-- AddForeignKey
ALTER TABLE "IntegracaoRnds" ADD CONSTRAINT "IntegracaoRnds_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacinaAplicada" ADD CONSTRAINT "VacinaAplicada_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacinaAplicada" ADD CONSTRAINT "VacinaAplicada_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioRnds" ADD CONSTRAINT "EnvioRnds_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

