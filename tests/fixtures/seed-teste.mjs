// Popula o banco de TESTE local com 2 hospitais fictícios. Apaga tudo antes: só roda em banco local de teste.
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { CODIGOS, HOSPITAL_A, HOSPITAL_B, PACIENTES, USUARIOS } from './dados-teste.mjs';

/** Recusa qualquer banco que não seja local e com "teste" no nome. Protege a produção (Neon). */
export function exigirBancoDeTeste(url) {
  let alvo;
  try { alvo = new URL(url ?? ''); } catch { throw new Error('DATABASE_URL_TESTE ausente ou inválida (veja tests/banco-teste.mjs).'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(alvo.hostname);
  if (!local || !alvo.pathname.includes('teste')) {
    throw new Error(`Recusado: ${alvo.hostname}${alvo.pathname} não é um banco local de teste.`);
  }
  return url;
}

export async function semearBancoDeTeste(url) {
  exigirBancoDeTeste(url);
  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const tabelas = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (tabelas.length) {
      await prisma.$executeRawUnsafe(`TRUNCATE ${tabelas.map(t => `"public"."${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
    }

    await prisma.hospital.createMany({ data: [HOSPITAL_A, HOSPITAL_B] });
    const temCodigo = await prisma.$queryRaw`SELECT 1 FROM information_schema.columns WHERE table_name = 'Hospital' AND column_name = 'codigo'`;
    if (temCodigo.length) {
      for (const [id, codigo] of Object.entries(CODIGOS)) await prisma.$executeRaw`UPDATE "Hospital" SET "codigo" = ${codigo} WHERE "id" = ${id}`;
    }
    const hashes = new Map();
    for (const senha of new Set(USUARIOS.map(u => u.senha))) hashes.set(senha, await bcrypt.hash(senha, 10));
    await prisma.usuario.createMany({ data: USUARIOS.map(u => ({ ...u, senha: hashes.get(u.senha) })) });
    await prisma.paciente.createMany({ data: PACIENTES });

    // Recursos do Hospital B que o teste de isolamento tenta alterar a partir do Hospital A.
    await prisma.sala.create({ data: { id: 'audit-room-b', hospitalId: HOSPITAL_B.id, nome: 'Sala Beta 1', status: 'RESERVADO' } });
    await prisma.reservaSala.create({
      data: { id: 'audit-reservation-b', salaId: 'audit-room-b', hospitalId: HOSPITAL_B.id, profissional: 'Dr. Médico Beta', data: '2026-12-01', horaInicio: '08:00', horaFim: '09:00', status: 'ATIVA' },
    });
    await prisma.transportePaciente.create({
      data: { id: 'audit-transport-b', hospitalId: HOSPITAL_B.id, paciente: 'Paciente Beta Sigiloso', origem: 'PS', destino: 'UTI', tipo: 'Maca', solicitante: 'Dr. Médico Beta', data: '2026-12-01', status: 'Pendente' },
    });

    await prisma.utiLeito.createMany({
      data: [
        { id: 'e2e-uti-a1', hospitalId: HOSPITAL_A.id, numero: 1, tipo: 'ADULTO', status: 'LIVRE' },
        { id: 'e2e-uti-b1', hospitalId: HOSPITAL_B.id, numero: 91, tipo: 'ADULTO', status: 'LIVRE' },
      ],
    });
    // Internação aberta do Hospital B (item 9): o Hospital A não pode ler, trocar leito nem dar alta.
    await prisma.internacao.create({
      data: {
        id: 'e2e-intern-b', hospitalId: HOSPITAL_B.id, pacienteId: 'e2e-patient-b2', setor: 'Enfermaria', leito: '7', motivo: 'Internação sigilosa Beta',
        movimentacoes: { create: { id: 'e2e-mov-b', hospitalId: HOSPITAL_B.id, setor: 'Enfermaria', leito: '7', motivo: 'Entrada' } },
      },
    });
    await prisma.receita.create({
      data: { id: 'e2e-receita-b', pacienteId: 'audit-patient-b', hospitalId: HOSPITAL_B.id, medicamentos: [{ conteudo: 'Receita sigilosa Beta' }], profissional: 'Dr. Médico Beta' },
    });
  } finally {
    await prisma.$disconnect();
    await pool.end().catch(() => {});
  }
}
