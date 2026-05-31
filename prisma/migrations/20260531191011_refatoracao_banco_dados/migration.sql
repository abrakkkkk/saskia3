/*
  Warnings:

  - You are about to drop the column `data` on the `Agendamento` table. All the data in the column will be lost.
  - You are about to drop the column `hora` on the `Agendamento` table. All the data in the column will be lost.
  - The `status` column on the `Agendamento` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Chamada` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `data` on the `Cirurgia` table. All the data in the column will be lost.
  - You are about to drop the column `hora` on the `Cirurgia` table. All the data in the column will be lost.
  - The `status` column on the `Cirurgia` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Exame` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Paciente` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Sala` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `prioridade` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `temperatura` column on the `Triagem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `frequenciaC` column on the `Triagem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `frequenciaR` column on the `Triagem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `saturacao` column on the `Triagem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `glicemia` column on the `Triagem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `peso` column on the `Triagem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `altura` column on the `Triagem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cargo` column on the `Usuario` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `tipo` column on the `UtiLeito` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `UtiLeito` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[cpf,hospitalId]` on the table `Paciente` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dataHora` to the `Agendamento` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CargoUsuario" AS ENUM ('ADMIN', 'MEDICO', 'ENFERMEIRO_ASSISTENCIAL', 'TECNICO_ENFERMAGEM', 'RECEPCIONISTA', 'FARMACEUTICO', 'OUTROS');

-- CreateEnum
CREATE TYPE "StatusPaciente" AS ENUM ('RECEPCAO', 'TRIAGEM', 'ATENDIMENTO', 'OBSERVACAO', 'INTERNACAO', 'ALTA', 'OBITO');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('AGENDADO', 'CONFIRMADO', 'EM_ESPERA', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTOU');

-- CreateEnum
CREATE TYPE "StatusExame" AS ENUM ('SOLICITADO', 'AGENDADO', 'COLETADO', 'EM_ANALISE', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusCirurgia" AS ENUM ('AGENDADA', 'EM_PREPARO', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoLeito" AS ENUM ('ADULTO', 'PEDIATRICO', 'NEONATAL');

-- CreateEnum
CREATE TYPE "StatusOcupacao" AS ENUM ('LIVRE', 'OCUPADO', 'RESERVADO', 'MANUTENCAO', 'LIMPEZA');

-- CreateEnum
CREATE TYPE "PrioridadeTicket" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "StatusTicket" AS ENUM ('ENVIADO', 'EM_ANALISE', 'RESOLVIDO', 'FECHADO');

-- CreateEnum
CREATE TYPE "StatusChamada" AS ENUM ('ATIVA', 'EM_ESPERA', 'FINALIZADA', 'CANCELADA');

-- DropIndex
DROP INDEX "Agendamento_data_idx";

-- AlterTable
ALTER TABLE "Agendamento" DROP COLUMN "data",
DROP COLUMN "hora",
ADD COLUMN     "dataHora" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "StatusAgendamento" NOT NULL DEFAULT 'AGENDADO';

-- AlterTable
ALTER TABLE "Chamada" DROP COLUMN "status",
ADD COLUMN     "status" "StatusChamada" NOT NULL DEFAULT 'ATIVA';

-- AlterTable
ALTER TABLE "Cirurgia" DROP COLUMN "data",
DROP COLUMN "hora",
ADD COLUMN     "dataHora" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "StatusCirurgia" NOT NULL DEFAULT 'AGENDADA';

-- AlterTable
ALTER TABLE "Exame" DROP COLUMN "status",
ADD COLUMN     "status" "StatusExame" NOT NULL DEFAULT 'SOLICITADO';

-- AlterTable
ALTER TABLE "Paciente" DROP COLUMN "status",
ADD COLUMN     "status" "StatusPaciente" NOT NULL DEFAULT 'RECEPCAO';

-- AlterTable
ALTER TABLE "Sala" DROP COLUMN "status",
ADD COLUMN     "status" "StatusOcupacao" NOT NULL DEFAULT 'LIVRE';

-- AlterTable
ALTER TABLE "Ticket" DROP COLUMN "prioridade",
ADD COLUMN     "prioridade" "PrioridadeTicket" NOT NULL DEFAULT 'MEDIA',
DROP COLUMN "status",
ADD COLUMN     "status" "StatusTicket" NOT NULL DEFAULT 'ENVIADO';

-- AlterTable
ALTER TABLE "Triagem" DROP COLUMN "temperatura",
ADD COLUMN     "temperatura" DOUBLE PRECISION,
DROP COLUMN "frequenciaC",
ADD COLUMN     "frequenciaC" INTEGER,
DROP COLUMN "frequenciaR",
ADD COLUMN     "frequenciaR" INTEGER,
DROP COLUMN "saturacao",
ADD COLUMN     "saturacao" INTEGER,
DROP COLUMN "glicemia",
ADD COLUMN     "glicemia" INTEGER,
DROP COLUMN "peso",
ADD COLUMN     "peso" DOUBLE PRECISION,
DROP COLUMN "altura",
ADD COLUMN     "altura" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "cargo",
ADD COLUMN     "cargo" "CargoUsuario" NOT NULL DEFAULT 'ENFERMEIRO_ASSISTENCIAL';

-- AlterTable
ALTER TABLE "UtiLeito" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "TipoLeito" NOT NULL DEFAULT 'ADULTO',
DROP COLUMN "status",
ADD COLUMN     "status" "StatusOcupacao" NOT NULL DEFAULT 'LIVRE';

-- CreateIndex
CREATE INDEX "Agendamento_dataHora_idx" ON "Agendamento"("dataHora");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cpf_hospitalId_key" ON "Paciente"("cpf", "hospitalId");
