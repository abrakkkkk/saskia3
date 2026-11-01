-- Reconstrói o que foi criado via `db push` e nunca entrou em migration.
-- Idempotente: em banco vazio cria tudo; no banco já existente só completa o que faltar.

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN IF NOT EXISTS "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "Cirurgia" ADD COLUMN IF NOT EXISTS "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "Evolucao" ADD COLUMN IF NOT EXISTS "usuarioId" TEXT;

-- Paciente.status deixa de ser enum, preservando os valores
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'Paciente' AND column_name = 'status' AND udt_name = 'StatusPaciente') THEN
    ALTER TABLE "Paciente" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Paciente" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
    ALTER TABLE "Paciente" ALTER COLUMN "status" SET DEFAULT 'Recepção';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Prescricao" ADD COLUMN IF NOT EXISTS "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "Receita" ADD COLUMN IF NOT EXISTS "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "Sala" ADD COLUMN IF NOT EXISTS "pacienteId" TEXT;

-- AlterTable
ALTER TABLE "Triagem" ADD COLUMN IF NOT EXISTS "usuarioId" TEXT;

-- AlterTable
ALTER TABLE "UtiLeito" ADD COLUMN IF NOT EXISTS "pacienteId" TEXT;

DROP TYPE IF EXISTS "StatusPaciente";

-- CreateTable
CREATE TABLE IF NOT EXISTS "ModeloProntuario" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "campos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeloProntuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Obito" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "causa" TEXT NOT NULL,
    "causaSec" TEXT,
    "certidaoEmitida" BOOLEAN NOT NULL DEFAULT false,
    "cpf" TEXT,
    "data" TEXT NOT NULL,
    "dataRegistro" TEXT,
    "hora" TEXT NOT NULL,
    "local" TEXT,
    "medico" TEXT NOT NULL,
    "nascimento" TEXT,
    "nome" TEXT NOT NULL,
    "observacoes" TEXT,
    "prontuario" TEXT,
    "registradoPor" TEXT,
    "responsavel" TEXT,
    "sexo" TEXT,
    "telefone" TEXT,

    CONSTRAINT "Obito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MensagemChat" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "remetente" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensagemChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CasoSocial" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "pacienteNome" TEXT NOT NULL,
    "situacao" TEXT NOT NULL,
    "detalhe" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EM ACOMPANHAMENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CasoSocial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OuvidoriaTicket" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "paciente" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "prazo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OuvidoriaTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VeiculoTransporte" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISPONÍVEL',
    "local" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VeiculoTransporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OcorrenciaSeguranca" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "local" TEXT NOT NULL,
    "relato" TEXT NOT NULL,
    "vigilante" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataResolucao" TIMESTAMP(3),
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "resolvidoPor" TEXT,

    CONSTRAINT "OcorrenciaSeguranca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OperadoraPlano" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigoAns" TEXT NOT NULL,
    "vigencia" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "teto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperadoraPlano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EstoqueSangue" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueSangue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SinalVital" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "pressao" TEXT,
    "fc" TEXT,
    "fr" TEXT,
    "temp" TEXT,
    "satO2" TEXT,
    "glicemia" TEXT,
    "profissional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SinalVital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EscoreClinico" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "glasgow" JSONB,
    "dor" INTEGER,
    "braden" JSONB,
    "profissional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscoreClinico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AvaliacaoNutricional" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "peso" TEXT,
    "altura" TEXT,
    "dieta" TEXT,
    "restricoes" TEXT,
    "profissional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvaliacaoNutricional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AvaliacaoMedica" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "responsavel" TEXT,
    "crm" TEXT,
    "especialidade" TEXT,
    "diagnostico" TEXT,
    "conduta" TEXT,
    "profissional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvaliacaoMedica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnotacaoEnfermagem" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "responsavel" TEXT,
    "coren" TEXT,
    "evolucao" TEXT,
    "prescricao" TEXT,
    "profissional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnotacaoEnfermagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TimelineEvent" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "user" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MovimentacaoEstoque" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "pacienteId" TEXT,
    "setor" TEXT,
    "fornecedor" TEXT,
    "responsavel" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,

    CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReservaSala" (
    "id" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "profissional" TEXT NOT NULL,
    "paciente" TEXT,
    "data" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservaSala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ManutencaoOS" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "equipamento" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL DEFAULT 'Normal',
    "solicitante" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManutencaoOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CssdLote" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "operador" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "equipamento" TEXT NOT NULL,
    "ciclo" TEXT NOT NULL,
    "indicadorQuimico" TEXT NOT NULL,
    "indicadorBiologico" TEXT NOT NULL,
    "bowieDick" TEXT NOT NULL,
    "obs" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Recepção',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CssdLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CssdItem" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "embalagem" TEXT NOT NULL,
    "integridade" TEXT NOT NULL DEFAULT 'Íntegra',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CssdItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransportePaciente" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "paciente" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "solicitante" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransportePaciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Fatura" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AdminLog" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT,
    "usuario" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Lembrete" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'consulta',
    "descricao" TEXT,
    "relacionado" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "criadoPor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lembrete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PontoRegistro" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "localizacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PontoRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Feedback" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CcihRegistro" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT,
    "dados" JSONB,
    "subtipo" TEXT,

    CONSTRAINT "CcihRegistro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Categoria" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Procedimento" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "codigo" TEXT,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "valorBase" DOUBLE PRECISION,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Procedimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Visitante" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "destino" TEXT,
    "pacienteId" TEXT,
    "entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saida" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DENTRO',

    CONSTRAINT "Visitante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ModeloProntuario_hospitalId_idx" ON "ModeloProntuario"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Obito_hospitalId_idx" ON "Obito"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MensagemChat_hospitalId_idx" ON "MensagemChat"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CasoSocial_hospitalId_idx" ON "CasoSocial"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OuvidoriaTicket_protocolo_key" ON "OuvidoriaTicket"("protocolo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OuvidoriaTicket_hospitalId_idx" ON "OuvidoriaTicket"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VeiculoTransporte_hospitalId_idx" ON "VeiculoTransporte"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OcorrenciaSeguranca_hospitalId_idx" ON "OcorrenciaSeguranca"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OperadoraPlano_hospitalId_idx" ON "OperadoraPlano"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstoqueSangue_hospitalId_idx" ON "EstoqueSangue"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SinalVital_pacienteId_idx" ON "SinalVital"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EscoreClinico_pacienteId_idx" ON "EscoreClinico"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AvaliacaoNutricional_pacienteId_idx" ON "AvaliacaoNutricional"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AvaliacaoMedica_pacienteId_idx" ON "AvaliacaoMedica"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnotacaoEnfermagem_pacienteId_idx" ON "AnotacaoEnfermagem"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TimelineEvent_pacienteId_idx" ON "TimelineEvent"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MovimentacaoEstoque_hospitalId_idx" ON "MovimentacaoEstoque"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MovimentacaoEstoque_itemId_idx" ON "MovimentacaoEstoque"("itemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MovimentacaoEstoque_pacienteId_idx" ON "MovimentacaoEstoque"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MovimentacaoEstoque_usuarioId_idx" ON "MovimentacaoEstoque"("usuarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReservaSala_salaId_idx" ON "ReservaSala"("salaId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReservaSala_hospitalId_idx" ON "ReservaSala"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ManutencaoOS_hospitalId_idx" ON "ManutencaoOS"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CssdLote_hospitalId_idx" ON "CssdLote"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CssdItem_loteId_idx" ON "CssdItem"("loteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransportePaciente_hospitalId_idx" ON "TransportePaciente"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Fatura_hospitalId_idx" ON "Fatura"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AdminLog_hospitalId_idx" ON "AdminLog"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Lembrete_hospitalId_idx" ON "Lembrete"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PontoRegistro_hospitalId_idx" ON "PontoRegistro"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PontoRegistro_usuarioId_idx" ON "PontoRegistro"("usuarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Feedback_hospitalId_idx" ON "Feedback"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Feedback_usuarioId_idx" ON "Feedback"("usuarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CcihRegistro_hospitalId_idx" ON "CcihRegistro"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CcihRegistro_tipo_idx" ON "CcihRegistro"("tipo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Categoria_hospitalId_idx" ON "Categoria"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Procedimento_hospitalId_idx" ON "Procedimento"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Visitante_hospitalId_idx" ON "Visitante"("hospitalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Visitante_pacienteId_idx" ON "Visitante"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Agendamento_usuarioId_idx" ON "Agendamento"("usuarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Cirurgia_usuarioId_idx" ON "Cirurgia"("usuarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Evolucao_usuarioId_idx" ON "Evolucao"("usuarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Prescricao_usuarioId_idx" ON "Prescricao"("usuarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Receita_usuarioId_idx" ON "Receita"("usuarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sala_pacienteId_idx" ON "Sala"("pacienteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Triagem_usuarioId_idx" ON "Triagem"("usuarioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UtiLeito_pacienteId_idx" ON "UtiLeito"("pacienteId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Triagem_usuarioId_fkey') THEN
    ALTER TABLE "Triagem" ADD CONSTRAINT "Triagem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Evolucao_usuarioId_fkey') THEN
    ALTER TABLE "Evolucao" ADD CONSTRAINT "Evolucao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Prescricao_usuarioId_fkey') THEN
    ALTER TABLE "Prescricao" ADD CONSTRAINT "Prescricao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Receita_usuarioId_fkey') THEN
    ALTER TABLE "Receita" ADD CONSTRAINT "Receita_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Agendamento_usuarioId_fkey') THEN
    ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Cirurgia_usuarioId_fkey') THEN
    ALTER TABLE "Cirurgia" ADD CONSTRAINT "Cirurgia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UtiLeito_pacienteId_fkey') THEN
    ALTER TABLE "UtiLeito" ADD CONSTRAINT "UtiLeito_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Sala_pacienteId_fkey') THEN
    ALTER TABLE "Sala" ADD CONSTRAINT "Sala_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ModeloProntuario_hospitalId_fkey') THEN
    ALTER TABLE "ModeloProntuario" ADD CONSTRAINT "ModeloProntuario_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Obito_hospitalId_fkey') THEN
    ALTER TABLE "Obito" ADD CONSTRAINT "Obito_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MensagemChat_hospitalId_fkey') THEN
    ALTER TABLE "MensagemChat" ADD CONSTRAINT "MensagemChat_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CasoSocial_hospitalId_fkey') THEN
    ALTER TABLE "CasoSocial" ADD CONSTRAINT "CasoSocial_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OuvidoriaTicket_hospitalId_fkey') THEN
    ALTER TABLE "OuvidoriaTicket" ADD CONSTRAINT "OuvidoriaTicket_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VeiculoTransporte_hospitalId_fkey') THEN
    ALTER TABLE "VeiculoTransporte" ADD CONSTRAINT "VeiculoTransporte_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OcorrenciaSeguranca_hospitalId_fkey') THEN
    ALTER TABLE "OcorrenciaSeguranca" ADD CONSTRAINT "OcorrenciaSeguranca_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OperadoraPlano_hospitalId_fkey') THEN
    ALTER TABLE "OperadoraPlano" ADD CONSTRAINT "OperadoraPlano_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EstoqueSangue_hospitalId_fkey') THEN
    ALTER TABLE "EstoqueSangue" ADD CONSTRAINT "EstoqueSangue_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SinalVital_pacienteId_fkey') THEN
    ALTER TABLE "SinalVital" ADD CONSTRAINT "SinalVital_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EscoreClinico_pacienteId_fkey') THEN
    ALTER TABLE "EscoreClinico" ADD CONSTRAINT "EscoreClinico_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AvaliacaoNutricional_pacienteId_fkey') THEN
    ALTER TABLE "AvaliacaoNutricional" ADD CONSTRAINT "AvaliacaoNutricional_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AvaliacaoMedica_pacienteId_fkey') THEN
    ALTER TABLE "AvaliacaoMedica" ADD CONSTRAINT "AvaliacaoMedica_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnotacaoEnfermagem_pacienteId_fkey') THEN
    ALTER TABLE "AnotacaoEnfermagem" ADD CONSTRAINT "AnotacaoEnfermagem_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TimelineEvent_pacienteId_fkey') THEN
    ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MovimentacaoEstoque_hospitalId_fkey') THEN
    ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MovimentacaoEstoque_itemId_fkey') THEN
    ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "EstoqueItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MovimentacaoEstoque_pacienteId_fkey') THEN
    ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MovimentacaoEstoque_usuarioId_fkey') THEN
    ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReservaSala_hospitalId_fkey') THEN
    ALTER TABLE "ReservaSala" ADD CONSTRAINT "ReservaSala_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReservaSala_salaId_fkey') THEN
    ALTER TABLE "ReservaSala" ADD CONSTRAINT "ReservaSala_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ManutencaoOS_hospitalId_fkey') THEN
    ALTER TABLE "ManutencaoOS" ADD CONSTRAINT "ManutencaoOS_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CssdLote_hospitalId_fkey') THEN
    ALTER TABLE "CssdLote" ADD CONSTRAINT "CssdLote_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CssdItem_loteId_fkey') THEN
    ALTER TABLE "CssdItem" ADD CONSTRAINT "CssdItem_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "CssdLote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TransportePaciente_hospitalId_fkey') THEN
    ALTER TABLE "TransportePaciente" ADD CONSTRAINT "TransportePaciente_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Fatura_hospitalId_fkey') THEN
    ALTER TABLE "Fatura" ADD CONSTRAINT "Fatura_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminLog_hospitalId_fkey') THEN
    ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lembrete_hospitalId_fkey') THEN
    ALTER TABLE "Lembrete" ADD CONSTRAINT "Lembrete_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PontoRegistro_hospitalId_fkey') THEN
    ALTER TABLE "PontoRegistro" ADD CONSTRAINT "PontoRegistro_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PontoRegistro_usuarioId_fkey') THEN
    ALTER TABLE "PontoRegistro" ADD CONSTRAINT "PontoRegistro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Feedback_hospitalId_fkey') THEN
    ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Feedback_usuarioId_fkey') THEN
    ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CcihRegistro_hospitalId_fkey') THEN
    ALTER TABLE "CcihRegistro" ADD CONSTRAINT "CcihRegistro_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Categoria_hospitalId_fkey') THEN
    ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Procedimento_hospitalId_fkey') THEN
    ALTER TABLE "Procedimento" ADD CONSTRAINT "Procedimento_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Visitante_hospitalId_fkey') THEN
    ALTER TABLE "Visitante" ADD CONSTRAINT "Visitante_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Visitante_pacienteId_fkey') THEN
    ALTER TABLE "Visitante" ADD CONSTRAINT "Visitante_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
