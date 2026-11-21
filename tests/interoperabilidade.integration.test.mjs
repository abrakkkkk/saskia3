import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { register } from 'tsx/esm/api';

import { exigirBancoDeTeste } from './fixtures/seed-teste.mjs';
import { SENHA_E2E } from './fixtures/dados-teste.mjs';

// Item 8 (CNES/RNDS) contra o banco de TESTE: registro de dose -> fila -> validação no perfil oficial (simulação),
// REL de exame liberado, configuração sem certificado e isolamento entre hospitais.
// Rodar com `npm run test:validacao` (sobe o servidor e popula o banco de teste). Nunca contra a produção.
register();
const { totpAtual, cifrarSegredo } = await import('../src/lib/mfa.ts');

const baseUrl = process.env.AUDIT_BASE_URL;
const databaseUrl = process.env.DATABASE_URL_TESTE ? exigirBancoDeTeste(process.env.DATABASE_URL_TESTE) : undefined;
const pular = !baseUrl || !databaseUrl || !process.env.AUTH_SECRET;
let prisma;

// CNS válidos gerados pela regra oficial (definitivo, a partir de um PIS fictício).
function cnsDefinitivo(pis) {
  let soma = 0;
  for (let i = 0; i < 11; i++) soma += Number(pis[i]) * (15 - i);
  let dv = 11 - (soma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) { soma += 2; dv = 11 - (soma % 11); return `${pis}001${dv}`; }
  return `${pis}000${dv}`;
}
const CNS_PACIENTE = cnsDefinitivo('20000000001');
const CNS_ENFERMEIRA = cnsDefinitivo('12345678901');
const SEGREDO_MFA = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

function sessao() {
  const cookies = new Map();
  async function request(path, options = {}) {
    const headers = new Headers(options.headers);
    if (cookies.size) headers.set('cookie', [...cookies].map(([k, v]) => `${k}=${v}`).join('; '));
    const resposta = await fetch(new URL(path, baseUrl), { ...options, headers, redirect: 'manual' });
    for (const bruto of resposta.headers.getSetCookie()) {
      const [par] = bruto.split(';', 1);
      const i = par.indexOf('=');
      if (i > 0) { const v = par.slice(i + 1); if (v) cookies.set(par.slice(0, i), v); else cookies.delete(par.slice(0, i)); }
    }
    return resposta;
  }
  const json = (metodo, path, body) => request(path, {
    method: metodo, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  async function entrar(email, extra = {}) {
    const { csrfToken } = await (await request('/api/auth/csrf')).json();
    const r = await request('/api/auth/callback/credentials', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, email, senha: SENHA_E2E, hospitalId: 'audit-hospital-a', callbackUrl: baseUrl, json: 'true', ...extra }),
    });
    assert.ok(r.status < 400, `login de ${email}`);
    return (await (await request('/api/auth/session')).json()).user;
  }
  return { request, json, entrar };
}
const enfermeira = sessao();
const admin = sessao();

before(async () => {
  if (pular) return;
  prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })) });
  // Reexecutável: limpa o que o teste cria e prepara identificação SUS, unidade e um ADMIN com MFA.
  await prisma.envioRnds.deleteMany({ where: { hospitalId: { in: ['audit-hospital-a', 'audit-hospital-b'] } } });
  await prisma.vacinaAplicada.deleteMany({ where: { hospitalId: { in: ['audit-hospital-a', 'audit-hospital-b'] } } });
  await prisma.integracaoRnds.deleteMany({ where: { hospitalId: 'audit-hospital-a' } });
  await prisma.paciente.update({ where: { id: 'e2e-patient-a1' }, data: { cns: CNS_PACIENTE } });
  await prisma.usuario.update({ where: { id: 'e2e-enf-a' }, data: { cns: CNS_ENFERMEIRA, cbo: '223505' } });
  await prisma.configFaturamento.upsert({ where: { hospitalId: 'audit-hospital-a' }, create: { hospitalId: 'audit-hospital-a', cnes: '1234567', uf: 'SP' }, update: { cnes: '1234567', uf: 'SP' } });
  await prisma.usuario.upsert({
    where: { id: 'e2e-admin-int-a' },
    create: {
      id: 'e2e-admin-int-a', hospitalId: 'audit-hospital-a', nome: 'Gestor Integração Alfa', email: 'gestor.integracao@example.test', cargo: 'ADMIN',
      senha: await bcrypt.hash(SENHA_E2E, 10), mfaAtivo: true, mfaSegredo: cifrarSegredo(SEGREDO_MFA),
    },
    update: { mfaAtivo: true, mfaSegredo: cifrarSegredo(SEGREDO_MFA), mfaUltimoPasso: null, ativo: true },
  });
  // Dado do hospital B que o A nunca pode ver nem processar.
  const vacinaB = await prisma.vacinaAplicada.create({
    data: {
      hospitalId: 'audit-hospital-b', pacienteId: 'audit-patient-b', imunobiologico: '87', fabricante: '141', lote: 'BETA', dose: '1', via: '10885',
      localAplicacao: '1', aplicadaEm: new Date('2026-11-01T12:00:00Z'), profissionalNome: 'Beta',
    },
  });
  await prisma.envioRnds.create({ data: { hospitalId: 'audit-hospital-b', tipo: 'RIA_R', origemId: vacinaB.id, identificadorLocal: 'e2e-envio-b' } });
  await prisma.exame.upsert({
    where: { id: 'e2e-exame-rel-a' },
    create: { id: 'e2e-exame-rel-a', hospitalId: 'audit-hospital-a', pacienteId: 'e2e-patient-a1', tipo: 'Laboratório', nome: 'SARS-CoV-2 RT-PCR', status: 'CONCLUIDO', resultado: 'Não detectável', liberadoEm: new Date('2026-11-20T15:00:00Z') },
    update: { liberadoEm: new Date('2026-11-20T15:00:00Z') },
  });
  await prisma.exame.upsert({
    where: { id: 'e2e-exame-pendente-a' },
    create: { id: 'e2e-exame-pendente-a', hospitalId: 'audit-hospital-a', pacienteId: 'e2e-patient-a1', tipo: 'Laboratório', nome: 'Hemograma', status: 'COLETADO' },
    update: { liberadoEm: null },
  });

  assert.equal((await enfermeira.entrar('enfermagem.alfa@example.test')).cargo, 'ENFERMEIRO_ASSISTENCIAL');
  assert.equal((await admin.entrar('gestor.integracao@example.test', { otp: totpAtual(SEGREDO_MFA) })).cargo, 'ADMIN');
});

after(async () => { await prisma?.$disconnect(); });

const dose = {
  pacienteId: 'e2e-patient-a1', imunobiologico: '87', fabricante: '141', lote: 'FX1234', validade: '2027-03-31', dose: '1', estrategia: '1',
  via: '10885', localAplicacao: '1', aplicadaEm: '2026-11-20T13:30:00Z',
};

test('vacina: enfermagem registra dose com tabelas oficiais; códigos fora da tabela e paciente de outro hospital recusados', { skip: pular }, async () => {
  const tabelas = await (await enfermeira.json('GET', '/api/vacinas/tabelas')).json();
  assert.ok(tabelas.imunobiologico.some(o => o.codigo === '87') && tabelas.dose.length > 5);
  assert.equal((await enfermeira.json('POST', '/api/vacinas', { ...dose, imunobiologico: '99999' })).status, 400);
  assert.equal((await enfermeira.json('POST', '/api/vacinas', { ...dose, aplicadaEm: '2099-01-01' })).status, 400);
  assert.equal((await enfermeira.json('POST', '/api/vacinas', { ...dose, pacienteId: 'audit-patient-b' })).status, 404, 'paciente do B');
  const criada = await enfermeira.json('POST', '/api/vacinas', dose);
  assert.equal(criada.status, 201, await criada.clone().text());
  const vacina = await criada.json();
  assert.equal(vacina.statusRnds, 'PENDENTE', 'dose entra na fila automaticamente');
  const lista = await (await enfermeira.json('GET', '/api/vacinas?pacienteId=e2e-patient-a1')).json();
  assert.ok(lista.some(v => v.id === vacina.id));
  assert.deepEqual(await (await enfermeira.json('GET', '/api/vacinas?pacienteId=audit-patient-b')).json(), [], 'não lista doses do B');
  // A integração é só do gestor.
  assert.equal((await enfermeira.json('GET', '/api/integracoes/rnds')).status, 403);
  assert.equal((await enfermeira.json('POST', '/api/integracoes/rnds/fila', { acao: 'processar' })).status, 403);
});

test('RNDS: simulação valida no perfil oficial; fila isolada por hospital; sem certificado não envia', { skip: pular }, async () => {
  let estado = await (await admin.json('GET', '/api/integracoes/rnds')).json();
  assert.equal(estado.ambiente, 'SIMULACAO');
  assert.ok(estado.pendencias.some(p => /solicitante/i.test(p)));
  assert.deepEqual(estado.variaveisCertificado, ['RNDS_CERT_PFX_1234567', 'RNDS_CERT_SENHA_1234567']);
  assert.equal((await admin.json('PUT', '/api/integracoes/rnds', { cnsRequisitante: '123' })).status, 400);
  assert.equal((await admin.json('PUT', '/api/integracoes/rnds', { identificadorSolicitante: '9999', cnsRequisitante: CNS_ENFERMEIRA })).status, 200);

  const processado = await (await admin.json('POST', '/api/integracoes/rnds/fila', { acao: 'processar' })).json();
  assert.equal(processado.resumo.SIMULADO, 1, JSON.stringify(processado));
  const fila = await (await admin.json('GET', '/api/integracoes/rnds/fila')).json();
  assert.equal(fila.length, 1, 'fila não traz itens do hospital B');
  assert.equal(fila[0].status, 'SIMULADO');
  assert.equal(fila[0].paciente, 'Paciente Alfa Triagem');

  const previa = await (await admin.json('GET', `/api/integracoes/rnds/fila/${fila[0].id}`)).json();
  assert.deepEqual(previa.problemas, []);
  assert.equal(previa.documento.identifier.system, 'http://www.saude.gov.br/fhir/r4/NamingSystem/BRRNDS-9999');
  assert.equal(previa.documento.entry[1].resource.patient.identifier.value, CNS_PACIENTE);

  const itemB = await prisma.envioRnds.findUnique({ where: { identificadorLocal: 'e2e-envio-b' } });
  assert.equal((await admin.json('POST', `/api/integracoes/rnds/fila/${itemB.id}`, { acao: 'enviar' })).status, 404);
  assert.equal((await admin.json('GET', `/api/integracoes/rnds/fila/${itemB.id}`)).status, 404);
  assert.equal((await prisma.envioRnds.findUnique({ where: { id: itemB.id } })).status, 'PENDENTE', 'item do B intocado');

  // Homologação sem certificado: o item vai para ERRO com a pendência, sem tentar a rede.
  assert.equal((await admin.json('PUT', '/api/integracoes/rnds', { ambiente: 'HOMOLOGACAO' })).status, 200);
  estado = await (await admin.json('GET', '/api/integracoes/rnds')).json();
  assert.ok(estado.pendencias.some(p => /certificado/i.test(p)));
  assert.equal(estado.endereco.ehr, 'ehr-services.hmg.saude.gov.br');
  const enviado = await (await admin.json('POST', `/api/integracoes/rnds/fila/${fila[0].id}`, { acao: 'enviar' })).json();
  assert.equal(enviado.status, 'ERRO');
  assert.match(enviado.erro, /Certificado/);
  assert.ok(!enviado.erro.includes(CNS_PACIENTE));
  assert.equal((await admin.json('PUT', '/api/integracoes/rnds', { ambiente: 'SIMULACAO' })).status, 200);
});

test('RNDS: exame liberado vai para a fila com códigos oficiais (REL) e passa na simulação', { skip: pular }, async () => {
  const codigos = {
    codigoExame: '94309-2', categoria: '0202', resultado: '2', amostra: 'SWNAFA', suspeita: 'B342',
    metodo: 'RT-PCR em tempo real', valorReferencia: 'Não detectável', coletadoEm: '2026-11-19T09:00:00Z',
  };
  assert.equal((await admin.json('POST', '/api/integracoes/rnds/fila', { acao: 'enfileirar-exame', exameId: 'e2e-exame-pendente-a', ...codigos })).status, 409);
  assert.equal((await admin.json('POST', '/api/integracoes/rnds/fila', { acao: 'enfileirar-exame', exameId: 'e2e-exame-rel-a', ...codigos, codigoExame: '2345-7' })).status, 400);
  const r = await admin.json('POST', '/api/integracoes/rnds/fila', { acao: 'enfileirar-exame', exameId: 'e2e-exame-rel-a', ...codigos });
  assert.equal(r.status, 201, await r.clone().text());
  const { id } = await r.json();
  const enviado = await (await admin.json('POST', `/api/integracoes/rnds/fila/${id}`, { acao: 'enviar' })).json();
  assert.equal(enviado.status, 'SIMULADO', JSON.stringify(enviado));
});

test('CNES: conferência da equipe aponta CNS ausente e confere quem tem CNS válido', { skip: pular }, async () => {
  const r = await (await admin.json('GET', '/api/integracoes/cnes')).json();
  assert.equal(r.unidade.cnes, '1234567');
  const enf = r.profissionais.find(p => p.id === 'e2e-enf-a');
  assert.equal(enf.situacao, 'CONFERE');
  assert.ok(r.profissionais.some(p => p.situacao === 'SEM_CNS'));
  assert.ok(!r.profissionais.some(p => p.id === 'e2e-med-b'), 'não lista profissionais do B');
  assert.equal((await enfermeira.json('GET', '/api/integracoes/cnes')).status, 403);
});
