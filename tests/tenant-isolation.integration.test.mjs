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
