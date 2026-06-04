-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "endereco" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "logo" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cargo" TEXT NOT NULL DEFAULT 'enfermeiro_assistencial',
    "avatar" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "nascimento" TIMESTAMP(3),
    "sexo" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "convenio" TEXT,
    "numConvenio" TEXT,
    "mae" TEXT,
    "pai" TEXT,
    "profissao" TEXT,
    "estadoCivil" TEXT,
    "nacionalidade" TEXT,
    "naturalidade" TEXT,
    "religiao" TEXT,
    "etnia" TEXT,
    "tipoSanguineo" TEXT,
    "alergias" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Recepção',
    "classificacao" TEXT,
    "leitoTipo" TEXT,
    "leitoNumero" INTEGER,
    "consultorio" TEXT,
    "queixaPrincipal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Triagem" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "classificacao" TEXT NOT NULL,
    "pressao" TEXT,
    "temperatura" TEXT,
    "frequenciaC" TEXT,
    "frequenciaR" TEXT,
    "saturacao" TEXT,
    "glicemia" TEXT,
    "peso" TEXT,
    "altura" TEXT,
    "dor" INTEGER,
    "queixa" TEXT,
    "observacoes" TEXT,
    "profissional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Triagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evolucao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "profissional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evolucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescricao" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "medicamento" TEXT NOT NULL,
    "dose" TEXT,
    "via" TEXT,
    "frequencia" TEXT,
    "observacoes" TEXT,
    "profissional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescricao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receita" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "medicamentos" JSONB NOT NULL,
    "observacoes" TEXT,
    "profissional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "hora" TEXT NOT NULL,
    "tipo" TEXT,
    "especialidade" TEXT,
    "profissional" TEXT,
    "sala" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Agendado',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exame" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "resultado" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Solicitado',
    "profissional" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cirurgia" (
    "id" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "procedimento" TEXT NOT NULL,
    "sala" TEXT,
    "data" TIMESTAMP(3),
    "hora" TEXT,
    "equipe" TEXT,
    "anestesia" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Agendada',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cirurgia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtiLeito" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'adulto',
    "status" TEXT NOT NULL DEFAULT 'livre',
    "pacienteNome" TEXT,
    "pacienteCpf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtiLeito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sala" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "setor" TEXT,
    "andar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'livre',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "solicitante" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL DEFAULT 'Média',
    "status" TEXT NOT NULL DEFAULT 'Enviado',
    "respostas" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chamada" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "pacienteId" TEXT,
    "pacienteNome" TEXT NOT NULL,
    "cpf" TEXT,
    "consultorio" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chamada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emergencia" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "profissional" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Emergencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstoqueItem" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "unidade" TEXT,
    "minimo" INTEGER NOT NULL DEFAULT 0,
    "lote" TEXT,
    "validade" TIMESTAMP(3),
    "fornecedor" TEXT,
    "localizacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigDashboard" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_cnpj_key" ON "Hospital"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_hospitalId_idx" ON "Usuario"("hospitalId");

-- CreateIndex
CREATE INDEX "Paciente_hospitalId_idx" ON "Paciente"("hospitalId");

-- CreateIndex
CREATE INDEX "Paciente_cpf_idx" ON "Paciente"("cpf");

-- CreateIndex
CREATE INDEX "Triagem_pacienteId_idx" ON "Triagem"("pacienteId");

-- CreateIndex
CREATE INDEX "Evolucao_pacienteId_idx" ON "Evolucao"("pacienteId");

-- CreateIndex
CREATE INDEX "Prescricao_pacienteId_idx" ON "Prescricao"("pacienteId");

-- CreateIndex
CREATE INDEX "Receita_pacienteId_idx" ON "Receita"("pacienteId");

-- CreateIndex
CREATE INDEX "Receita_hospitalId_idx" ON "Receita"("hospitalId");

-- CreateIndex
CREATE INDEX "Agendamento_pacienteId_idx" ON "Agendamento"("pacienteId");

-- CreateIndex
CREATE INDEX "Agendamento_hospitalId_idx" ON "Agendamento"("hospitalId");

-- CreateIndex
CREATE INDEX "Agendamento_data_idx" ON "Agendamento"("data");

-- CreateIndex
CREATE INDEX "Exame_pacienteId_idx" ON "Exame"("pacienteId");

-- CreateIndex
CREATE INDEX "Exame_hospitalId_idx" ON "Exame"("hospitalId");

-- CreateIndex
CREATE INDEX "Cirurgia_pacienteId_idx" ON "Cirurgia"("pacienteId");

-- CreateIndex
CREATE INDEX "Cirurgia_hospitalId_idx" ON "Cirurgia"("hospitalId");

-- CreateIndex
CREATE INDEX "UtiLeito_hospitalId_idx" ON "UtiLeito"("hospitalId");

-- CreateIndex
CREATE INDEX "Sala_hospitalId_idx" ON "Sala"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_numero_key" ON "Ticket"("numero");

-- CreateIndex
CREATE INDEX "Ticket_hospitalId_idx" ON "Ticket"("hospitalId");

-- CreateIndex
CREATE INDEX "Chamada_hospitalId_idx" ON "Chamada"("hospitalId");

-- CreateIndex
CREATE INDEX "Emergencia_hospitalId_idx" ON "Emergencia"("hospitalId");

-- CreateIndex
CREATE INDEX "EstoqueItem_hospitalId_idx" ON "EstoqueItem"("hospitalId");

-- CreateIndex
CREATE INDEX "EstoqueItem_categoria_idx" ON "EstoqueItem"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigDashboard_hospitalId_key" ON "ConfigDashboard"("hospitalId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Triagem" ADD CONSTRAINT "Triagem_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolucao" ADD CONSTRAINT "Evolucao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescricao" ADD CONSTRAINT "Prescricao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exame" ADD CONSTRAINT "Exame_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exame" ADD CONSTRAINT "Exame_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cirurgia" ADD CONSTRAINT "Cirurgia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cirurgia" ADD CONSTRAINT "Cirurgia_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtiLeito" ADD CONSTRAINT "UtiLeito_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sala" ADD CONSTRAINT "Sala_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamada" ADD CONSTRAINT "Chamada_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chamada" ADD CONSTRAINT "Chamada_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergencia" ADD CONSTRAINT "Emergencia_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueItem" ADD CONSTRAINT "EstoqueItem_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigDashboard" ADD CONSTRAINT "ConfigDashboard_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
