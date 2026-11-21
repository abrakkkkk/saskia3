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
    // Item 10: cirurgias para o checklist de cirurgia segura (A responde; B é sigilosa para o A).
    await prisma.cirurgia.createMany({
      data: [
        { id: 'e2e-cir-a', hospitalId: HOSPITAL_A.id, pacienteId: 'e2e-patient-a1', procedimento: 'Colecistectomia videolaparoscópica', sala: 'Sala Alfa 1', dataHora: new Date(), status: 'AGENDADA' },
        { id: 'e2e-cir-b', hospitalId: HOSPITAL_B.id, pacienteId: 'audit-patient-b', procedimento: 'Cirurgia sigilosa Beta', sala: 'Sala Beta 1', dataHora: new Date(), status: 'AGENDADA' },
      ],
    });
    await prisma.receita.create({
      data: { id: 'e2e-receita-b', pacienteId: 'audit-patient-b', hospitalId: HOSPITAL_B.id, medicamentos: [{ conteudo: 'Receita sigilosa Beta' }], profissional: 'Dr. Médico Beta' },
    });

    // Faturamento (item 7): catálogo global mínimo, dados SUS/convênio do A e uma conta sigilosa do B.
    await prisma.procedimentoTabela.createMany({
      data: [
        { tabela: '22', codigo: '10101012', descricao: 'Consulta em consultório (no horário normal ou preestabelecido)', versao: '202609', busca: '10101012 consulta em consultorio' },
        { tabela: '18', codigo: '60000589', descricao: 'Taxa de sala de observação', versao: '202609', busca: '60000589 taxa de sala de observacao' },
        { tabela: '38', codigo: '1801', descricao: 'Procedimento inválido', versao: '202609', busca: '1801 procedimento invalido' },
        { tabela: 'SIGTAP', codigo: '0301010072', descricao: 'CONSULTA MEDICA EM ATENÇÃO ESPECIALIZADA', versao: '202611', valorSa: '10.00', valorSh: '0.00', valorSp: '0.00', instrumentos: ['01', '02'], busca: '0301010072 consulta medica em atencao especializada' },
      ],
    });
    await prisma.configFaturamento.create({
      data: { hospitalId: HOSPITAL_A.id, cnes: '1234567', municipioIbge: '355030', uf: 'SP', orgaoDestinoNome: 'Secretaria Municipal de Saúde', orgaoEmissorAih: 'M355030001' },
    });
    await prisma.operadoraPlano.createMany({
      data: [
        { id: 'e2e-conv-a', hospitalId: HOSPITAL_A.id, nome: 'Convênio Teste Alfa', codigoAns: '123456', vigencia: '', teto: '', status: 'ATIVO' },
        { id: 'e2e-conv-b', hospitalId: HOSPITAL_B.id, nome: 'Convênio Sigiloso Beta', codigoAns: '654321', vigencia: '', teto: '', status: 'ATIVO' },
      ],
    });
    await prisma.contaFaturamento.create({
      data: {
        id: 'e2e-conta-b', hospitalId: HOSPITAL_B.id, numero: 1, pacienteId: 'audit-patient-b', fonte: 'CONVENIO', tipoGuia: 'CONSULTA', competencia: '202611',
        dataAtendimento: new Date('2026-11-10T12:00:00Z'), operadoraId: 'e2e-conv-b', numeroCarteira: 'BETA-SIGILO',
        itens: { create: { id: 'e2e-item-b', hospitalId: HOSPITAL_B.id, tabela: '22', codigo: '10101012', descricao: 'Consulta sigilosa Beta', quantidade: '1', valorUnitario: '100.00', valorTotal: '100.00', dataExecucao: new Date('2026-11-10T12:00:00Z') } },
      },
    });
  } finally {
    await prisma.$disconnect();
    await pool.end().catch(() => {});
  }
}
