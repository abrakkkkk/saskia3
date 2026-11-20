// Banco de TESTE descartável (Postgres 16 em Docker, só nesta máquina). Nunca toca a produção.
//   node tests/banco-teste.mjs subir   -> cria o contêiner e grava DATABASE_URL_TESTE em .env.test (fora do git)
//   node tests/banco-teste.mjs descer  -> apaga o contêiner e o .env.test
// Requer Docker Desktop aberto.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';

const CONTAINER = 'saskia-teste-db';
const PORTA = 55432;
const ARQUIVO = '.env.test';
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const acao = process.argv[2];
if (acao === 'subir') {
  const existe = docker('ps', '-a', '--filter', `name=^${CONTAINER}$`, '--format', '{{.Names}}');
  if (existe && existsSync(ARQUIVO)) {
    docker('start', CONTAINER);
    console.log(`Banco de teste já existe; iniciado. URL em ${ARQUIVO}.`);
  } else {
    if (existe) docker('rm', '-f', CONTAINER);
    const senha = randomBytes(18).toString('hex');
    docker('run', '-d', '--name', CONTAINER, '-e', 'POSTGRES_USER=saskia_teste', '-e', `POSTGRES_PASSWORD=${senha}`,
      '-e', 'POSTGRES_DB=saskia_teste', '-p', `127.0.0.1:${PORTA}:5432`, 'postgres:16-alpine');
    writeFileSync(ARQUIVO, `# Banco local descartável (tests/banco-teste.mjs). Fora do git.\nDATABASE_URL_TESTE=postgresql://saskia_teste:${senha}@localhost:${PORTA}/saskia_teste\n`);
    console.log(`Banco de teste criado em localhost:${PORTA}. URL gravada em ${ARQUIVO}.`);
  }
} else if (acao === 'descer') {
  try { docker('rm', '-f', CONTAINER); } catch { /* já não existe */ }
  rmSync(ARQUIVO, { force: true });
  console.log('Banco de teste apagado.');
} else {
  console.error('Uso: node tests/banco-teste.mjs subir|descer');
  process.exit(1);
}
