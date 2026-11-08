-- Quem pode prescrever o que (decisao do gestor, por usuario) e o tipo de cada prescricao.
ALTER TABLE "Usuario" ADD COLUMN "prescricoesAutorizadas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Receita" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'FARMACOLOGICA';

-- Quem ja era medico continua prescrevendo como antes; os demais so passam a prescrever quando o gestor autorizar.
UPDATE "Usuario" SET "prescricoesAutorizadas" = ARRAY['FARMACOLOGICA','CUIDADO','OXIGENOTERAPIA','DIETA']::TEXT[] WHERE "cargo" = 'MEDICO';
