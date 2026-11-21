-- Item 7: faturamento hospitalar (TISS para convênios, BPA/AIH para o SUS). Só acrescenta: cargo, colunas opcionais e tabelas novas.
-- AlterEnum
ALTER TYPE "CargoUsuario" ADD VALUE IF NOT EXISTS 'FATURISTA';

-- AlterTable
ALTER TABLE "OperadoraPlano" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "codigoPrestador" TEXT,
ADD COLUMN     "versaoTiss" TEXT NOT NULL DEFAULT '4.03.00';

-- CreateTable
CREATE TABLE "ConfigFaturamento" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "cnes" TEXT,
    "municipioIbge" TEXT,
    "uf" TEXT,
    "orgaoDestinoNome" TEXT,
    "orgaoDestinoTipo" TEXT NOT NULL DEFAULT 'M',
    "orgaoOrigemNome" TEXT,
    "orgaoOrigemSigla" TEXT,
    "orgaoEmissorAih" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigFaturamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedimentoTabela" (
    "id" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "valorSh" DECIMAL(12,2),
    "valorSa" DECIMAL(12,2),
    "valorSp" DECIMAL(12,2),
    "complexidade" TEXT,
    "sexo" TEXT,
    "idadeMin" INTEGER,
    "idadeMax" INTEGER,
    "diasPermanencia" INTEGER,
    "instrumentos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "busca" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedimentoTabela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrecoConvenio" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "operadoraId" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecoConvenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaFaturamento" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "internacaoId" TEXT,
    "fonte" TEXT NOT NULL,
    "tipoGuia" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "competencia" TEXT NOT NULL,
    "dataAtendimento" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "operadoraId" TEXT,
    "numeroCarteira" TEXT,
    "senhaAutorizacao" TEXT,
    "numeroGuiaOperadora" TEXT,
    "dataAutorizacao" TIMESTAMP(3),
    "cid" TEXT,
    "caraterAtendimento" TEXT NOT NULL DEFAULT '1',
    "indicacaoAcidente" TEXT NOT NULL DEFAULT '9',
    "tipoAtendimento" TEXT,
    "tipoConsulta" TEXT,
    "regimeAtendimento" TEXT NOT NULL DEFAULT '01',
    "motivoEncerramento" TEXT,
    "tipoInternacao" TEXT,
    "regimeInternacao" TEXT,
    "profissionalId" TEXT,
    "profissionalNome" TEXT,
    "conselho" TEXT,
    "numeroConselho" TEXT,
    "ufConselho" TEXT,
    "cbo" TEXT,
    "cnsProfissional" TEXT,
    "cnsPaciente" TEXT,
    "racaCor" TEXT,
    "municipioIbgePaciente" TEXT,
    "cepPaciente" TEXT,
    "numeroAih" TEXT,
    "procedimentoPrincipal" TEXT,
    "especialidadeAih" TEXT,
    "observacao" TEXT,
    "valorTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorGlosado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(12,2),
    "loteId" TEXT,
    "criadoPorId" TEXT,
    "criadoPorNome" TEXT,
    "fechadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaFaturamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemConta" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,4) NOT NULL,
    "valorUnitario" DECIMAL(12,2) NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "dataExecucao" TIMESTAMP(3) NOT NULL,
    "codigoDespesa" TEXT,
    "unidadeMedida" TEXT,
    "cbo" TEXT,
    "valorGlosado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "motivoGlosa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemConta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteFaturamento" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "operadoraId" TEXT,
    "competencia" TEXT,
    "tipoGuia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GERADO',
    "arquivoNome" TEXT NOT NULL,
    "arquivoConteudo" TEXT NOT NULL,
    "hash" TEXT,
    "quantidadeContas" INTEGER NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "protocolo" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "geradoPorId" TEXT,
    "geradoPorNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoteFaturamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigFaturamento_hospitalId_key" ON "ConfigFaturamento"("hospitalId");

-- CreateIndex
CREATE INDEX "ProcedimentoTabela_tabela_ativo_idx" ON "ProcedimentoTabela"("tabela", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedimentoTabela_tabela_codigo_key" ON "ProcedimentoTabela"("tabela", "codigo");

-- CreateIndex
CREATE INDEX "PrecoConvenio_hospitalId_idx" ON "PrecoConvenio"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "PrecoConvenio_operadoraId_tabela_codigo_key" ON "PrecoConvenio"("operadoraId", "tabela", "codigo");

-- CreateIndex
CREATE INDEX "ContaFaturamento_hospitalId_status_idx" ON "ContaFaturamento"("hospitalId", "status");

-- CreateIndex
CREATE INDEX "ContaFaturamento_hospitalId_competencia_fonte_idx" ON "ContaFaturamento"("hospitalId", "competencia", "fonte");

-- CreateIndex
CREATE INDEX "ContaFaturamento_pacienteId_idx" ON "ContaFaturamento"("pacienteId");

-- CreateIndex
CREATE INDEX "ContaFaturamento_internacaoId_idx" ON "ContaFaturamento"("internacaoId");

-- CreateIndex
CREATE INDEX "ContaFaturamento_loteId_idx" ON "ContaFaturamento"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "ContaFaturamento_hospitalId_numero_key" ON "ContaFaturamento"("hospitalId", "numero");

-- CreateIndex
CREATE INDEX "ItemConta_contaId_idx" ON "ItemConta"("contaId");

-- CreateIndex
CREATE INDEX "ItemConta_hospitalId_idx" ON "ItemConta"("hospitalId");

-- CreateIndex
CREATE INDEX "LoteFaturamento_hospitalId_createdAt_idx" ON "LoteFaturamento"("hospitalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoteFaturamento_hospitalId_tipo_numero_key" ON "LoteFaturamento"("hospitalId", "tipo", "numero");

-- AddForeignKey
ALTER TABLE "ConfigFaturamento" ADD CONSTRAINT "ConfigFaturamento_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoConvenio" ADD CONSTRAINT "PrecoConvenio_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrecoConvenio" ADD CONSTRAINT "PrecoConvenio_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "OperadoraPlano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFaturamento" ADD CONSTRAINT "ContaFaturamento_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFaturamento" ADD CONSTRAINT "ContaFaturamento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFaturamento" ADD CONSTRAINT "ContaFaturamento_internacaoId_fkey" FOREIGN KEY ("internacaoId") REFERENCES "Internacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFaturamento" ADD CONSTRAINT "ContaFaturamento_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "OperadoraPlano"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFaturamento" ADD CONSTRAINT "ContaFaturamento_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteFaturamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemConta" ADD CONSTRAINT "ItemConta_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemConta" ADD CONSTRAINT "ItemConta_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaFaturamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteFaturamento" ADD CONSTRAINT "LoteFaturamento_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteFaturamento" ADD CONSTRAINT "LoteFaturamento_operadoraId_fkey" FOREIGN KEY ("operadoraId") REFERENCES "OperadoraPlano"("id") ON DELETE SET NULL ON UPDATE CASCADE;

