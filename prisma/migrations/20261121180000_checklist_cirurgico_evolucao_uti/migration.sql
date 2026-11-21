-- Item 10: checklist cirúrgico (MS/Anvisa) e evolução de UTI (RDC 7/2010), com validação por hospital. Aditiva.
-- CreateEnum
CREATE TYPE "EtapaChecklistCirurgico" AS ENUM ('ANTES_INDUCAO', 'ANTES_INCISAO', 'ANTES_SAIDA');

-- CreateTable
CREATE TABLE "ChecklistCirurgicoEtapa" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "cirurgiaId" TEXT NOT NULL,
    "etapa" "EtapaChecklistCirurgico" NOT NULL,
    "respostas" JSONB NOT NULL,
    "observacoes" TEXT,
    "modelo" TEXT NOT NULL,
    "respondidoPorId" TEXT NOT NULL,
    "respondidoPorNome" TEXT NOT NULL,
    "respondidoPorCargo" TEXT NOT NULL,
    "respondidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistCirurgicoEtapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolucaoUti" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "internacaoId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "utiLeitoId" TEXT,
    "registradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "autorCargo" TEXT NOT NULL,
    "pas" INTEGER,
    "pad" INTEGER,
    "fc" INTEGER,
    "fr" INTEGER,
    "temperatura" DOUBLE PRECISION,
    "spo2" INTEGER,
    "glicemia" INTEGER,
    "dispositivos" JSONB,
    "ventilacao" TEXT,
    "fio2" INTEGER,
    "peep" INTEGER,
    "ventilacaoObs" TEXT,
    "entradasMl" INTEGER,
    "saidasMl" INTEGER,
    "rass" INTEGER,
    "glasgowOcular" INTEGER,
    "glasgowVerbal" INTEGER,
    "glasgowMotora" INTEGER,
    "glasgowTotal" INTEGER,
    "bradenItens" JSONB,
    "bradenTotal" INTEGER,
    "dor" INTEGER,
    "dorEscala" TEXT,
    "evolucao" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvolucaoUti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidacaoModeloClinico" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "validadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validadoPorId" TEXT NOT NULL,
    "validadoPorNome" TEXT NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "ValidacaoModeloClinico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistCirurgicoEtapa_hospitalId_respondidoEm_idx" ON "ChecklistCirurgicoEtapa"("hospitalId", "respondidoEm");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistCirurgicoEtapa_cirurgiaId_etapa_key" ON "ChecklistCirurgicoEtapa"("cirurgiaId", "etapa");

-- CreateIndex
CREATE INDEX "EvolucaoUti_hospitalId_internacaoId_registradoEm_idx" ON "EvolucaoUti"("hospitalId", "internacaoId", "registradoEm");

-- CreateIndex
CREATE INDEX "EvolucaoUti_hospitalId_registradoEm_idx" ON "EvolucaoUti"("hospitalId", "registradoEm");

-- CreateIndex
CREATE UNIQUE INDEX "ValidacaoModeloClinico_hospitalId_modelo_key" ON "ValidacaoModeloClinico"("hospitalId", "modelo");

-- AddForeignKey
ALTER TABLE "ChecklistCirurgicoEtapa" ADD CONSTRAINT "ChecklistCirurgicoEtapa_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistCirurgicoEtapa" ADD CONSTRAINT "ChecklistCirurgicoEtapa_cirurgiaId_fkey" FOREIGN KEY ("cirurgiaId") REFERENCES "Cirurgia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolucaoUti" ADD CONSTRAINT "EvolucaoUti_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolucaoUti" ADD CONSTRAINT "EvolucaoUti_internacaoId_fkey" FOREIGN KEY ("internacaoId") REFERENCES "Internacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidacaoModeloClinico" ADD CONSTRAINT "ValidacaoModeloClinico_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

