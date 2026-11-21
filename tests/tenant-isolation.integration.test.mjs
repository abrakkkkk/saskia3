import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { exigirBancoDeTeste } from './fixtures/seed-teste.mjs';
import { SENHA_AUDIT } from './fixtures/dados-teste.mjs';

// Rodar com `npm run test:validacao` (sobe o servidor e popula o banco de TESTE). Nunca contra a produção.
const baseUrl = process.env.AUDIT_BASE_URL;
const databaseUrl = process.env.DATABASE_URL_TESTE ? exigirBancoDeTeste(process.env.DATABASE_URL_TESTE) : undefined;
const cookieJar = new Map();
let prisma;

function updateCookies(response) {
  for (const raw of response.headers.getSetCookie()) {
    const [cookie] = raw.split(';', 1);
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;
    const name = cookie.slice(0, separator);
    const value = cookie.slice(separator + 1);
    if (!value) cookieJar.delete(name);
    else cookieJar.set(name, value);
  }
}

function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (cookieJar.size) {
    headers.set('cookie', [...cookieJar].map(([name, value]) => `${name}=${value}`).join('; '));
  }
  return fetch(new URL(path, baseUrl), { ...options, headers, redirect: 'manual' }).then((response) => {
    updateCookies(response);
    return response;
  });
}

before(async () => {
  if (!baseUrl || !databaseUrl) return;
  prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })) });
  await prisma.usuario.update({ where: { email: 'audit.admin@example.test' }, data: { cargo: 'ENFERMEIRO_ASSISTENCIAL' } });
  await prisma.sala.update({ where: { id: 'audit-room-b' }, data: { status: 'RESERVADO' } });
  await prisma.reservaSala.update({ where: { id: 'audit-reservation-b' }, data: { status: 'ATIVA' } });
  await prisma.transportePaciente.update({ where: { id: 'audit-transport-b' }, data: { status: 'Pendente' } });
  await prisma.avaliacaoMedica.deleteMany({ where: { pacienteId: 'audit-patient-b' } });
  await prisma.escoreClinico.deleteMany({ where: { pacienteId: 'audit-patient-b' } });
  await prisma.exame.deleteMany({ where: { pacienteId: 'audit-patient-b' } });
  await prisma.internacao.deleteMany({ where: { pacienteId: 'audit-patient-b' } });
  await prisma.checklistCirurgicoEtapa.deleteMany({ where: { cirurgiaId: { in: ['e2e-cir-a', 'e2e-cir-b'] } } });
  await prisma.validacaoModeloClinico.deleteMany({ where: { hospitalId: { in: ['audit-hospital-a', 'audit-hospital-b'] } } });

  const csrfResponse = await request('/api/auth/csrf');
  assert.equal(csrfResponse.status, 200, 'Auth.js deve fornecer o CSRF para o login sintético');
  const { csrfToken } = await csrfResponse.json();
  const loginResponse = await request('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      csrfToken,
      email: 'audit.admin@example.test',
      senha: SENHA_AUDIT,
      hospitalId: 'audit-hospital-a',
      callbackUrl: baseUrl,
      json: 'true',
    }),
  });
  assert.ok(loginResponse.status >= 200 && loginResponse.status < 400, 'Login sintético deve autenticar');
  const sessionResponse = await request('/api/auth/session');
  const session = await sessionResponse.json();
  assert.equal(session.user?.hospitalId, 'audit-hospital-a', 'Sessão deve pertencer ao Hospital A');
});

after(async () => {
  await prisma?.$disconnect();
});

test('hospital A cannot mutate hospital B resources or create clinical records for its patient', {
  skip: !baseUrl || !databaseUrl,
}, async () => {
  // Cada rota é chamada com um cargo que TEM a permissão (sem MFA obrigatório), para que um 403 não
  // mascare o teste: o único motivo aceitável de recusa é o filtro por hospital (404).
  const requests = [
    ['/api/salas/audit-room-b', { status: 'LIVRE' }, 'ENFERMEIRO_ASSISTENCIAL'],
    ['/api/salas/reservas/audit-reservation-b', { status: 'CANCELADA' }, 'ENFERMEIRO_ASSISTENCIAL'],
    ['/api/transporte/audit-transport-b', { status: 'Concluído' }, 'ENFERMEIRO_ASSISTENCIAL'],
    ['/api/pacientes/audit-patient-b/medico', { diagnostico: 'Registro sintético' }, 'MEDICO'],
    ['/api/pacientes/audit-patient-b/escores', { dor: 4 }, 'ENFERMEIRO_ASSISTENCIAL'],
    ['/api/pacientes/audit-patient-b/exames', { nome: 'Exame sintético' }, 'MEDICO'],
  ];

  for (const [path, body, cargo] of requests) {
    // A sessão relê o cargo do banco a cada requisição.
    await prisma.usuario.update({ where: { email: 'audit.admin@example.test' }, data: { cargo } });
    const response = await request(path, {
      method: path.includes('/pacientes/') ? 'POST' : 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 404, `${path} deve ocultar o registro de outro hospital`);
  }

  await prisma.usuario.update({ where: { email: 'audit.admin@example.test' }, data: { cargo: 'ENFERMEIRO_ASSISTENCIAL' } });
  const reservaCount = await prisma.reservaSala.count({ where: { hospitalId: 'audit-hospital-b' } });
  const salaCrossTenant = await request('/api/salas/reservas', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      salaId: 'audit-room-b',
      profissional: 'Teste de isolamento',
      data: new Date().toISOString().slice(0, 10),
      horaInicio: '00:00',
      horaFim: '23:59',
    }),
  });
  assert.equal(salaCrossTenant.status, 404, 'Hospital A não deve reservar sala do Hospital B');
  assert.equal(await prisma.reservaSala.count({ where: { hospitalId: 'audit-hospital-b' } }), reservaCount);

  assert.equal((await prisma.sala.findUnique({ where: { id: 'audit-room-b' } })).status, 'RESERVADO');
  assert.equal((await prisma.reservaSala.findUnique({ where: { id: 'audit-reservation-b' } })).status, 'ATIVA');
  assert.equal((await prisma.transportePaciente.findUnique({ where: { id: 'audit-transport-b' } })).status, 'Pendente');
  assert.equal(await prisma.avaliacaoMedica.count({ where: { pacienteId: 'audit-patient-b' } }), 0);
  assert.equal(await prisma.escoreClinico.count({ where: { pacienteId: 'audit-patient-b' } }), 0);
  assert.equal(await prisma.exame.count({ where: { pacienteId: 'audit-patient-b' } }), 0);
});

test('internação: hospital A não lê, cria, troca leito nem encerra internação do hospital B', {
  skip: !baseUrl || !databaseUrl,
}, async () => {
  await prisma.usuario.update({ where: { email: 'audit.admin@example.test' }, data: { cargo: 'MEDICO' } });
  const json = (metodo, path, body) => request(path, {
    method: metodo,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  assert.equal((await json('GET', '/api/internacoes?pacienteId=e2e-patient-b2')).status, 404, 'histórico do paciente do B deve dar 404');
  assert.equal((await json('GET', '/api/internacoes/e2e-intern-b')).status, 404, 'internação do B deve dar 404');
  const abertas = await (await json('GET', '/api/internacoes')).json();
  assert.ok(Array.isArray(abertas) && !abertas.some(i => i.id === 'e2e-intern-b'), 'lista de internações abertas não pode trazer o B');

  assert.equal((await json('POST', '/api/internacoes', { pacienteId: 'audit-patient-b', setor: 'Enfermaria', motivo: 'Tentativa sintética' })).status, 404,
    'internar paciente do B deve dar 404');
  assert.equal((await json('POST', '/api/internacoes', { pacienteId: 'e2e-patient-a1', utiLeitoId: 'e2e-uti-b1', motivo: 'Tentativa sintética' })).status, 404,
    'internar no leito de UTI do B deve dar 404');
  assert.equal((await json('PATCH', '/api/internacoes/e2e-intern-b', { acao: 'trocar-leito', setor: 'Enfermaria', leito: '99' })).status, 404,
    'trocar leito da internação do B deve dar 404');
  assert.equal((await json('PATCH', '/api/internacoes/e2e-intern-b', { acao: 'encerrar', tipoSaida: 'ALTA_MEDICA' })).status, 404,
    'dar alta na internação do B deve dar 404');

  const internacaoB = await prisma.internacao.findUnique({ where: { id: 'e2e-intern-b' } });
  assert.equal(internacaoB.saidaEm, null);
  assert.equal(internacaoB.leito, '7');
  assert.equal(await prisma.movimentacaoLeito.count({ where: { internacaoId: 'e2e-intern-b' } }), 1);
  assert.equal(await prisma.internacao.count({ where: { pacienteId: 'audit-patient-b' } }), 0);
  assert.equal(await prisma.internacao.count({ where: { pacienteId: 'e2e-patient-a1' } }), 0, 'leito de UTI do B não pode abrir internação no A');
  assert.equal((await prisma.utiLeito.findUnique({ where: { id: 'e2e-uti-b1' } })).status, 'LIVRE');
  assert.equal((await prisma.paciente.findUnique({ where: { id: 'e2e-patient-b2' } })).status, 'Internado');
  // A internação aberta do B não entra nos contadores do A.
  const stats = await (await json('GET', '/api/dashboard/stats')).json();
  assert.equal(stats.internados, 0, 'painel do A não pode contar internação do B');
});

test('item 10: checklist cirúrgico, evolução de UTI e validação de modelo respeitam o hospital e as regras', {
  skip: !baseUrl || !databaseUrl,
}, async () => {
  const json = (metodo, path, body) => request(path, {
    method: metodo,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  await prisma.usuario.update({ where: { email: 'audit.admin@example.test' }, data: { cargo: 'ENFERMEIRO_ASSISTENCIAL' } });
  const tudoOk = (itens) => Object.fromEntries(itens.map(([id, v]) => [id, v ?? true]));
  const inducao = tudoOk([['identidade'], ['demarcacao', 'sim'], ['seguranca_anestesica'], ['oximetro'], ['alergia', 'nao'], ['via_aerea', 'nao'], ['perda_sanguinea', 'nao']]);

  // Hospital B: nada visível nem gravável.
  assert.equal((await json('GET', '/api/cirurgias/e2e-cir-b/checklist')).status, 404);
  assert.equal((await json('POST', '/api/cirurgias/e2e-cir-b/checklist', { etapa: 'ANTES_INDUCAO', respostas: inducao })).status, 404);
  assert.equal(await prisma.checklistCirurgicoEtapa.count({ where: { cirurgiaId: 'e2e-cir-b' } }), 0);

  // Regras do protocolo no Hospital A: ordem das etapas, item não confirmado e etapa repetida.
  assert.equal((await json('POST', '/api/cirurgias/e2e-cir-a/checklist', { etapa: 'ANTES_INCISAO', respostas: {} })).status, 409, 'Time Out sem Sign In');
  assert.equal((await json('POST', '/api/cirurgias/e2e-cir-a/checklist', { etapa: 'ANTES_INDUCAO', respostas: { ...inducao, oximetro: false } })).status, 422,
    'item não confirmado deve parar a verificação');
  assert.equal((await json('POST', '/api/cirurgias/e2e-cir-a/checklist', { etapa: 'ANTES_INDUCAO', respostas: { ...inducao, alergia: 'sim' } })).status, 422,
    'alergia sem descrição deve ser recusada');
  const incisao = tudoOk([['apresentacao'], ['confirmacao_verbal'], ['revisao_cirurgiao'], ['revisao_anestesia'], ['revisao_enfermagem'], ['antibiotico', 'sim'], ['imagem', 'nao_se_aplica']]);
  assert.equal((await json('POST', '/api/cirurgias/e2e-cir-a/checklist', { etapa: 'ANTES_INCISAO', respostas: incisao })).status, 409, 'Time Out antes do Sign In');
  assert.equal((await json('POST', '/api/cirurgias/e2e-cir-a/checklist', { etapa: 'ANTES_INDUCAO', respostas: inducao })).status, 201);
  assert.equal((await json('POST', '/api/cirurgias/e2e-cir-a/checklist', { etapa: 'ANTES_INDUCAO', respostas: inducao })).status, 409, 'etapa não se repete');
  const etapa = await prisma.checklistCirurgicoEtapa.findFirst({ where: { cirurgiaId: 'e2e-cir-a' } });
  assert.equal(etapa.hospitalId, 'audit-hospital-a');
  assert.equal(etapa.respondidoPorCargo, 'ENFERMEIRO_ASSISTENCIAL');
  await prisma.checklistCirurgicoEtapa.deleteMany({ where: { cirurgiaId: 'e2e-cir-a' } });

  // Evolução de UTI: internação do B dá 404; dado fora da escala é recusado.
  assert.equal((await json('POST', '/api/uti/evolucoes', { internacaoId: 'e2e-intern-b', pas: 120, pad: 80, evolucao: 'Tentativa sintética de evolução' })).status, 404);
  assert.equal((await json('GET', '/api/uti/evolucoes?internacaoId=e2e-intern-b')).status, 404);
  const lista = await (await json('GET', '/api/uti/evolucoes')).json();
  assert.ok(!lista.internacoes.some(i => i.id === 'e2e-intern-b'), 'lista da UTI não pode trazer internação do B');
  assert.equal(lista.modelo.validado, false, 'sem validação o modelo é o padrão');
  assert.equal((await json('POST', '/api/uti/evolucoes', { internacaoId: 'e2e-intern-b', rass: 9, evolucao: 'Tentativa sintética' })).status, 422, 'RASS fora da escala');
  assert.equal(await prisma.evolucaoUti.count({ where: { internacaoId: 'e2e-intern-b' } }), 0);

  // Validação do modelo: só ADMIN, e só no próprio hospital.
  assert.equal((await json('PUT', '/api/modelos-clinicos', { modelo: 'EVOLUCAO_UTI', validado: true })).status, 403, 'enfermagem não valida modelo');
  await prisma.usuario.update({ where: { email: 'audit.admin@example.test' }, data: { cargo: 'ADMIN', mfaAtivo: true } });
  try {
    const r = await json('PUT', '/api/modelos-clinicos', { modelo: 'EVOLUCAO_UTI', validado: true, observacao: 'Comissão de UTI' });
    assert.equal(r.status, 200);
    const v = await prisma.validacaoModeloClinico.findMany();
    assert.equal(v.length, 1);
    assert.equal(v[0].hospitalId, 'audit-hospital-a');
    assert.equal(v[0].validadoPorNome, 'Auditor Alfa');
    assert.equal((await (await json('GET', '/api/uti/evolucoes')).json()).modelo.validado, true);
    assert.equal((await (await json('GET', '/api/cirurgias/e2e-cir-a/checklist')).json()).modelo.validado, false, 'validação é por modelo');
    assert.equal((await json('PUT', '/api/modelos-clinicos', { modelo: 'EVOLUCAO_UTI', validado: false })).status, 200);
    assert.equal(await prisma.validacaoModeloClinico.count(), 0);
  } finally {
    await prisma.usuario.update({ where: { email: 'audit.admin@example.test' }, data: { cargo: 'ENFERMEIRO_ASSISTENCIAL', mfaAtivo: false } });
  }
});
