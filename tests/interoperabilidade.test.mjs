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
