import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { gerarLoteTiss, ErroTiss } from '../src/lib/faturamento/tiss.ts';
import { gerarBpa, gerarArquivoAih, controleBpa, ErroSus } from '../src/lib/faturamento/sus.ts';

// Item 7 (faturamento): XML TISS validado no XSD oficial 4.03.00 e arquivos BPA/AIH no layout fixo do DATASUS.
const XSD = fileURLToPath(new URL('./fixtures/tiss-4.03.00/tissV4_03_00.xsd', import.meta.url));
const VALIDADOR = fileURLToPath(new URL('./fixtures/validar-xsd.py', import.meta.url));
const pasta = mkdtempSync(join(tmpdir(), 'saskia-tiss-'));

const python = ['python', 'python3', 'py'].find(cmd => spawnSync(cmd, ['-c', 'import lxml'], { stdio: 'ignore' }).status === 0);

function validarXsd(xml, nome) {
  const arquivo = join(pasta, `${nome}.xml`);
  writeFileSync(arquivo, Buffer.from(xml, 'latin1'));
  const r = spawnSync(python, ['-P', VALIDADOR, XSD, arquivo], { encoding: 'utf8' });
  return { status: r.status, saida: `${r.stdout}${r.stderr}`.trim() };
}

const prestador = { cnpj: '12.345.678/0001-95', cnes: '1234567' };
const profissional = { nome: 'Dra. Ana Lúcia Souza', conselho: '06', numeroConselho: '123456', ufIbge: '35', cbo: '225125' };
const base = {
  numeroCarteira: '0001234567890', dataAtendimento: '2026-11-10', caraterAtendimento: '1', indicacaoAcidente: '9',
  regimeAtendimento: '01', profissional,
};
const lote = guias => ({ numeroLote: '1', sequencialTransacao: '1', dataHora: new Date('2026-11-20T15:00:00Z'), prestador, registroAns: '123456', guias });

const guiaConsulta = { ...base, tipo: 'CONSULTA', numeroGuiaPrestador: '100', tipoConsulta: '1',
  itens: [{ tabela: '22', codigo: '10101012', descricao: 'Consulta em consultório', quantidade: 1, valorUnitario: 150, valorTotal: 150, dataExecucao: '2026-11-10' }] };
const guiaSadt = { ...base, tipo: 'SP_SADT', numeroGuiaPrestador: '101', tipoAtendimento: '23', dataAutorizacao: '2026-11-09', senha: 'ABC123',
  itens: [
    { tabela: '22', codigo: '40301630', descricao: 'Hemograma com contagem de plaquetas', quantidade: 1, valorUnitario: 12.5, valorTotal: 12.5, dataExecucao: '2026-11-10' },
    { tabela: '18', codigo: '60000589', descricao: 'Taxa de sala', quantidade: 1, valorUnitario: 30, valorTotal: 30, dataExecucao: '2026-11-10', codigoDespesa: '07', unidadeMedida: '036' },
  ] };
const guiaInternacao = { ...base, tipo: 'RESUMO_INTERNACAO', numeroGuiaPrestador: '102', numeroGuiaOperadora: '9988', senha: 'SENHA1', dataAutorizacao: '2026-11-01',
  dataAtendimento: '2026-11-01', dataFim: '2026-11-05', regimeAtendimento: '03', motivoEncerramento: '12', tipoInternacao: '1', regimeInternacao: '1', cids: ['J18.9'],
  itens: [
    { tabela: '22', codigo: '10102019', descricao: 'Visita hospitalar (paciente internado)', quantidade: 4, valorUnitario: 80, valorTotal: 320, dataExecucao: '2026-11-02' },
    { tabela: '18', codigo: '60023112', descricao: 'Diária de apartamento', quantidade: 4, valorUnitario: 450, valorTotal: 1800, dataExecucao: '2026-11-05', codigoDespesa: '05' },
  ] };

test('TISS 4.03.00: os três tipos de guia passam no XSD oficial da ANS', { skip: !python && 'Python com lxml não encontrado' }, () => {
  for (const [nome, guia] of [['consulta', guiaConsulta], ['sadt', guiaSadt], ['internacao', guiaInternacao]]) {
    const { xml } = gerarLoteTiss(lote([guia]));
    const r = validarXsd(xml, nome);
    assert.equal(r.status, 0, `${nome}: ${r.saida}`);
  }
});

test('TISS: hash do epílogo é o MD5 do conteúdo das tags, em ISO-8859-1', () => {
  const { xml, hash } = gerarLoteTiss(lote([guiaConsulta]));
  const semEpilogo = xml.slice(0, xml.indexOf('<ans:epilogo>'));
  const textos = [...semEpilogo.matchAll(/>([^<>]+)</g)].map(m => m[1]).filter(t => t.trim())
    .map(t => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')).join('');
  assert.equal(hash, createHash('md5').update(Buffer.from(textos, 'latin1')).digest('hex'));
  assert.match(xml, new RegExp(`<ans:hash>${hash}</ans:hash>`));
  assert.match(xml, /<ans:Padrao>4\.03\.00<\/ans:Padrao>/);
});

test('TISS: recusa lote misto, vazio ou resumo de internação sem senha', () => {
  assert.throws(() => gerarLoteTiss(lote([guiaConsulta, guiaSadt])), ErroTiss);
  assert.throws(() => gerarLoteTiss(lote([])), ErroTiss);
  assert.throws(() => gerarLoteTiss(lote([{ ...guiaInternacao, senha: null }])), ErroTiss);
});

const cabBpa = { competencia: '202611', orgaoOrigemNome: 'Hospital Geral Alfa', orgaoOrigemSigla: 'HGA', cnpjCpf: '12345678000195',
  orgaoDestinoNome: 'Secretaria Municipal de Saúde', orgaoDestinoTipo: 'M' };
const bpaC = Array.from({ length: 21 }, (_, i) => ({ cnes: '1234567', competencia: '202611', cbo: '225125', procedimento: '0301010072', idade: 30 + i, quantidade: 2 }));
const bpaI = [{ cnes: '1234567', competencia: '202611', cnsProfissional: '123456789012345', cbo: '225125', dataAtendimento: '20261110', procedimento: '0301010072',
  cnsPaciente: '898001234567890', sexo: 'F', municipioIbge: '355030', cid: 'J18.9', idade: 42, quantidade: 1, caraterAtendimento: '01',
  nomePaciente: 'Maria José da Conceição', dataNascimento: '19840115', racaCor: '03', cep: '01000-000', endereco: 'Rua das Flores', numeroEndereco: '10', bairro: 'Centro' }];

test('BPA: cabeçalho, BPA-C e BPA-I nas posições do layout oficial', () => {
  const arq = gerarBpa(cabBpa, bpaC, bpaI);
  assert.ok(arq.endsWith('\r\n'));
  const linhas = arq.split('\r\n').filter(Boolean);
  assert.equal(linhas.length, 23);
  const [cab, c1, , , , , , , , , , , , , , , , , , , , c21, i1] = linhas;
  assert.equal(cab.length, 130);
  assert.equal(cab.slice(0, 7), '01#BPA#');
  assert.equal(cab.slice(7, 13), '202611');
  assert.equal(cab.slice(13, 19), '000022'); // linhas de produção
  assert.equal(cab.slice(19, 25), '000003'); // folhas: 2 do BPA-C (20 + 1) e 1 do BPA-I
  assert.equal(cab.slice(25, 29), String(controleBpa([...bpaC, ...bpaI])));
  assert.equal(cab.slice(65, 79), '12345678000195');
  assert.equal(cab[119], 'M');
  assert.equal(c1.length, 48);
  assert.equal(c1.slice(0, 2), '02');
  assert.equal(c1.slice(2, 9), '1234567');
  assert.equal(c1.slice(21, 26), '00101'); // folha 001, sequência 01
  assert.equal(c1.slice(26, 36), '0301010072');
  assert.equal(c1.slice(45, 48), 'BPA');
  assert.equal(c21.slice(21, 26), '00201'); // 21ª linha abre a folha 2
  assert.equal(i1.length, 351);
  assert.equal(i1.slice(0, 2), '03');
  assert.equal(i1.slice(15, 30), '123456789012345');
  assert.equal(i1.slice(36, 44), '20261110');
  assert.equal(i1.slice(44, 49), '00301'); // folha 003, sequência 01
  assert.equal(i1.slice(59, 74), '898001234567890');
  assert.equal(i1[74], 'F');
  assert.equal(i1.slice(81, 85), 'J189');
  assert.equal(i1.slice(109, 112), 'BPA');
  assert.equal(i1.slice(112, 142).trim(), 'MARIA JOSE DA CONCEICAO');
  assert.equal(i1.slice(150, 152), '03');
  assert.equal(i1.slice(338, 349).trim(), ''); // CPF em branco quando há CNS
  assert.match(arq, /^[\x20-\x7E\r\n]+$/); // só ASCII
});

test('BPA: controle = (soma dos códigos + quantidades) mod 1111 + 1111', () => {
  const v = controleBpa([{ procedimento: '0301010072', quantidade: 2 }]);
  assert.equal(v, (301010072 + 2) % 1111 + 1111);
  assert.ok(v >= 1111 && v <= 2221);
});

const aih = { competenciaApresentacao: '202611', orgaoEmissor: 'M355030001', cnes: '1234567', municipioHospital: '355030', numeroAih: '3526100000012',
  especialidade: '03', dataEmissao: '20261101', dataInternacao: '20261101', dataSaida: '20261105', procedimentoSolicitado: '0303140151',
  procedimentoRealizado: '0303140151', caraterInternacao: '02', motivoSaida: '12', cnsMedicoSolicitante: '123456789012345',
  cnsMedicoResponsavel: '123456789012345', cidPrincipal: 'J18.9', cidsSecundarios: ['I10'], nomePaciente: 'João Ninguém', dataNascimento: '19700101',
  sexo: 'M', racaCor: '01', nomeMae: 'Maria Ninguém', cnsPaciente: '898001234567890', municipioPaciente: '355030', ufPaciente: 'SP', cep: '01000000',
  prontuario: 'P-000123', procedimentos: [{ documentoProfissional: '0', procedimento: '0802010083', quantidade: 2, competencia: '202611' }] };

test('AIH (SISAIH01): registro principal com 1800 posições nos lugares do layout', () => {
  const arq = gerarArquivoAih([aih]);
  const [l] = arq.split('\r\n');
  assert.equal(l.length, 1800);
  const campo = (ini, fim) => l.slice(ini - 1, fim);
  assert.equal(campo(12, 17), '202611');
  assert.equal(campo(31, 37), '1234567');
  assert.equal(campo(44, 56), '3526100000012');
  assert.equal(campo(57, 58), '01');
  assert.equal(campo(145, 152), '20261101');
  assert.equal(campo(153, 160), '20261105');
  assert.equal(campo(161, 170), '0303140151');
  assert.equal(campo(171, 171), '2'); // sem mudança de procedimento
  assert.equal(campo(182, 183), '02');
  assert.equal(campo(184, 185), '12');
  assert.equal(campo(186, 201), '2123456789012345');
  assert.equal(campo(250, 253), 'J189');
  assert.equal(campo(269, 338).trim(), 'JOAO NINGUEM');
  assert.equal(campo(347, 347), 'M');
  assert.equal(campo(502, 516), '898001234567890');
  assert.equal(campo(631, 632), 'SP');
  assert.equal(campo(718, 727), '0802010083'); // 1º procedimento especial: código (664 + 54)
  assert.equal(campo(1426, 1426), '1'); // saída por alta
  assert.equal(campo(1591, 1595), 'I10 0');
  assert.match(arq, /^[\x20-\x7E\r\n]+$/);
});

test('SUS: recusa produção sem documento do paciente ou com campo grande demais', () => {
  assert.throws(() => gerarBpa(cabBpa, [], [{ ...bpaI[0], cnsPaciente: null, cpfPaciente: null }]), ErroSus);
  assert.throws(() => gerarArquivoAih([{ ...aih, numeroAih: '123' }]), ErroSus);
  assert.throws(() => gerarBpa(cabBpa, [{ ...bpaC[0], procedimento: '03010100721' }], []), ErroSus);
});

