import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { exigirBancoDeTeste } from './fixtures/seed-teste.mjs';
import { SENHA_E2E } from './fixtures/dados-teste.mjs';

// Item 7 (faturamento) contra o banco de TESTE: isolamento entre hospitais e fluxo completo
// conta -> item -> fechar -> lote (XML TISS validado no XSD) -> envio -> glosa/retorno; e BPA por competência.
// Rodar com `npm run test:validacao` (sobe o servidor e popula o banco de teste). Nunca contra a produção.
const baseUrl = process.env.AUDIT_BASE_URL;
const databaseUrl = process.env.DATABASE_URL_TESTE ? exigirBancoDeTeste(process.env.DATABASE_URL_TESTE) : undefined;
const pular = !baseUrl || !databaseUrl;
const cookies = new Map();
let prisma;

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

before(async () => {
  if (pular) return;
  prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })) });
  // Reexecutável: limpa o que o teste cria no Hospital A e completa os dados que o SUS exige do paciente.
  await prisma.contaFaturamento.deleteMany({ where: { hospitalId: 'audit-hospital-a' } });
  await prisma.loteFaturamento.deleteMany({ where: { hospitalId: 'audit-hospital-a' } });
  await prisma.paciente.update({ where: { id: 'e2e-patient-a1' }, data: { nascimento: new Date('1980-05-10T12:00:00Z'), sexo: 'Feminino', cpf: null } });

  const { csrfToken } = await (await request('/api/auth/csrf')).json();
  const login = await request('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken, email: 'faturamento.alfa@example.test', senha: SENHA_E2E, hospitalId: 'audit-hospital-a', callbackUrl: baseUrl, json: 'true' }),
  });
  assert.ok(login.status < 400, 'login do faturista deve autenticar');
  const sessao = await (await request('/api/auth/session')).json();
  assert.equal(sessao.user?.cargo, 'FATURISTA');
});

after(async () => { await prisma?.$disconnect(); });

test('faturamento: hospital A não lê nem altera conta, item, convênio ou lote do hospital B', { skip: pular }, async () => {
  const lista = await (await json('GET', '/api/faturamento/contas')).json();
  assert.ok(Array.isArray(lista) && !lista.some(c => c.id === 'e2e-conta-b'), 'lista não pode trazer conta do B');
  const convenios = await (await json('GET', '/api/faturamento/convenios')).json();
  assert.ok(!convenios.some(c => c.id === 'e2e-conv-b'), 'lista não pode trazer convênio do B');

  assert.equal((await json('GET', '/api/faturamento/contas/e2e-conta-b')).status, 404);
  assert.ok([404, 409].includes((await json('PUT', '/api/faturamento/contas/e2e-conta-b', { numeroCarteira: 'INVADIDO' })).status));
  assert.equal((await json('PATCH', '/api/faturamento/contas/e2e-conta-b', { acao: 'cancelar' })).status, 404);
  assert.equal((await json('POST', '/api/faturamento/contas/e2e-conta-b/itens', { tabela: '22', codigo: '10101012', quantidade: 1, valorUnitario: 1 })).status, 404);
  assert.equal((await json('DELETE', '/api/faturamento/contas/e2e-conta-b/itens/e2e-item-b')).status, 404);
  assert.equal((await json('POST', '/api/faturamento/contas', { pacienteId: 'audit-patient-b', fonte: 'SUS', tipoGuia: 'BPA_C' })).status, 404, 'paciente do B');
  assert.equal((await json('POST', '/api/faturamento/contas', { pacienteId: 'e2e-patient-a1', fonte: 'CONVENIO', tipoGuia: 'CONSULTA', operadoraId: 'e2e-conv-b' })).status, 404, 'convênio do B');
  assert.equal((await json('POST', '/api/faturamento/lotes', { tipo: 'TISS', operadoraId: 'e2e-conv-b', tipoGuia: 'CONSULTA' })).status, 404);
  // Configurar convênio e dados da unidade é do gestor: o faturista recebe 403.
  assert.equal((await json('PUT', '/api/faturamento/convenios/e2e-conv-b', { nome: 'X' })).status, 403);
  assert.equal((await json('PUT', '/api/faturamento/config', { cnes: '7654321' })).status, 403);

  const contaB = await prisma.contaFaturamento.findUnique({ where: { id: 'e2e-conta-b' }, include: { itens: true } });
  assert.equal(contaB.numeroCarteira, 'BETA-SIGILO');
  assert.equal(contaB.status, 'ABERTA');
  assert.equal(contaB.itens.length, 1);
  assert.equal((await prisma.operadoraPlano.findUnique({ where: { id: 'e2e-conv-b' } })).nome, 'Convênio Sigiloso Beta');
});

test('faturamento TISS: conta de consulta vira lote XML válido no XSD 4.03.00, com envio e glosa', { skip: pular }, async () => {
  const criada = await json('POST', '/api/faturamento/contas', {
    pacienteId: 'e2e-patient-a1', fonte: 'CONVENIO', tipoGuia: 'CONSULTA', operadoraId: 'e2e-conv-a', numeroCarteira: '0001234567',
    profissionalNome: 'Dr. Médico Alfa', conselho: '06', numeroConselho: '000001', ufConselho: 'SP', cbo: '225125', dataAtendimento: '2026-11-10',
  });
  assert.equal(criada.status, 201, await criada.clone().text());
  const { id } = await criada.json();

  assert.equal((await json('PATCH', `/api/faturamento/contas/${id}`, { acao: 'fechar' })).status, 422, 'sem item não fecha');
  assert.equal((await json('POST', `/api/faturamento/contas/${id}/itens`, { tabela: '22', codigo: '99999999', quantidade: 1, valorUnitario: 10 })).status, 400, 'código fora da TUSS');
  const item = await json('POST', `/api/faturamento/contas/${id}/itens`, { tabela: '22', codigo: '10101012', quantidade: 1, valorUnitario: 150 });
  assert.equal(item.status, 201, await item.clone().text());
  const itemId = (await item.json()).id;
  assert.equal((await json('PATCH', `/api/faturamento/contas/${id}`, { acao: 'fechar' })).status, 200);
  assert.equal((await json('POST', `/api/faturamento/contas/${id}/itens`, { tabela: '22', codigo: '10101012', quantidade: 1, valorUnitario: 1 })).status, 409, 'conta fechada não aceita item');

  const lote = await json('POST', '/api/faturamento/lotes', { tipo: 'TISS', operadoraId: 'e2e-conv-a', tipoGuia: 'CONSULTA' });
  assert.equal(lote.status, 201, await lote.clone().text());
  const loteJson = await lote.json();
  assert.equal(loteJson.quantidadeContas, 1);

  const arquivo = await request(`/api/faturamento/lotes/${loteJson.id}?download=1`);
  assert.equal(arquivo.status, 200);
  assert.match(arquivo.headers.get('content-disposition') ?? '', new RegExp(`${loteJson.hash}\\.xml`));
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const python = ['python', 'python3', 'py'].find(cmd => spawnSync(cmd, ['-c', 'import lxml'], { stdio: 'ignore' }).status === 0);
  if (python) {
    const pasta = mkdtempSync(join(tmpdir(), 'saskia-lote-'));
    writeFileSync(join(pasta, 'lote.xml'), bytes);
    const r = spawnSync(python, ['-P', fileURLToPath(new URL('./fixtures/validar-xsd.py', import.meta.url)),
      fileURLToPath(new URL('./fixtures/tiss-4.03.00/tissV4_03_00.xsd', import.meta.url)), join(pasta, 'lote.xml')], { encoding: 'utf8' });
    assert.equal(r.status, 0, `XML do lote fora do XSD: ${r.stdout}${r.stderr}`);
  }
  assert.equal((await prisma.contaFaturamento.findUnique({ where: { id } })).status, 'EM_LOTE');

  assert.equal((await json('PATCH', `/api/faturamento/lotes/${loteJson.id}`, { acao: 'enviar', protocolo: 'PROT-1' })).status, 200);
  assert.equal((await prisma.contaFaturamento.findUnique({ where: { id } })).status, 'ENVIADA');
  assert.equal((await json('PATCH', `/api/faturamento/lotes/${loteJson.id}`, { acao: 'cancelar' })).status, 409, 'lote enviado não cancela');

  assert.equal((await json('PATCH', `/api/faturamento/contas/${id}/itens/${itemId}`, { valorGlosado: 50, motivoGlosa: '1801' })).status, 200);
  assert.equal((await json('PATCH', `/api/faturamento/contas/${id}`, { acao: 'retorno', valorPago: 100 })).status, 200);
  const final = await prisma.contaFaturamento.findUnique({ where: { id } });
  assert.equal(final.status, 'GLOSADA');
  assert.equal(Number(final.valorGlosado), 50);
  assert.equal(Number(final.valorPago), 100);
});

test('faturamento SUS: BPA individualizado com valor SIGTAP sugerido gera arquivo no layout', { skip: pular }, async () => {
  const criada = await json('POST', '/api/faturamento/contas', {
    pacienteId: 'e2e-patient-a1', fonte: 'SUS', tipoGuia: 'BPA_I', dataAtendimento: '2026-11-12', competencia: '202611',
    cbo: '225125', cnsProfissional: '123456789012345', cnsPaciente: '898001234567890', racaCor: '03', municipioIbgePaciente: '355030', cid: 'J18.9',
  });
  assert.equal(criada.status, 201, await criada.clone().text());
  const { id } = await criada.json();
  assert.equal((await json('POST', `/api/faturamento/contas/${id}/itens`, { tabela: '22', codigo: '10101012', quantidade: 1, valorUnitario: 1 })).status, 400, 'SUS só aceita SIGTAP');
  const item = await json('POST', `/api/faturamento/contas/${id}/itens`, { tabela: 'SIGTAP', codigo: '0301010072', quantidade: 1 });
  assert.equal(item.status, 201, await item.clone().text());
  assert.equal(Number((await item.json()).valorUnitario), 10, 'valor SA da SIGTAP sugerido');
  assert.equal((await json('PATCH', `/api/faturamento/contas/${id}`, { acao: 'fechar' })).status, 200);

  const lote = await json('POST', '/api/faturamento/lotes', { tipo: 'BPA', competencia: '202611' });
  assert.equal(lote.status, 201, await lote.clone().text());
  const texto = await (await request(`/api/faturamento/lotes/${(await lote.json()).id}?download=1`)).text();
  const [cab, linha] = texto.split('\r\n');
  assert.equal(cab.slice(0, 13), '01#BPA#202611');
  assert.equal(linha.length, 351);
  assert.equal(linha.slice(0, 2), '03');
  assert.equal(linha.slice(49, 59), '0301010072');
});
