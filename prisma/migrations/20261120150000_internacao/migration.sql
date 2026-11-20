-- Item 9: internação como entidade própria (aditiva; Paciente.status continua existindo).
-- CreateEnum
CREATE TYPE "TipoSaidaInternacao" AS ENUM ('ALTA_MEDICA', 'TRANSFERENCIA', 'EVASAO', 'OBITO');

-- CreateTable
CREATE TABLE "Internacao" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "entradaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setor" TEXT NOT NULL,
    "leito" TEXT,
    "utiLeitoId" TEXT,
    "motivo" TEXT,
    "cid" TEXT,
    "medicoResponsavelId" TEXT,
    "medicoResponsavelNome" TEXT,
    "registradoPorId" TEXT,
    "registradoPorNome" TEXT,
    "saidaEm" TIMESTAMP(3),
    "tipoSaida" "TipoSaidaInternacao",
    "destinoTransferencia" TEXT,
    "motivoSaida" TEXT,
    "encerradoPorId" TEXT,
    "encerradoPorNome" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'SISTEMA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Internacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoLeito" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "internacaoId" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "leito" TEXT,
    "utiLeitoId" TEXT,
    "inicioEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fimEm" TIMESTAMP(3),
    "motivo" TEXT,
    "usuarioId" TEXT,
    "usuarioNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoLeito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Internacao_hospitalId_saidaEm_idx" ON "Internacao"("hospitalId", "saidaEm");

-- CreateIndex
CREATE INDEX "Internacao_hospitalId_tipoSaida_saidaEm_idx" ON "Internacao"("hospitalId", "tipoSaida", "saidaEm");

-- CreateIndex
CREATE INDEX "Internacao_pacienteId_entradaEm_idx" ON "Internacao"("pacienteId", "entradaEm");

-- CreateIndex
CREATE INDEX "Internacao_utiLeitoId_idx" ON "Internacao"("utiLeitoId");

-- CreateIndex
CREATE INDEX "MovimentacaoLeito_internacaoId_inicioEm_idx" ON "MovimentacaoLeito"("internacaoId", "inicioEm");

-- CreateIndex
CREATE INDEX "MovimentacaoLeito_hospitalId_idx" ON "MovimentacaoLeito"("hospitalId");

-- AddForeignKey
ALTER TABLE "Internacao" ADD CONSTRAINT "Internacao_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internacao" ADD CONSTRAINT "Internacao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internacao" ADD CONSTRAINT "Internacao_utiLeitoId_fkey" FOREIGN KEY ("utiLeitoId") REFERENCES "UtiLeito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoLeito" ADD CONSTRAINT "MovimentacaoLeito_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoLeito" ADD CONSTRAINT "MovimentacaoLeito_internacaoId_fkey" FOREIGN KEY ("internacaoId") REFERENCES "Internacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoLeito" ADD CONSTRAINT "MovimentacaoLeito_utiLeitoId_fkey" FOREIGN KEY ("utiLeitoId") REFERENCES "UtiLeito"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- No máximo uma internação aberta por paciente.
CREATE UNIQUE INDEX "Internacao_paciente_aberta_key" ON "Internacao"("pacienteId") WHERE "saidaEm" IS NULL;

-- Preenchimento: cada paciente hoje com status de internação ganha uma internação aberta.
-- Entrada = último evento de status para internação na timeline (ou a última atualização do cadastro).
-- Setor UTI quando o status é "Internado - UTI" (com o leito de UTI ocupado, se houver); senão o tipo de leito informado.
INSERT INTO "Internacao" ("id", "hospitalId", "pacienteId", "entradaEm", "setor", "leito", "utiLeitoId", "motivo", "origem", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  p."hospitalId",
  p."id",
  COALESCE(
    (SELECT MAX(t."createdAt") FROM "TimelineEvent" t
      WHERE t."pacienteId" = p."id" AND (t."descricao" LIKE '%para Internado%' OR t."descricao" LIKE '%status Internado%')),
    p."updatedAt"
  ),
  CASE WHEN p."status" = 'Internado - UTI' THEN 'UTI' ELSE COALESCE(NULLIF(TRIM(p."leitoTipo"), ''), 'Enfermaria') END,
  CASE WHEN u."id" IS NOT NULL THEN u."numero"::text ELSE p."leitoNumero"::text END,
  u."id",
  p."queixaPrincipal",
  'MIGRACAO_STATUS',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Paciente" p
LEFT JOIN LATERAL (
  SELECT l."id", l."numero" FROM "UtiLeito" l
  WHERE l."pacienteId" = p."id" AND l."hospitalId" = p."hospitalId" AND l."status" = 'OCUPADO'
  ORDER BY l."updatedAt" DESC LIMIT 1
) u ON p."status" = 'Internado - UTI'
WHERE p."status" IN ('Internado', 'Internado - UTI');

-- Leito atual de cada internação preenchida.
INSERT INTO "MovimentacaoLeito" ("id", "hospitalId", "internacaoId", "setor", "leito", "utiLeitoId", "inicioEm", "motivo", "createdAt")
SELECT gen_random_uuid()::text, i."hospitalId", i."id", i."setor", i."leito", i."utiLeitoId", i."entradaEm", 'Leito de origem (migração)', CURRENT_TIMESTAMP
FROM "Internacao" i
WHERE i."origem" = 'MIGRACAO_STATUS';
