import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const pageUrl = new URL('../src/app/(auth)/relatorios/page.tsx', import.meta.url);

test('relatórios consomem a API do hospital e não geram dados fictícios', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /\/api\/relatorios\?\$\{params\.toString\(\)\}/);
  assert.doesNotMatch(source, /Math\.random|Paciente Mock|carregarMockDados|saskiaBsTransfusoes/);
});

test('relatórios não apresentam métricas que a API marca como placeholder', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.doesNotMatch(source, /data\.tmp|data\.transfusoes|data\.hm|data\.taxaIRAS/);
});
