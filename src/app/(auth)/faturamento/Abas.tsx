'use client';
import { useCallback, useEffect, useState } from 'react';
import { Badge, EmptyState, ErrorState, LoadingState, Panel } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { GUIAS_TISS, NOME_GUIA, UF_IBGE } from '@/lib/faturamento/dominios';
import { api, brl, competenciaTexto, dataTexto, erroTexto, NOME_STATUS_LOTE, TOM_STATUS_LOTE, type Convenio } from './comum';

type Lote = {
  id: string; tipo: 'TISS' | 'BPA' | 'AIH'; numero: number; competencia: string | null; tipoGuia: string | null; status: string;
  arquivoNome: string; quantidadeContas: number; valorTotal: string; protocolo: string | null; createdAt: string; geradoPorNome: string | null;
  operadora: { nome: string } | null;
};

const competenciaAtual = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);

export function AbaLotes({ convenios, podeGerir, onMudou }: { convenios: Convenio[]; podeGerir: boolean; onMudou: () => void }) {
  const [lotes, setLotes] = useState<Lote[] | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [operadoraId, setOperadoraId] = useState(convenios[0]?.id ?? '');
  const [tipoGuia, setTipoGuia] = useState<string>('CONSULTA');
  const [tipoSus, setTipoSus] = useState<'BPA' | 'AIH'>('BPA');
  const [competencia, setCompetencia] = useState(competenciaAtual);

  const carregar = useCallback(async () => {
    try { setLotes(await api<Lote[]>('/api/faturamento/lotes')); setErro(''); } catch (e) { setErro(erroTexto(e)); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial da aba
    void carregar();
  }, [carregar]);

  const executar = async (fn: () => Promise<unknown>, sucesso: string) => {
    setOcupado(true); setAviso(null);
    try { await fn(); setAviso({ tipo: 'sucesso', texto: sucesso }); await carregar(); onMudou(); }
    catch (e) { setAviso({ tipo: 'erro', texto: erroTexto(e) }); }
    finally { setOcupado(false); }
  };

  return (
    <>
      {aviso && <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`mod-aviso mod-aviso-${aviso.tipo}`}>{aviso.texto}</p>}
      {podeGerir && (
        <div className="fat-geradores">
          <Panel title="Lote TISS" icon="las la-file-code">
            <form onSubmit={e => { e.preventDefault(); void executar(() => api('/api/faturamento/lotes', 'POST', { tipo: 'TISS', operadoraId, tipoGuia }), 'Lote TISS gerado. Baixe o XML e envie no portal do convênio.'); }}>
              <div className="mod-form-grid">
                <div className="form-group">
                  <label htmlFor="lote-convenio">Convênio</label>
                  <select id="lote-convenio" value={operadoraId} onChange={e => setOperadoraId(e.target.value)} required>
                    {convenios.length === 0 && <option value="">Nenhum convênio</option>}
                    {convenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="lote-guia">Guia</label>
                  <select id="lote-guia" value={tipoGuia} onChange={e => setTipoGuia(e.target.value)}>
                    {GUIAS_TISS.map(g => <option key={g} value={g}>{NOME_GUIA[g]}</option>)}
                  </select>
                </div>
              </div>
              <p className="mod-nota">Entram as contas fechadas deste convênio e guia, até 100 por lote (TISS 4.03.00).</p>
              <button type="submit" className="btn btn-primary" disabled={ocupado || !operadoraId}><i className="las la-cogs" aria-hidden="true"></i> Gerar lote</button>
            </form>
          </Panel>
          <Panel title="Produção SUS" icon="las la-hospital">
            <form onSubmit={e => { e.preventDefault(); void executar(() => api('/api/faturamento/lotes', 'POST', { tipo: tipoSus, competencia: competencia.replace('-', '') }), `Arquivo ${tipoSus} gerado. Importe no ${tipoSus === 'BPA' ? 'BPA Magnético' : 'SISAIH01'}.`); }}>
              <div className="mod-form-grid">
                <div className="form-group">
                  <label htmlFor="lote-sus">Arquivo</label>
                  <select id="lote-sus" value={tipoSus} onChange={e => setTipoSus(e.target.value as 'BPA' | 'AIH')}>
                    <option value="BPA">BPA (ambulatorial)</option>
                    <option value="AIH">AIH (internação)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="lote-competencia">Competência</label>
                  <input id="lote-competencia" type="month" value={competencia} onChange={e => setCompetencia(e.target.value)} required />
                </div>
              </div>
              <p className="mod-nota">Entram as contas SUS fechadas da competência, no layout do DATASUS.</p>
              <button type="submit" className="btn btn-primary" disabled={ocupado || !competencia}><i className="las la-cogs" aria-hidden="true"></i> Gerar arquivo</button>
            </form>
          </Panel>
        </div>
      )}

      {erro ? <ErrorState message={erro} onRetry={() => void carregar()} /> : !lotes ? <LoadingState message="Carregando lotes..." /> : lotes.length === 0 ? (
        <EmptyState icon="las la-folder-open" message="Nenhum lote gerado ainda." />
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead><tr><th>Lote</th><th>Destino</th><th>Gerado em</th><th className="fat-num">Contas</th><th className="fat-num">Total</th><th>Status</th><th><span className="fat-oculto">Ações</span></th></tr></thead>
            <tbody>
              {lotes.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.tipo} nº {l.numero}</strong><span className="mod-secundario">{l.tipo === 'TISS' ? NOME_GUIA[l.tipoGuia as keyof typeof NOME_GUIA] : `Competência ${competenciaTexto(l.competencia)}`}</span></td>
                  <td>{l.operadora?.nome ?? 'SUS'}{l.protocolo && <span className="mod-secundario">Protocolo {l.protocolo}</span>}</td>
                  <td>{dataTexto(l.createdAt)}{l.geradoPorNome && <span className="mod-secundario">{l.geradoPorNome}</span>}</td>
                  <td className="fat-num">{l.quantidadeContas}</td>
                  <td className="fat-num">{brl(l.valorTotal)}</td>
                  <td><Badge tone={TOM_STATUS_LOTE[l.status] ?? 'neutral'}>{NOME_STATUS_LOTE[l.status] ?? l.status}</Badge></td>
                  <td>
                    <span className="ux-acoes">
                      {l.status !== 'CANCELADO' && (
                        <a className="btn btn-secondary btn-sm" href={`/api/faturamento/lotes/${l.id}?download=1`} download={l.arquivoNome}>
                          <i className="las la-download" aria-hidden="true"></i> Baixar
                        </a>
                      )}
                      {podeGerir && l.status === 'GERADO' && (
                        <>
                          <button type="button" className="btn btn-primary btn-sm" disabled={ocupado} onClick={() => {
                            const protocolo = window.prompt('Protocolo de recebimento (opcional):') ?? '';
                            void executar(() => api(`/api/faturamento/lotes/${l.id}`, 'PATCH', { acao: 'enviar', protocolo }), 'Envio registrado.');
                          }}>Marcar enviado</button>
                          <button type="button" className="btn btn-secondary btn-sm" disabled={ocupado} onClick={() => {
                            if (window.confirm(`Cancelar o lote ${l.tipo} nº ${l.numero}? As contas voltam para "Fechada".`)) void executar(() => api(`/api/faturamento/lotes/${l.id}`, 'PATCH', { acao: 'cancelar' }), 'Lote cancelado.');
                          }}>Cancelar</button>
                        </>
                      )}
                      {podeGerir && l.status === 'ENVIADO' && (
                        <button type="button" className="btn btn-secondary btn-sm" disabled={ocupado} onClick={() => void executar(() => api(`/api/faturamento/lotes/${l.id}`, 'PATCH', { acao: 'processar' }), 'Lote marcado como processado.')}>Processado</button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function AbaConvenios({ convenios, podeConfigurar, onMudou }: { convenios: Convenio[]; podeConfigurar: boolean; onMudou: () => void }) {
  const [editando, setEditando] = useState<Partial<Convenio> | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!editando) return;
    setSalvando(true); setErro('');
    try {
      const corpo = { nome: editando.nome, codigoAns: editando.codigoAns, cnpj: editando.cnpj || null, codigoPrestador: editando.codigoPrestador || null, status: editando.status || 'ATIVO' };
      await api(editando.id ? `/api/faturamento/convenios/${editando.id}` : '/api/faturamento/convenios', editando.id ? 'PUT' : 'POST', corpo);
      setEditando(null);
      onMudou();
    } catch (e) { setErro(erroTexto(e)); } finally { setSalvando(false); }
  };
  const campo = (nome: keyof Convenio, rotulo: string, extra: { max?: number; dica?: string; numerico?: boolean } = {}) => (
    <div className="form-group">
      <label htmlFor={`conv-${nome}`}>{rotulo}</label>
      <input id={`conv-${nome}`} value={(editando?.[nome] as string | null) ?? ''} maxLength={extra.max} placeholder={extra.dica}
        inputMode={extra.numerico ? 'numeric' : undefined} onChange={e => setEditando(c => ({ ...c, [nome]: e.target.value }))} />
    </div>
  );

  return (
    <>
      {podeConfigurar && (
        <div className="mod-acoes fat-topo-aba">
          <button type="button" className="btn btn-primary" onClick={() => setEditando({ status: 'ATIVO' })}><i className="las la-plus" aria-hidden="true"></i> Novo convênio</button>
        </div>
      )}
      {convenios.length === 0 ? (
        <EmptyState icon="las la-handshake" message={podeConfigurar ? 'Cadastre o primeiro convênio com o registro ANS da operadora.' : 'Nenhum convênio cadastrado. Peça ao gestor do hospital.'} />
      ) : (
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead><tr><th>Convênio</th><th>Registro ANS</th><th>Código do hospital</th><th>Padrão</th><th>Status</th>{podeConfigurar && <th><span className="fat-oculto">Ações</span></th>}</tr></thead>
            <tbody>
              {convenios.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.nome}</strong>{c.cnpj && <span className="mod-secundario">CNPJ {c.cnpj}</span>}</td>
                  <td className="fat-codigo">{c.codigoAns}</td>
                  <td>{c.codigoPrestador ?? <span className="ux-mudo">Usa o CNPJ do hospital</span>}</td>
                  <td>TISS {c.versaoTiss}</td>
                  <td><Badge tone={c.status === 'ATIVO' ? 'success' : 'neutral'}>{c.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</Badge></td>
                  {podeConfigurar && (
                    <td><button type="button" className="btn btn-secondary btn-sm ux-icon-btn" aria-label={`Editar ${c.nome}`} title="Editar" onClick={() => setEditando(c)}><i className="las la-edit" aria-hidden="true"></i></button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editando && (
        <Modal title={editando.id ? 'Editar convênio' : 'Novo convênio'} icon="las la-handshake" onClose={() => setEditando(null)} busy={salvando}>
          {erro && <p role="alert" className="mod-aviso mod-aviso-erro">{erro}</p>}
          <div className="mod-form-grid">
            {campo('nome', 'Nome', { max: 120 })}
            {campo('codigoAns', 'Registro ANS', { max: 6, dica: '6 dígitos', numerico: true })}
            {campo('cnpj', 'CNPJ da operadora', { max: 18 })}
            {campo('codigoPrestador', 'Código do hospital no convênio', { max: 14, dica: 'Sem ele, vai o CNPJ' })}
            <div className="form-group">
              <label htmlFor="conv-status">Status</label>
              <select id="conv-status" value={editando.status ?? 'ATIVO'} onChange={e => setEditando(c => ({ ...c, status: e.target.value }))}>
                <option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option>
              </select>
            </div>
          </div>
          <div className="ui-modal-foot">
            <button type="button" className="btn btn-secondary" onClick={() => setEditando(null)} disabled={salvando}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={() => void salvar()} disabled={salvando}><i className="las la-save" aria-hidden="true"></i> Salvar</button>
          </div>
        </Modal>
      )}
    </>
  );
}

type Config = {
  cnes: string | null; municipioIbge: string | null; uf: string | null; orgaoDestinoNome: string | null; orgaoDestinoTipo: string;
  orgaoOrigemNome: string | null; orgaoOrigemSigla: string | null; orgaoEmissorAih: string | null; hospital: { nome: string; cnpj: string } | null;
};

export function AbaUnidade({ podeConfigurar }: { podeConfigurar: boolean }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const carregar = useCallback(async () => {
    try { setConfig(await api<Config>('/api/faturamento/config')); setErro(''); } catch (e) { setErro(erroTexto(e)); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial da aba
    void carregar();
  }, [carregar]);
  if (erro) return <ErrorState message={erro} onRetry={() => void carregar()} />;
  if (!config) return <LoadingState message="Carregando dados da unidade..." />;

  const mudar = (k: keyof Config, v: string) => setConfig(c => (c ? { ...c, [k]: v } : c));
  const campo = (k: keyof Config, rotulo: string, extra: { max?: number; dica?: string; numerico?: boolean } = {}) => (
    <div className="form-group">
      <label htmlFor={`cfg-${k}`}>{rotulo}</label>
      <input id={`cfg-${k}`} value={(config[k] as string | null) ?? ''} maxLength={extra.max} placeholder={extra.dica}
        inputMode={extra.numerico ? 'numeric' : undefined} onChange={e => mudar(k, e.target.value)} />
    </div>
  );
  const salvar = async () => {
    setSalvando(true); setAviso(null);
    try {
      const { hospital: _h, ...corpo } = config;
      void _h;
      const vazio = (v: unknown) => (v === '' ? null : v);
      await api('/api/faturamento/config', 'PUT', Object.fromEntries(Object.entries(corpo).filter(([k]) => k !== 'updatedAt').map(([k, v]) => [k, vazio(v)])));
      setAviso({ tipo: 'sucesso', texto: 'Dados da unidade salvos.' });
      await carregar();
    } catch (e) { setAviso({ tipo: 'erro', texto: erroTexto(e) }); } finally { setSalvando(false); }
  };

  return (
    <Panel title="Dados da unidade para o faturamento" icon="las la-hospital-alt">
      {aviso && <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`mod-aviso mod-aviso-${aviso.tipo}`}>{aviso.texto}</p>}
      <p className="mod-nota">{config.hospital?.nome} · CNPJ {config.hospital?.cnpj}. O CNES vai no XML TISS e nos arquivos do SUS.</p>
      <form onSubmit={e => { e.preventDefault(); void salvar(); }}>
        <fieldset disabled={!podeConfigurar || salvando} className="fat-grupo">
          <legend>Estabelecimento</legend>
          <div className="mod-form-grid">
            {campo('cnes', 'CNES', { max: 7, dica: '7 dígitos', numerico: true })}
            {campo('municipioIbge', 'Município (IBGE)', { max: 6, dica: '6 dígitos', numerico: true })}
            <div className="form-group">
              <label htmlFor="cfg-uf">UF</label>
              <select id="cfg-uf" value={config.uf ?? ''} onChange={e => mudar('uf', e.target.value)}>
                <option value="">Não informada</option>
                {Object.keys(UF_IBGE).sort().map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </fieldset>
        <fieldset disabled={!podeConfigurar || salvando} className="fat-grupo">
          <legend>BPA e AIH</legend>
          <div className="mod-form-grid">
            {campo('orgaoOrigemNome', 'Órgão de origem', { max: 30, dica: 'Padrão: nome do hospital' })}
            {campo('orgaoOrigemSigla', 'Sigla de origem', { max: 6 })}
            {campo('orgaoDestinoNome', 'Órgão de destino', { max: 40, dica: 'Ex.: Secretaria Municipal de Saúde' })}
            <div className="form-group">
              <label htmlFor="cfg-destino-tipo">Gestão</label>
              <select id="cfg-destino-tipo" value={config.orgaoDestinoTipo} onChange={e => mudar('orgaoDestinoTipo', e.target.value)}>
                <option value="M">Municipal</option><option value="E">Estadual</option>
              </select>
            </div>
            {campo('orgaoEmissorAih', 'Órgão emissor da AIH', { max: 10, dica: 'Portaria SAS 567/2005' })}
          </div>
        </fieldset>
        {podeConfigurar ? (
          <button type="submit" className="btn btn-primary" disabled={salvando}><i className="las la-save" aria-hidden="true"></i> Salvar</button>
        ) : <p className="mod-nota">Só o gestor do hospital altera estes dados.</p>}
      </form>
    </Panel>
  );
}
