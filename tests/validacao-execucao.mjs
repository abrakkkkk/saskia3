// Validação em execução contra o banco de TESTE local (nunca a produção):
//   1) migrações, 2) seed fictício (2 hospitais), 3) `next dev` na porta 3210,
//   4) teste de isolamento entre hospitais, 5) roteiro Playwright das telas críticas.
// Pré-requisito: `node tests/banco-teste.mjs subir` (Docker aberto). Uso: `npm run test:validacao`.
import { spawn, execFileSync, execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { exigirBancoDeTeste, semearBancoDeTeste } from './fixtures/seed-teste.mjs';

config({ path: '.env.test', quiet: true });
const url = exigirBancoDeTeste(process.env.DATABASE_URL_TESTE);
const PORTA = process.env.E2E_PORTA ?? '3210';
const BASE = `http://localhost:${PORTA}`;

// O processo filho recebe o banco de teste explicitamente; o Next não sobrescreve variáveis já definidas com o .env.
const env = {
  ...process.env,
  DATABASE_URL: url,
  DATABASE_URL_TESTE: url,
  AUTH_SECRET: randomBytes(32).toString('hex'),
  AUTH_TRUST_HOST: 'true',
  AUTH_URL: BASE,
  PLATAFORMA_ADMIN_EMAILS: '',
  BLOB_READ_WRITE_TOKEN: '',
  OPENAI_API_KEY: '',
  NEXT_TELEMETRY_DISABLED: '1',
  // Pasta de build própria (dentro de .next, já ignorada no git): não briga com outro `next dev` aberto.
  SASKIA_TESTE_DIST_DIR: '.next/teste',
};

const rodar = (cmd, args, extra = {}) => new Promise(resolve => {
  const p = spawn(cmd, args, { env: { ...env, ...extra }, stdio: 'inherit', shell: process.platform === 'win32' });
  p.on('exit', code => resolve(code ?? 1));
});

console.log('> Cliente Prisma e migrações no banco de teste');
execSync('npx prisma generate', { env, stdio: ['ignore', 'ignore', 'inherit'] });
execSync('npx prisma migrate deploy', { env, stdio: ['ignore', 'ignore', 'inherit'] });
console.log('> Seed fictício');
await semearBancoDeTeste(url);

console.log(`> Subindo next dev em ${BASE}`);
const servidor = spawn('npx', ['next', 'dev', '-p', PORTA], { env, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
let logServidor = '';
servidor.stdout.on('data', d => { logServidor += d; });
servidor.stderr.on('data', d => { logServidor += d; });

function parar() {
  if (servidor.exitCode !== null) return;
  if (process.platform === 'win32') { try { execFileSync('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* já parou */ } }
  else servidor.kill('SIGTERM');
}
process.on('exit', parar);

let pronto = false;
for (let i = 0; i < 120 && servidor.exitCode === null; i++) {
  try { if ((await fetch(`${BASE}/api/auth/csrf`)).ok) { pronto = true; break; } } catch { /* subindo */ }
  await new Promise(r => setTimeout(r, 2000));
}
if (!pronto) {
  console.error('Servidor não subiu. Fim do log:\n' + logServidor.slice(-2000));
  parar();
  process.exit(1);
}
// Aquece as rotas para o Playwright não esbarrar na primeira compilação.
for (const rota of ['/', '/recepcao', '/receituario', '/uti', '/pacientes/x']) await fetch(BASE + rota).catch(() => {});

console.log('> Teste de isolamento entre hospitais');
const isolamento = await rodar('node', ['--test', 'tests/tenant-isolation.integration.test.mjs'], { AUDIT_BASE_URL: BASE });

console.log('> Roteiro Playwright das telas críticas');
await semearBancoDeTeste(url);
const e2e = await rodar('node', ['tests/e2e/telas-criticas.mjs'], { E2E_BASE_URL: BASE });

parar();
console.log(`\nResultado: isolamento ${isolamento === 0 ? 'PASSOU' : 'FALHOU'}; telas críticas ${e2e === 0 ? 'PASSOU' : 'FALHOU'}`);
process.exit(isolamento === 0 && e2e === 0 ? 0 : 1);
