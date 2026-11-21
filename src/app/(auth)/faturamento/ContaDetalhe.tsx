'use client';
import { useCallback, useEffect, useState } from 'react';
import { Badge, ErrorState, LoadingState } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import {
  CARATER_ATENDIMENTO, CODIGO_DESPESA, CONSELHOS, ESPECIALIDADE_AIH, INDICACAO_ACIDENTE, MOTIVO_ENCERRAMENTO, NOME_GUIA, NOME_STATUS_CONTA,
  RACA_COR, REGIME_ATENDIMENTO, REGIME_INTERNACAO, TABELAS_ITEM, TIPO_ATENDIMENTO, TIPO_CONSULTA, TIPO_INTERNACAO, UF_IBGE,
  type Opcao, type StatusConta, type TipoGuia,
} from '@/lib/faturamento/dominios';
import { CBOS_TISS } from '@/lib/faturamento/cbos-tiss';
import { api, brl, competenciaTexto, dataInput, dataTexto, erroTexto, TOM_STATUS } from './comum';

type Item = {
  id: string; tabela: string; codigo: string; descricao: string; quantidade: string; valorUnitario: string; valorTotal: string;
  dataExecucao: string; codigoDespesa: string | null; valorGlosado: string; motivoGlosa: string | null;
};
type Conta = Record<string, string | null> & {
  id: string; numero: number; fonte: 'CONVENIO' | 'SUS'; tipoGuia: TipoGuia; status: StatusConta; competencia: string;
  valorTotal: string; valorGlosado: string; valorPago: string | null;
  paciente: { nome: string }; operadora: { nome: string; codigoAns: string } | null;
  internacao: { entradaEm: string; saidaEm: string | null; setor: string; leito: string | null } | null;
  lote: { tipo: string; numero: number; status: string } | null;
  itens: Item[]; pendencias: string[];
};
type Achado = { codigo: string; descricao: string; valorSa: string | null; valorSh: string | null; valorSp: string | null };

const UFS: Opcao[] = Object.keys(UF_IBGE).sort().map(uf => ({ codigo: uf, nome: uf }));
const CBOS: Opcao[] = CBOS_TISS.map(c => ({ codigo: c.codigo, nome: `${c.codigo} · ${c.nome}` }));
const NA_LOTE: StatusConta[] = ['EM_LOTE', 'ENVIADA', 'PAGA', 'GLOSADA'];

type Campo = { nome: string; rotulo: string; tipo?: 'texto' | 'data' | 'competencia'; opcoes?: Opcao[]; max?: number; dica?: string };

function camposDaConta(c: Conta): { titulo: string; campos: Campo[] }[] {
  const tiss = c.fonte === 'CONVENIO';
  const internacao = c.tipoGuia === 'RESUMO_INTERNACAO' || c.tipoGuia === 'AIH';
  const grupos: { titulo: string; campos: Campo[] }[] = [{
    titulo: 'Atendimento',
    campos: [
      { nome: 'dataAtendimento', rotulo: internacao ? 'Entrada' : 'Data do atendimento', tipo: 'data' },
      ...(internacao ? [{ nome: 'dataFim', rotulo: 'Saída', tipo: 'data' as const }] : []),
      { nome: 'competencia', rotulo: 'Competência', tipo: 'competencia' },
      { nome: 'cid', rotulo: 'CID principal', max: 6, dica: 'Ex.: J18.9' },
      { nome: 'caraterAtendimento', rotulo: 'Caráter', opcoes: CARATER_ATENDIMENTO },
      ...(tiss ? [
        { nome: 'indicacaoAcidente', rotulo: 'Acidente', opcoes: INDICACAO_ACIDENTE },
        { nome: 'regimeAtendimento', rotulo: 'Regime', opcoes: REGIME_ATENDIMENTO },
      ] : []),
      ...(c.tipoGuia === 'SP_SADT' ? [{ nome: 'tipoAtendimento', rotulo: 'Tipo de atendimento', opcoes: TIPO_ATENDIMENTO }] : []),
      ...(c.tipoGuia === 'CONSULTA' ? [{ nome: 'tipoConsulta', rotulo: 'Tipo de consulta', opcoes: TIPO_CONSULTA }] : []),
      ...(internacao ? [{ nome: 'motivoEncerramento', rotulo: 'Motivo da saída', opcoes: MOTIVO_ENCERRAMENTO }] : []),
      ...(c.tipoGuia === 'RESUMO_INTERNACAO' ? [
        { nome: 'tipoInternacao', rotulo: 'Tipo de internação', opcoes: TIPO_INTERNACAO },
        { nome: 'regimeInternacao', rotulo: 'Regime de internação', opcoes: REGIME_INTERNACAO },
      ] : []),
    ],
  }];
  if (tiss) grupos.push({
    titulo: 'Convênio e autorização',
    campos: [
      { nome: 'numeroCarteira', rotulo: 'Carteira do beneficiário', max: 20 },
      { nome: 'numeroGuiaOperadora', rotulo: 'Nº da guia na operadora', max: 20 },
      { nome: 'senhaAutorizacao', rotulo: 'Senha', max: 20 },
      { nome: 'dataAutorizacao', rotulo: 'Data da autorização', tipo: 'data' },
    ],
  });
  else grupos.push({
    titulo: 'Dados do SUS',
    campos: [
      { nome: 'cnsPaciente', rotulo: 'CNS do paciente', max: 15, dica: '15 dígitos' },
      { nome: 'racaCor', rotulo: 'Raça/cor', opcoes: RACA_COR },
      { nome: 'municipioIbgePaciente', rotulo: 'Município (IBGE)', max: 6, dica: '6 dígitos' },
      { nome: 'cepPaciente', rotulo: 'CEP', max: 9 },
      ...(c.tipoGuia === 'AIH' ? [
        { nome: 'numeroAih', rotulo: 'Nº da AIH', max: 13, dica: '13 dígitos' },
        { nome: 'procedimentoPrincipal', rotulo: 'Procedimento principal', max: 10, dica: 'Código SIGTAP' },
        { nome: 'especialidadeAih', rotulo: 'Especialidade do leito', opcoes: ESPECIALIDADE_AIH },
      ] : []),
    ],
  });
  grupos.push({
    titulo: 'Profissional',
    campos: [
      { nome: 'profissionalNome', rotulo: 'Nome', max: 70 },
      { nome: 'cbo', rotulo: 'CBO', opcoes: CBOS },
      ...(tiss ? [
        { nome: 'conselho', rotulo: 'Conselho', opcoes: CONSELHOS },
        { nome: 'numeroConselho', rotulo: 'Nº no conselho', max: 15 },
        { nome: 'ufConselho', rotulo: 'UF do conselho', opcoes: UFS },
      ] : [{ nome: 'cnsProfissional', rotulo: 'CNS do profissional', max: 15, dica: '15 dígitos' }]),
    ],
  });
  return grupos;
}

export default function ContaDetalhe({ contaId, podeGerir, onFechar, onMudou }: {
  contaId: string; podeGerir: boolean; onFechar: () => void; onMudou: () => void;
}) {
  const [conta, setConta] = useState<Conta | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [erroCarga, setErroCarga] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  // Lançamento de item
  const [tabela, setTabela] = useState('');
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState<Achado[]>([]);
  const [escolhido, setEscolhido] = useState<Achado | null>(null);
  const [descricaoPropria, setDescricaoPropria] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [despesa, setDespesa] = useState('');
  const [valorPago, setValorPago] = useState('');

  const carregar = useCallback(async () => {
    try {
      const c = await api<Conta>(`/api/faturamento/contas/${contaId}`);
      setConta(c);
      const f: Record<string, string> = {};
      for (const g of camposDaConta(c)) for (const campo of g.campos) {
        const v = c[campo.nome];
        f[campo.nome] = campo.tipo === 'data' ? dataInput(v) : campo.tipo === 'competencia' ? `${c.competencia.slice(0, 4)}-${c.competencia.slice(4)}` : (v ?? '');
      }
      setForm(f);
      setTabela(t => t || (c.fonte === 'SUS' ? 'SIGTAP' : c.tipoGuia === 'CONSULTA' ? '22' : '22'));
      setErroCarga('');
    } catch (e) {
      setErroCarga(erroTexto(e));
    }
  }, [contaId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial da conta escolhida
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!tabela || tabela === '00' || busca.trim().length < 2 || escolhido) return;
    const t = setTimeout(() => {
      api<{ itens: Achado[] }>(`/api/faturamento/tabelas?${new URLSearchParams({ tabela, q: busca.trim() })}`)
        .then(r => setAchados(r.itens ?? []))
        .catch(() => setAchados([]));
    }, 250);
    return () => clearTimeout(t);
  }, [busca, tabela, escolhido]);

  const editavel = podeGerir && conta?.status === 'ABERTA';
  const executar = async (fn: () => Promise<unknown>, sucesso: string) => {
    setOcupado(true);
    setAviso(null);
    try {
      await fn();
      setAviso({ tipo: 'sucesso', texto: sucesso });
      await carregar();
      onMudou();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: erroTexto(e) });
    } finally {
      setOcupado(false);
    }
  };

  const salvar = () => executar(() => {
    const corpo: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(form)) corpo[k] = k === 'competencia' ? v.replace('-', '') : v || null;
    return api(`/api/faturamento/contas/${contaId}`, 'PUT', corpo);
  }, 'Conta salva.');

  const lancar = () => executar(async () => {
    const codigo = escolhido?.codigo ?? busca.trim();
    await api(`/api/faturamento/contas/${contaId}/itens`, 'POST', {
      tabela, codigo, descricao: tabela === '00' ? descricaoPropria : undefined,
      quantidade: Number(quantidade.replace(',', '.')),
      valorUnitario: valor.trim() ? Number(valor.replace(',', '.')) : undefined,
      codigoDespesa: despesa || null,
    });
    setBusca(''); setEscolhido(null); setAchados([]); setValor(''); setQuantidade('1'); setDescricaoPropria('');
  }, 'Item lançado.');

  if (erroCarga) return <Modal title="Conta" onClose={onFechar}><ErrorState message={erroCarga} onRetry={() => void carregar()} /></Modal>;
  if (!conta) return <Modal title="Conta" onClose={onFechar}><LoadingState message="Abrindo conta..." /></Modal>;

  const tabelasDaConta = TABELAS_ITEM.filter(t => (conta.fonte === 'SUS' ? t.codigo === 'SIGTAP' : t.codigo !== 'SIGTAP'));
  const naLote = NA_LOTE.includes(conta.status);

  return (
    <Modal
      title={<>Conta {conta.numero} · {conta.paciente.nome}</>}
      icon="las la-file-invoice-dollar"
      size="xl"
      onClose={onFechar}
      busy={ocupado}
    >
      <div className="fat-resumo">
        <Badge tone={TOM_STATUS[conta.status]}>{NOME_STATUS_CONTA[conta.status]}</Badge>
        <span>{NOME_GUIA[conta.tipoGuia]}</span>
        <span>{conta.fonte === 'SUS' ? 'SUS' : `${conta.operadora?.nome ?? 'Convênio'} · ANS ${conta.operadora?.codigoAns ?? '—'}`}</span>
        <span>Competência {competenciaTexto(conta.competencia)}</span>
        {conta.internacao && <span>Internação {dataTexto(conta.internacao.entradaEm)} a {conta.internacao.saidaEm ? dataTexto(conta.internacao.saidaEm) : 'em curso'} · {conta.internacao.setor}</span>}
        {conta.lote && <span>Lote {conta.lote.tipo} nº {conta.lote.numero}</span>}
        <strong className="fat-total">{brl(conta.valorTotal)}</strong>
      </div>

      {aviso && <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`mod-aviso mod-aviso-${aviso.tipo}`}>{aviso.texto}</p>}
      {conta.status === 'ABERTA' && conta.pendencias.length > 0 && (
        <div className="mod-aviso mod-aviso-atencao"><strong>Falta para fechar</strong>{conta.pendencias.join(' · ')}</div>
      )}

      <form className="fat-cabecalho" onSubmit={e => { e.preventDefault(); void salvar(); }}>
        {camposDaConta(conta).map(grupo => (
          <fieldset key={grupo.titulo} className="fat-grupo" disabled={!editavel || ocupado}>
            <legend>{grupo.titulo}</legend>
            <div className="mod-form-grid">
              {grupo.campos.map(campo => {
                const id = `conta-${campo.nome}`;
                const valorCampo = form[campo.nome] ?? '';
                const mudar = (v: string) => setForm(f => ({ ...f, [campo.nome]: v }));
                return (
                  <div className="form-group" key={campo.nome}>
                    <label htmlFor={id}>{campo.rotulo}</label>
                    {campo.opcoes ? (
                      <select id={id} value={valorCampo} onChange={e => mudar(e.target.value)}>
                        <option value="">Não informado</option>
                        {campo.opcoes.map(o => <option key={o.codigo} value={o.codigo}>{o.nome}</option>)}
                      </select>
                    ) : (
                      <input
                        id={id}
                        type={campo.tipo === 'data' ? 'date' : campo.tipo === 'competencia' ? 'month' : 'text'}
                        value={valorCampo}
                        maxLength={campo.max}
                        placeholder={campo.dica}
                        inputMode={campo.dica?.includes('dígitos') ? 'numeric' : undefined}
                        onChange={e => mudar(e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
        {editavel && (
          <div className="mod-acoes">
            <button type="submit" className="btn btn-secondary" disabled={ocupado}><i className="las la-save" aria-hidden="true"></i> Salvar dados</button>
          </div>
        )}
      </form>

      <h3 className="fat-subtitulo">Itens</h3>
      {conta.itens.length === 0 ? (
        <p className="mod-nota">Nenhum item lançado.</p>
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr><th>Código</th><th>Descrição</th><th>Data</th><th className="fat-num">Qtd.</th><th className="fat-num">Unitário</th><th className="fat-num">Total</th>{naLote && <th>Glosa</th>}{editavel && <th><span className="fat-oculto">Ações</span></th>}</tr>
            </thead>
            <tbody>
              {conta.itens.map(i => (
                <ItemLinha key={i.id} item={i} contaId={conta.id} editavel={editavel} naLote={naLote} glosavel={naLote && podeGerir} ocupado={ocupado} executar={executar} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editavel && (
        <form className="fat-lancar" onSubmit={e => { e.preventDefault(); void lancar(); }}>
          <div className="mod-form-grid">
            <div className="form-group">
              <label htmlFor="item-tabela">Tabela</label>
              <select id="item-tabela" value={tabela} onChange={e => { setTabela(e.target.value); setEscolhido(null); setAchados([]); }}>
                {tabelasDaConta.map(t => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
              </select>
            </div>
            <div className="form-group fat-busca">
              <label htmlFor="item-busca">{tabela === '00' ? 'Código próprio' : 'Código ou nome'}</label>
              <input
                id="item-busca"
                value={escolhido ? `${escolhido.codigo} · ${escolhido.descricao}` : busca}
                onChange={e => { setEscolhido(null); setBusca(e.target.value); }}
                placeholder={tabela === 'SIGTAP' ? 'Ex.: consulta médica' : 'Ex.: 10101012'}
                autoComplete="off"
                maxLength={tabela === '00' ? 10 : 80}
              />
              {!escolhido && achados.length > 0 && busca.trim().length >= 2 && (
                <ul className="fat-achados" role="listbox" aria-label="Resultados da tabela">
                  {achados.map(a => (
                    <li key={a.codigo}>
                      <button type="button" role="option" aria-selected="false" onClick={() => {
                        setEscolhido(a);
                        setAchados([]);
                        if (tabela === 'SIGTAP' && !valor) setValor(String(Number(conta.tipoGuia === 'AIH' ? Number(a.valorSh ?? 0) + Number(a.valorSp ?? 0) : a.valorSa ?? 0)));
                      }}>
                        <strong>{a.codigo}</strong> {a.descricao}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {tabela === '00' && (
              <div className="form-group">
                <label htmlFor="item-descricao">Descrição</label>
                <input id="item-descricao" value={descricaoPropria} onChange={e => setDescricaoPropria(e.target.value)} maxLength={150} />
              </div>
            )}
            {conta.fonte === 'CONVENIO' && conta.tipoGuia !== 'CONSULTA' && (
              <div className="form-group">
                <label htmlFor="item-despesa">Natureza</label>
                <select id="item-despesa" value={despesa} onChange={e => setDespesa(e.target.value)}>
                  <option value="">Procedimento</option>
                  {CODIGO_DESPESA.map(d => <option key={d.codigo} value={d.codigo}>{d.nome}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="item-qtd">Quantidade</label>
              <input id="item-qtd" inputMode="decimal" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="item-valor">Valor unitário (R$)</label>
              <input id="item-valor" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="Preço do contrato" />
            </div>
          </div>
          <div className="mod-acoes">
            <button type="submit" className="btn btn-primary" disabled={ocupado || (!escolhido && tabela !== '00')}>
              <i className="las la-plus" aria-hidden="true"></i> Lançar item
            </button>
          </div>
        </form>
      )}

      {podeGerir && (
        <div className="ui-modal-foot fat-rodape">
          {conta.status === 'ABERTA' && (
            <>
              <button type="button" className="btn btn-danger" disabled={ocupado} onClick={() => void executar(() => api(`/api/faturamento/contas/${conta.id}`, 'PATCH', { acao: 'cancelar' }), 'Conta cancelada.')}>Cancelar conta</button>
              <button type="button" className="btn btn-success" disabled={ocupado} onClick={() => void executar(() => api(`/api/faturamento/contas/${conta.id}`, 'PATCH', { acao: 'fechar' }), 'Conta fechada. Ela entra no próximo lote.')}>
                <i className="las la-lock" aria-hidden="true"></i> Fechar conta
              </button>
            </>
          )}
          {conta.status === 'FECHADA' && (
            <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => void executar(() => api(`/api/faturamento/contas/${conta.id}`, 'PATCH', { acao: 'reabrir' }), 'Conta reaberta.')}>
              <i className="las la-unlock" aria-hidden="true"></i> Reabrir
            </button>
          )}
          {naLote && (
            <form className="fat-retorno" onSubmit={e => {
              e.preventDefault();
              void executar(() => api(`/api/faturamento/contas/${conta.id}`, 'PATCH', { acao: 'retorno', valorPago: Number(valorPago.replace(',', '.')) }), 'Retorno registrado.');
            }}>
              <div className="form-group">
                <label htmlFor="conta-pago">Valor pago (R$)</label>
                <input id="conta-pago" inputMode="decimal" value={valorPago} onChange={e => setValorPago(e.target.value)} placeholder={conta.valorPago ? String(Number(conta.valorPago)) : '0,00'} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={ocupado}>Registrar retorno</button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}

function ItemLinha({ item, contaId, editavel, naLote, glosavel, ocupado, executar }: {
  item: Item; contaId: string; editavel: boolean; naLote: boolean; glosavel: boolean; ocupado: boolean;
  executar: (fn: () => Promise<unknown>, sucesso: string) => Promise<void>;
}) {
  const [glosa, setGlosa] = useState(Number(item.valorGlosado) ? String(Number(item.valorGlosado)) : '');
  const [motivo, setMotivo] = useState(item.motivoGlosa ?? '');
  const tabela = item.tabela === 'SIGTAP' ? 'SIGTAP' : item.tabela === '00' ? 'Própria' : `TUSS ${item.tabela}`;
  return (
    <tr>
      <td><span className="fat-codigo">{item.codigo}</span><span className="mod-secundario">{tabela}</span></td>
      <td>{item.descricao}{item.codigoDespesa && <span className="mod-secundario">{CODIGO_DESPESA.find(d => d.codigo === item.codigoDespesa)?.nome}</span>}</td>
      <td>{dataTexto(item.dataExecucao)}</td>
      <td className="fat-num">{Number(item.quantidade).toLocaleString('pt-BR')}</td>
      <td className="fat-num">{brl(item.valorUnitario)}</td>
      <td className="fat-num">{brl(item.valorTotal)}</td>
      {glosavel && (
        <td>
          <span className="fat-glosa">
            <input aria-label={`Valor glosado de ${item.codigo}`} inputMode="decimal" value={glosa} onChange={e => setGlosa(e.target.value)} placeholder="0,00" />
            <input aria-label={`Código da glosa de ${item.codigo} (TUSS 38)`} inputMode="numeric" maxLength={4} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Cód." />
            <button type="button" className="btn btn-secondary btn-sm" disabled={ocupado} onClick={() => void executar(
              () => api(`/api/faturamento/contas/${contaId}/itens/${item.id}`, 'PATCH', { valorGlosado: Number((glosa || '0').replace(',', '.')), motivoGlosa: motivo || null }),
              'Glosa registrada.',
            )}>Salvar</button>
          </span>
        </td>
      )}
      {naLote && !glosavel && <td className="fat-num">{Number(item.valorGlosado) > 0 ? `${brl(item.valorGlosado)} (${item.motivoGlosa})` : '—'}</td>}
      {editavel && (
        <td>
          <button type="button" className="btn btn-secondary btn-sm ux-icon-btn" disabled={ocupado} aria-label={`Remover ${item.codigo}`} title="Remover"
            onClick={() => void executar(() => api(`/api/faturamento/contas/${contaId}/itens/${item.id}`, 'DELETE'), 'Item removido.')}>
            <i className="las la-trash" aria-hidden="true"></i>
          </button>
        </td>
      )}
    </tr>
  );
}
