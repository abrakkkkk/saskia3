// Roteiro Playwright das telas críticas: recepção, triagem, receituário e UTI.
// Cada tela: login pela tela inicial, abrir, fazer a ação principal e conferir que o Hospital A não vê o Hospital B.
// Rodar com `npm run test:validacao` (sobe o servidor contra o banco de TESTE). Imprime só o resultado.
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { exigirBancoDeTeste } from '../fixtures/seed-teste.mjs';
import { CODIGOS, HOSPITAL_A, NOMES_B, SENHA_E2E } from '../fixtures/dados-teste.mjs';

const BASE = process.env.E2E_BASE_URL;
const DB = exigirBancoDeTeste(process.env.DATABASE_URL_TESTE);
if (!BASE) throw new Error('E2E_BASE_URL ausente.');

const TIMEOUT = 60_000;
const pool = new Pool({ connectionString: DB });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const resultados = [];

function conferir(cond, msg) { if (!cond) throw new Error(msg); }

async function semDadosDoB(page, onde) {
  const texto = await page.locator('body').innerText();
  for (const nome of NOMES_B) conferir(!texto.includes(nome), `${onde}: exibiu paciente do Hospital B (${nome})`);
  const opcoes = await page.locator('option').allInnerTexts();
  for (const nome of NOMES_B) conferir(!opcoes.some(o => o.includes(nome)), `${onde}: lista de seleção contém ${nome}`);
}

async function api(page, metodo, caminho, corpo) {
  const r = await page.request.fetch(new URL(caminho, BASE).toString(), {
    method: metodo, data: corpo, headers: corpo ? { 'content-type': 'application/json' } : undefined, failOnStatusCode: false,
  });
  return r.status();
}

async function login(page, email) {
  await page.goto(BASE, { timeout: TIMEOUT });
  await page.locator('#login-email').waitFor();
  // A tela de login pode pedir o código da unidade (versão nova) ou listar os hospitais (versão anterior).
  const codigo = page.locator('input[id*="codigo" i], input[name*="codigo" i]').first();
  const hospital = page.locator('select#hospitalId');
  if (await codigo.count()) {
    await codigo.fill(CODIGOS[HOSPITAL_A.id]);
  } else if (await hospital.count()) {
    await page.locator(`#hospitalId option[value="${HOSPITAL_A.id}"]`).waitFor({ state: 'attached', timeout: TIMEOUT });
    await hospital.selectOption(HOSPITAL_A.id);
  } else {
    throw new Error('tela de login sem campo de unidade (código ou lista de hospitais)');
  }
  await page.locator('#login-email').fill(email);
  await page.locator('#login-senha').fill(SENHA_E2E);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => new URL(url).pathname !== '/', { timeout: TIMEOUT });
}

async function cenario(nome, email, fn) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);
  const dialogos = [];
  page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
  page.dialogos = dialogos;
  const inicio = Date.now();
  try {
    await login(page, email);
    await fn(page);
    resultados.push({ tela: nome, ok: true, ms: Date.now() - inicio });
  } catch (erro) {
    const alertas = await page.locator('[role="alert"]').allInnerTexts().catch(() => []);
    const extra = [...alertas, ...page.dialogos].filter(Boolean).join(' | ').slice(0, 300);
    resultados.push({ tela: nome, ok: false, erro: String(erro?.message ?? erro).split('\n')[0] + (extra ? ` [tela: ${extra}]` : '') + ` [url: ${page.url()}]` });
  } finally {
    await browser.close();
  }
}

await cenario('Recepção (cadastrar paciente)', 'recepcao.alfa@example.test', async page => {
  await page.goto(`${BASE}/recepcao`);
  await page.getByRole('button', { name: 'Novo paciente' }).click();
  const nome = `Paciente E2E Recepção ${Date.now()}`;
  await page.locator('#novo-nome').fill(nome);
  await page.getByRole('button', { name: 'Salvar cadastro' }).click();
  await page.getByText(nome).first().waitFor();
  const criado = await prisma.paciente.findFirst({ where: { nome } });
  conferir(criado?.hospitalId === HOSPITAL_A.id, 'paciente criado fora do Hospital A');
  await semDadosDoB(page, 'Recepção');
  conferir(await api(page, 'GET', '/api/pacientes/audit-patient-b') === 404, 'GET de paciente do B não devolveu 404');
});

await cenario('Triagem (classificação de risco)', 'enfermagem.alfa@example.test', async page => {
  await page.goto(`${BASE}/pacientes/e2e-patient-a1`);
  await page.getByRole('tab', { name: 'Triagem' }).click();
  await page.locator('#tri-classificacao').selectOption('Amarelo');
  await page.locator('#tri-pressao').fill('120/80').catch(() => {});
  await page.getByRole('button', { name: 'Registrar triagem' }).click();
  await page.getByText('Triagem #1').waitFor();
  const t = await prisma.triagem.count({ where: { pacienteId: 'e2e-patient-a1', classificacao: 'Amarelo' } });
  conferir(t === 1, 'triagem não gravada');
  await semDadosDoB(page, 'Triagem');
  await page.goto(`${BASE}/pacientes/audit-patient-b`);
  await page.getByText('Paciente não encontrado').first().waitFor();
  await semDadosDoB(page, 'Ficha do paciente do B');
  conferir(await api(page, 'POST', '/api/pacientes/audit-patient-b/triagens', { classificacao: 'Vermelho' }) === 404, 'triagem em paciente do B não devolveu 404');
  conferir(await prisma.triagem.count({ where: { pacienteId: 'audit-patient-b' } }) === 0, 'triagem gravada no paciente do B');
});

await cenario('Receituário (salvar prescrição)', 'medico.alfa@example.test', async page => {
  await page.goto(`${BASE}/receituario`);
  const select = page.locator('select:has(option:text("Paciente Alfa Triagem"))');
  await select.waitFor({ state: 'attached' });
  await semDadosDoB(page, 'Receituário');
  const valor = await select.locator('option', { hasText: 'Paciente Alfa Triagem' }).getAttribute('value');
  await select.selectOption(valor);
  await page.getByRole('button', { name: 'Nova prescrição' }).click();
  const editor = page.getByRole('textbox', { name: 'Conteúdo da prescrição 1' });
  await editor.click();
  await editor.pressSequentially('Paracetamol 500 mg, 1 comprimido de 6/6 h se dor.');
  await page.locator('#rec-tipo').focus();
  await page.getByRole('button', { name: 'Salvar no prontuário' }).click();
  await page.getByRole('button', { name: 'Receita salva' }).waitFor();
  conferir(await prisma.receita.count({ where: { pacienteId: 'e2e-patient-a1', hospitalId: HOSPITAL_A.id } }) === 1, 'receita não gravada no Hospital A');
  conferir(await api(page, 'GET', '/api/receitas?pacienteId=audit-patient-b') === 404, 'histórico de receitas do B não devolveu 404');
  const status = await api(page, 'POST', '/api/receitas', { pacienteId: 'audit-patient-b', tipo: 'FARMACOLOGICA', medicamentos: [{ conteudo: 'teste', viaUso: 'Oral' }] });
  conferir([403, 404].includes(status), `receita para paciente do B devolveu ${status}`);
  conferir(await prisma.receita.count({ where: { pacienteId: 'audit-patient-b' } }) === 1, 'receita gravada no paciente do B');
});

await cenario('UTI (admitir paciente)', 'medico.alfa@example.test', async page => {
  await page.goto(`${BASE}/uti`);
  await page.getByRole('tab', { name: 'Admissão' }).click();
  await semDadosDoB(page, 'UTI');
  const select = page.locator('select:has(option:text("Paciente Alfa UTI"))');
  const valor = await select.locator('option', { hasText: 'Paciente Alfa UTI' }).getAttribute('value');
  await select.selectOption(valor);
  conferir(await page.locator('#uti-leito option').count() === 2, 'lista de leitos livres inclui leito de outro hospital');
  await page.locator('#uti-leito').selectOption('e2e-uti-a1');
  // O AlertProvider troca window.alert por um aviso na região "Avisos do sistema".
  await page.getByRole('button', { name: 'Admitir na UTI' }).click();
  const aviso = page.getByRole('region', { name: 'Avisos do sistema' }).locator('.alp-toast').first();
  await aviso.waitFor();
  const msg = (await aviso.innerText()).trim();
  conferir(msg.includes('Paciente vinculado'), `admissão recusada: ${msg}`);
  const leito = await prisma.utiLeito.findUnique({ where: { id: 'e2e-uti-a1' } });
  conferir(leito.status === 'OCUPADO' && leito.pacienteId === 'e2e-patient-a2', 'admissão não gravada');
  const leitosVistos = await page.evaluate(async () => (await (await fetch('/api/uti')).json()).map(l => l.id));
  conferir(!leitosVistos.includes('e2e-uti-b1'), 'GET /api/uti mostrou leito do B');
  conferir(await api(page, 'PUT', '/api/uti/e2e-uti-b1', { status: 'OCUPADO', pacienteId: 'e2e-patient-a1' }) === 404, 'PUT no leito do B não devolveu 404');
  conferir((await prisma.utiLeito.findUnique({ where: { id: 'e2e-uti-b1' } })).status === 'LIVRE', 'leito do B foi alterado');
});

await prisma.$disconnect();
await pool.end().catch(() => {});

for (const r of resultados) console.log(r.ok ? `PASSOU  ${r.tela} (${(r.ms / 1000).toFixed(1)} s)` : `FALHOU  ${r.tela}: ${r.erro}`);
process.exitCode = resultados.every(r => r.ok) && resultados.length === 4 ? 0 : 1;
