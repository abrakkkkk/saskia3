// Conferência visual das telas do item 8 (Integrações e Vacinação) contra o servidor de TESTE.
// Uso: AUTH_SECRET=<o mesmo do servidor> DATABASE_URL_TESTE=... E2E_BASE_URL=http://localhost:3220 node tests/e2e/verificar-integracoes.mjs <pasta-capturas>
// Imprime só os resultados (estouro horizontal, erros de console) e grava capturas desktop e celular.
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { register } from 'tsx/esm/api';
import bcrypt from 'bcryptjs';
import { exigirBancoDeTeste } from '../fixtures/seed-teste.mjs';
import { SENHA_E2E } from '../fixtures/dados-teste.mjs';

register();
const { cifrarSegredo, totpAtual } = await import('../../src/lib/mfa.ts');
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3220';
const PASTA = process.argv[2] ?? '.';
const SEGREDO = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: exigirBancoDeTeste(process.env.DATABASE_URL_TESTE) })) });
await prisma.usuario.upsert({
  where: { id: 'e2e-admin-int-a' },
  create: { id: 'e2e-admin-int-a', hospitalId: 'audit-hospital-a', nome: 'Gestor Integração Alfa', email: 'gestor.integracao@example.test', cargo: 'ADMIN', senha: await bcrypt.hash(SENHA_E2E, 10), mfaAtivo: true, mfaSegredo: cifrarSegredo(SEGREDO) },
  update: { mfaAtivo: true, mfaSegredo: cifrarSegredo(SEGREDO), mfaUltimoPasso: null, ativo: true },
});
await prisma.$disconnect();

async function entrar(page, email, otp) {
  const r = await page.request.get(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await r.json();
  const form = { csrfToken, email, senha: SENHA_E2E, hospitalId: 'audit-hospital-a', callbackUrl: BASE, json: 'true', ...(otp ? { otp } : {}) };
  const login = await page.request.post(`${BASE}/api/auth/callback/credentials`, { form });
  if (login.status() >= 400) throw new Error(`login ${email}: ${login.status()}`);
}
async function conferir(page, nome) {
  const estouro = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`${nome}: estouro horizontal ${estouro}px`);
  if (estouro > 0) console.log('  culpado:', await page.evaluate(() => { const w = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > w + 1).slice(-3).map(e => `${e.tagName}.${[...e.classList].join('.')} ${Math.round(e.getBoundingClientRect().right)}`).join(' | '); }));
  await page.screenshot({ path: `${PASTA}/${nome}.png`, fullPage: true });
}

const browser = await chromium.launch();
const erros = [];
for (const [rotulo, viewport] of [['desktop', { width: 1366, height: 860 }], ['celular', { width: 390, height: 844 }]]) {
  // Enfermagem: registra uma dose na Vacinação.
  const enf = await browser.newContext({ viewport });
  const p1 = await enf.newPage();
  p1.on('console', m => m.type() === 'error' && erros.push(`[${rotulo} vacinação] ${m.text()}`));
  await entrar(p1, 'enfermagem.alfa@example.test');
  await p1.goto(`${BASE}/vacinacao`, { waitUntil: 'networkidle' });
  const select = p1.getByLabel('Paciente', { exact: true });
  await select.waitFor();
  await p1.waitForFunction(() => [...document.querySelectorAll('option')].some(o => o.textContent.includes('Paciente Alfa Triagem')));
  const valor = await select.evaluate(el => [...el.options].find(o => o.textContent.includes('Paciente Alfa Triagem'))?.value);
  await select.selectOption(valor);
  await p1.waitForTimeout(1500);
  if (rotulo === 'desktop' && await p1.locator('#vac-imunobiologico').count()) {
    await p1.selectOption('#vac-imunobiologico', '87');
    await p1.selectOption('#vac-dose', '2');
    await p1.selectOption('#vac-fabricante', '141');
    await p1.fill('#vac-lote', 'FX9999');
    await p1.selectOption('#vac-via', '10885');
    await p1.selectOption('#vac-localAplicacao', '1');
    await p1.getByRole('button', { name: 'Registrar dose' }).click();
    await p1.getByRole('status').filter({ hasText: 'Dose registrada' }).waitFor({ timeout: 10000 }).then(() => console.log('vacinação: dose registrada pela tela'), () => console.log('vacinação: FALHOU ao registrar'));
  }
  await conferir(p1, `vacinacao-${rotulo}`);
  await enf.close();

  // Gestor (ADMIN com MFA): Integrações, abas RNDS e CNES.
  const adm = await browser.newContext({ viewport });
  const p2 = await adm.newPage();
  p2.on('console', m => m.type() === 'error' && erros.push(`[${rotulo} integrações] ${m.text()}`));
  await entrar(p2, 'gestor.integracao@example.test', totpAtual(SEGREDO, Date.now() + (rotulo === 'celular' ? 30_000 : 0)));
  await p2.goto(`${BASE}/integracoes`, { waitUntil: 'networkidle' });
  await p2.getByRole('heading', { name: 'Fila de envio' }).waitFor({ timeout: 15000 }).catch(() => console.log('integrações: fila não apareceu'));
  if (rotulo === 'desktop') {
    const processar = p2.getByRole('button', { name: /Processar pendentes/ });
    if (await processar.isEnabled()) { await processar.click(); await p2.waitForTimeout(2500); }
    console.log('integrações: aviso ->', (await p2.locator('.mod-aviso').first().textContent().catch(() => ''))?.trim());
  }
  await conferir(p2, `integracoes-rnds-${rotulo}`);
  await p2.getByRole('tab', { name: 'CNES' }).click();
  await p2.getByRole('heading', { name: 'Equipe' }).waitFor({ timeout: 15000 }).catch(() => console.log('integrações: equipe não apareceu'));
  await conferir(p2, `integracoes-cnes-${rotulo}`);
  await adm.close();
}
await browser.close();
console.log(erros.length ? `Erros de console:\n${erros.join('\n')}` : 'Sem erros de console.');
