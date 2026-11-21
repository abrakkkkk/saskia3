import assert from 'node:assert/strict';
import { test } from 'node:test';
import { register } from 'tsx/esm/api';

// Item 8 (interoperabilidade): CNS, conferência do CNES e recursos FHIR da RNDS.
// tsx resolve os imports sem extensão de src/lib (o mesmo código que roda no Next).
register();
const { cnsValido, cnesValido, cboValido } = await import('../src/lib/cns.ts');
const { lerEstabelecimentoOficial, compararEstabelecimento, conferirEquipe } = await import('../src/lib/cnes.ts');

// Gera um CNS definitivo válido a partir de um PIS de 11 dígitos (mesma regra do manual do Cartão Nacional de Saúde).
function cnsDefinitivo(pis) {
  let soma = 0;
  for (let i = 0; i < 11; i++) soma += Number(pis[i]) * (15 - i);
  let dv = 11 - (soma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) { soma += 2; dv = 11 - (soma % 11); return `${pis}001${dv}`; }
  return `${pis}000${dv}`;
}
// CNS provisório válido: ajusta o último dígito até a soma ponderada fechar em múltiplo de 11.
function cnsProvisorio(prefixo14) {
  for (let d = 0; d <= 9; d++) {
    const c = `${prefixo14}${d}`;
    let soma = 0;
    for (let i = 0; i < 15; i++) soma += Number(c[i]) * (15 - i);
    if (soma % 11 === 0) return c;
  }
  return null;
}
export const CNS_PACIENTE = cnsProvisorio('70000000000000') ?? cnsProvisorio('70000000000001');
export const CNS_PROFISSIONAL = cnsDefinitivo('12345678901');

test('CNS: definitivo e provisório válidos; dígito errado, tamanho e prefixo inválidos', () => {
  assert.ok(cnsValido(CNS_PROFISSIONAL), CNS_PROFISSIONAL);
  assert.ok(cnsValido(CNS_PACIENTE), CNS_PACIENTE);
  assert.ok(cnsValido(cnsDefinitivo('20000000001')));
  assert.ok(cnsValido(`${CNS_PACIENTE.slice(0, 3)} ${CNS_PACIENTE.slice(3, 7)} ${CNS_PACIENTE.slice(7, 11)} ${CNS_PACIENTE.slice(11)}`), 'aceita máscara');
  const trocado = CNS_PROFISSIONAL.slice(0, 14) + String((Number(CNS_PROFISSIONAL[14]) + 1) % 10);
  assert.equal(cnsValido(trocado), false);
  assert.equal(cnsValido('898005900000823'), false, 'CNS fictício do exemplo oficial não fecha o dígito');
  assert.equal(cnsValido('12345'), false);
  assert.equal(cnsValido('312345678901234'), false, 'prefixo 3 não existe');
  assert.equal(cnsValido(null), false);
  assert.ok(cnesValido('2077485') && !cnesValido('207748'));
  assert.ok(cboValido('225125') && !cboValido('2251'));
});

test('CNES: leitura da API de dados abertos e divergências do estabelecimento', () => {
  // Resposta real (resumida) de https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/2077485 em 21/11/2026.
  const oficial = lerEstabelecimentoOficial({
    codigo_cnes: 2077485, nome_razao_social: 'SPDM ASSOCIACAO PAULISTA PARA O DESENVOLVIMENTO DA MEDICIN',
    nome_fantasia: 'HOSPITAL SAO PAULO HOSPITAL DE ENSINO DA UNIFESP', numero_cnpj: '61699567000192',
    codigo_uf: 35, codigo_municipio: 355030, data_atualizacao: '2025-09-03',
  });
  assert.deepEqual(oficial, {
    cnes: '2077485', nomeFantasia: 'HOSPITAL SAO PAULO HOSPITAL DE ENSINO DA UNIFESP',
    razaoSocial: 'SPDM ASSOCIACAO PAULISTA PARA O DESENVOLVIMENTO DA MEDICIN', cnpj: '61699567000192',
    municipioIbge: '355030', uf: 'SP', atualizadoEm: '2025-09-03',
  });
  assert.deepEqual(compararEstabelecimento(oficial, { nome: 'Hospital São Paulo Hospital de Ensino da Unifesp', cnpj: '61.699.567/0001-92', municipioIbge: '355030', uf: 'sp' }), []);
  const d = compararEstabelecimento(oficial, { nome: 'Outro', cnpj: '00000000000191', municipioIbge: '330455', uf: 'RJ' });
  assert.deepEqual(d.map(x => x.campo), ['Nome', 'CNPJ', 'Município (IBGE)', 'UF']);
  assert.equal(lerEstabelecimentoOficial({ codigo_cnes: 'x' }), null);
});

test('CNES: conferência da equipe pelo CNS', () => {
  const equipe = [{ cns: CNS_PROFISSIONAL, nome: 'ANA', cbo: '225125' }];
  const r = conferirEquipe([
    { id: '1', nome: 'Ana', cargo: 'MEDICO', cns: CNS_PROFISSIONAL, cbo: '225125' },
    { id: '2', nome: 'Bia', cargo: 'MEDICO', cns: CNS_PROFISSIONAL, cbo: '225124' },
    { id: '3', nome: 'Caio', cargo: 'MEDICO', cns: null, cbo: null },
    { id: '4', nome: 'Duda', cargo: 'MEDICO', cns: '123456789012345', cbo: null },
    { id: '5', nome: 'Eva', cargo: 'MEDICO', cns: CNS_PACIENTE, cbo: null },
  ], equipe);
  assert.deepEqual(r.map(x => x.situacao), ['CONFERE', 'CBO_DIFERENTE', 'SEM_CNS', 'CNS_INVALIDO', 'FORA_DO_CNES']);
  assert.equal(conferirEquipe([{ id: '5', nome: 'Eva', cargo: 'MEDICO', cns: CNS_PACIENTE, cbo: null }], [])[0].situacao, 'CONFERE', 'sem importação não acusa ausência');
});

// ---- RNDS: documentos FHIR validados contra os perfis oficiais (cópias em tests/fixtures/rnds) ----
const { gerarRiaRotina, gerarResultadoExame, ErroDocumentoRnds } = await import('../src/lib/rnds/documentos.ts');
const { validarDocumento } = await import('../src/lib/rnds/validador.ts');
const { createRequire } = await import('node:module');
const { readFileSync, readdirSync } = await import('node:fs');
const require = createRequire(import.meta.url);

const remetente = { identificadorSolicitante: '9999', cnes: '2077485' };
const vacina = {
  imunobiologico: '87', fabricante: '141', lote: 'FX1234', validade: new Date('2027-03-31T12:00:00Z'), dose: '1', estrategia: '1',
  via: '10885', localAplicacao: '1', grupoAtendimento: '00', condicaoMaternal: '1', aplicadaEm: new Date('2026-11-20T13:30:00Z'),
};
const ria = (extra = {}) => gerarRiaRotina({
  remetente, idLocal: 'saskia-ria-0001', paciente: { cns: CNS_PACIENTE }, profissional: { cns: CNS_PROFISSIONAL, cbo: '223505' }, vacina, agora: new Date('2026-11-21T10:00:00Z'), ...extra,
});
const exame = {
  codigoExame: '94309-2', categoria: '0202', resultado: '2', amostra: 'SWNAFA', metodo: 'RT-PCR em tempo real', valorReferencia: 'Não detectável',
  suspeita: 'B342', coletadoEm: new Date('2026-11-19T09:00:00Z'), liberadoEm: new Date('2026-11-20T15:00:00Z'),
};
const rel = (extra = {}) => gerarResultadoExame({ remetente, idLocal: 'saskia-rel-0001', paciente: { cpf: '52998224725' }, exame, agora: new Date('2026-11-21T10:00:00Z'), ...extra });
const clonar = o => JSON.parse(JSON.stringify(o));

test('RNDS: resumo dos perfis confere com as cópias oficiais baixadas do Simplifier', () => {
  const { resumirPerfil, PERFIS } = require('../scripts/atualizar-perfis-rnds.cjs');
  const resumo = Object.values(PERFIS).map(n => resumirPerfil(JSON.parse(readFileSync(new URL(`./fixtures/rnds/StructureDefinition-${n}.json`, import.meta.url), 'utf8'))));
  assert.deepEqual(JSON.parse(readFileSync(new URL('../src/lib/rnds/perfis-oficiais.json', import.meta.url), 'utf8')), resumo);
  assert.ok(readdirSync(new URL('./fixtures/rnds/', import.meta.url)).length >= 26);
});

test('RNDS: RIA-R (vacinação de rotina) válido no perfil oficial; retificação com relatesTo', () => {
  assert.deepEqual(validarDocumento(ria()), []);
  const b = ria({ substituiIdRnds: 'abc-123' });
  assert.deepEqual(validarDocumento(b), []);
  assert.equal(b.entry[0].resource.relatesTo[0].targetReference.reference, 'Composition/abc-123');
  assert.equal(b.identifier.system, 'http://www.saude.gov.br/fhir/r4/NamingSystem/BRRNDS-9999');
  const transcrita = ria({ vacina: { ...vacina, registroOrigem: '02', pais: '10' } });
  assert.deepEqual(validarDocumento(transcrita), []);
});

test('RNDS: o validador aponta violações do perfil RIA-R', () => {
  const casos = [
    [b => { delete b.entry[1].resource.lotNumber; b.entry[1].resource.vaccineCode.coding[0].code = '99999'; }, /vaccineCode.*99999/],
    [b => { b.entry[1].resource.extension.pop(); }, /condicaoMaternal/],
    [b => { b.entry[1].resource.protocolApplied[0].doseNumberString = '777'; }, /doseNumber.*777/],
    [b => { b.entry[1].resource.protocolApplied[0].extension = []; }, /strategy|protocolApplied.extension/],
    [b => { b.entry[1].resource.manufacturer.identifier.system = 'http://exemplo'; }, /manufacturer.identifier.system/],
    [b => { b.entry[1].resource.route.coding[0].system = 'http://exemplo'; }, /route.coding/],
    [b => { b.entry[0].resource.title = 'Outro título'; }, /title/],
    [b => { b.entry[0].resource.category = [{ coding: [{ system: 'x', code: 'y' }] }]; }, /category.*não pode/],
    [b => { b.entry[1].resource.occurrenceDateTime = '20/11/2026'; }, /occurrenceDateTime/],
    [b => { b.entry[0].resource.section[0].entry[0].reference = 'urn:uuid:nao-existe'; }, /nao-existe/],
    [b => { b.identifier.system = 'http://outro'; }, /Bundle.identifier/],
    [b => { b.entry[1].resource.status = 'not-done'; }, /status/],
    [b => { b.entry[1].resource.extension[0].valueCodeableConcept.coding[0].code = 'ZZ'; }, /ZZ/],
  ];
  for (const [alterar, esperado] of casos) {
    const b = clonar(ria());
    alterar(b);
    const problemas = validarDocumento(b).map(p => `${p.caminho}: ${p.mensagem}`).join(' | ');
    assert.match(problemas, esperado, `esperava ${esperado}, veio: ${problemas || '(nenhum problema)'}`);
  }
});

test('RNDS: REL (resultado de exame) válido no perfil oficial e violações apontadas', () => {
  assert.deepEqual(validarDocumento(rel()), []);
  const sem = clonar(rel());
  sem.entry[2].resource.referenceRange = [];
  sem.entry[2].resource.valueCodeableConcept.coding[0].code = '9';
  delete sem.entry[3].resource.type;
  const p = validarDocumento(sem).map(x => `${x.caminho}: ${x.mensagem}`).join(' | ');
  assert.match(p, /referenceRange/);
  assert.match(p, /value\[x\].*"9"/);
  assert.match(p, /Specimen.type/);
  const outroExame = clonar(rel());
  outroExame.entry[2].resource.code.coding[0].code = '2345-7';
  assert.match(validarDocumento(outroExame).map(x => x.mensagem).join(' '), /2345-7/, 'REL só aceita exames da tabela oficial');
});

test('RNDS: dados insuficientes recusados antes de gerar, sem expor identificação', () => {
  assert.throws(() => ria({ paciente: {} }), ErroDocumentoRnds);
  assert.throws(() => ria({ remetente: { identificadorSolicitante: '', cnes: '2077485' } }), /solicitante/);
  assert.throws(() => ria({ profissional: { cns: '' } }), /CNS/);
  const b = clonar(ria());
  b.entry[1].resource.patient.identifier.system = 'http://outro';
  for (const prob of validarDocumento(b)) assert.ok(!prob.mensagem.includes(CNS_PACIENTE), 'mensagem não traz o CNS do paciente');
});
