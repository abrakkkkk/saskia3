-- Acervo de documentos (catalogo; os arquivos ficam no Vercel Blob privado). So cria tabela e indice.
CREATE TABLE "Documento" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "titulo" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "grupo" TEXT,
  "instituicao" TEXT,
  "tags" TEXT[],
  "arquivo" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "tamanho" INTEGER NOT NULL,
  "hash" TEXT NOT NULL,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Documento_slug_key" ON "Documento"("slug");
CREATE INDEX "Documento_categoria_ordem_idx" ON "Documento"("categoria", "ordem");
