-- Item 14: codigo curto da unidade (o login deixa de listar hospitais).
ALTER TABLE "Hospital" ADD COLUMN "codigo" TEXT;
CREATE UNIQUE INDEX "Hospital_codigo_key" ON "Hospital"("codigo");

-- Preenche os hospitais existentes com 6 caracteres sem ambiguidade (sem 0/O, 1/I/L).
DO $$
DECLARE
  h RECORD;
  alfabeto TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  novo TEXT;
BEGIN
  FOR h IN SELECT "id" FROM "Hospital" WHERE "codigo" IS NULL LOOP
    LOOP
      novo := '';
      FOR i IN 1..6 LOOP
        novo := novo || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Hospital" WHERE "codigo" = novo);
    END LOOP;
    UPDATE "Hospital" SET "codigo" = novo WHERE "id" = h."id";
  END LOOP;
END $$;

-- Item 13: verificacao em duas etapas (TOTP) e codigos de recuperacao.
ALTER TABLE "Usuario" ADD COLUMN "mfaSegredo" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "mfaAtivo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "mfaUltimoPasso" INTEGER;
ALTER TABLE "Usuario" ADD COLUMN "mfaCodigosBackup" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Item 13: "esqueci minha senha" (token de uso unico, guardado como hash).
CREATE TABLE "TokenRedefinicaoSenha" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenRedefinicaoSenha_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TokenRedefinicaoSenha_tokenHash_key" ON "TokenRedefinicaoSenha"("tokenHash");
CREATE INDEX "TokenRedefinicaoSenha_usuarioId_idx" ON "TokenRedefinicaoSenha"("usuarioId");
ALTER TABLE "TokenRedefinicaoSenha" ADD CONSTRAINT "TokenRedefinicaoSenha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
