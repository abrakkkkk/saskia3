-- Registro profissional do usuario (CRM etc.) e foto dele na receita. So adiciona colunas.
ALTER TABLE "Usuario"
  ADD COLUMN "conselho" TEXT,
  ADD COLUMN "registroNumero" TEXT,
  ADD COLUMN "registroUf" TEXT,
  ADD COLUMN "especialidade" TEXT,
  ADD COLUMN "rqe" TEXT;

ALTER TABLE "Receita"
  ADD COLUMN "registroProfissional" TEXT,
  ADD COLUMN "especialidadeProfissional" TEXT;
