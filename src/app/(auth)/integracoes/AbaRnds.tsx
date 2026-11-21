'use client';
import { useCallback, useEffect, useState } from 'react';
import { Badge, EmptyState, ErrorState, LoadingState, Panel, StatCard, StatGrid } from '@/components/ui';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { api, dataHoraTexto, erroTexto, NOME_AMBIENTE, NOME_STATUS, NOME_TIPO, TOM_STATUS, type Opcao, type StatusEnvio } from './comum';

type Estado = {
  ambiente: 'SIMULACAO' | 'HOMOLOGACAO' | 'PRODUCAO'; identificadorSolicitante: string | null; cnsRequisitante: string | null;
  cnsRequisitanteInformado: boolean; envioAutomatico: boolean; cnes: string | null; uf: string | null; certificadoConfigurado: boolean;
  pendencias: string[]; variaveisCertificado: string[] | null; endereco: { auth: string; ehr: string | null } | null;
  fila: Partial<Record<StatusEnvio, number>>;
};
type Item = {
  id: string; tipo: string; status: StatusEnvio; tentativas: number; ultimoErro: string | null; problemas: { caminho: string; mensagem: string }[] | null;
  idRnds: string | null; updatedAt: string; paciente: string | null; descricao: string; data: string | null;
};
type Aviso = { tipo: 'erro' | 'sucesso' | 'atencao'; texto: string } | null;

export function AbaRnds({ podeGerir }: { podeGerir: boolean }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [itens, setItens] = useState<Item[] | null>(null);
  const [filtro, setFiltro] = useState<StatusEnvio | ''>('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState<Aviso>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [previa, setPrevia] = useState<{ documento?: unknown; problemas?: Item['problemas']; erro?: string } | null>(null);
  const [exame, setExame] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [e, f] = await Promise.all([
        api<Estado>('/api/integracoes/rnds'),
        api<Item[]>(`/api/integracoes/rnds/fila${filtro ? `?status=${filtro}` : ''}`),
      ]);
      setEstado(e); setItens(f); setErro('');
    } catch (e) { setErro(erroTexto(e)); }
  }, [filtro]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial e troca de filtro
    void carregar();
  }, [carregar]);

  const agir = async (chave: string, fn: () => Promise<string | NonNullable<Aviso>>) => {
    setOcupado(chave); setAviso(null);
    try { const r = await fn(); setAviso(typeof r === 'string' ? { tipo: 'sucesso', texto: r } : r); await carregar(); } catch (e) { setAviso({ tipo: 'erro', texto: erroTexto(e) }); } finally { setOcupado(null); }
  };
  const processar = () => agir('processar', async () => {
    const r = await api<{ processados: number; resumo: Record<string, number> }>('/api/integracoes/rnds/fila', 'POST', { acao: 'processar' });
    if (!r.processados) return 'Nenhum item pendente.';
    const partes = (['ENVIADO', 'SIMULADO', 'ERRO'] as const).filter(s => r.resumo[s]).map(s => `${r.resumo[s]} ${NOME_STATUS[s].toLowerCase()}`);
    const texto = `${r.processados} processado${r.processados > 1 ? 's' : ''}: ${partes.join(', ')}.${r.resumo.ERRO ? ' Veja o motivo de cada erro na fila.' : ''}`;
    return { tipo: r.resumo.ERRO ? 'atencao' : 'sucesso', texto };
  });
  const enviar = (id: string) => agir(id, async () => {
    const r = await api<{ status: StatusEnvio; erro?: string }>(`/api/integracoes/rnds/fila/${id}`, 'POST', { acao: 'enviar' });
    if (r.status === 'ERRO') throw new Error(r.erro ?? 'Não passou na validação.');
    return r.status === 'ENVIADO' ? 'Enviado à RNDS.' : 'Validado nos perfis oficiais (simulação, nada foi enviado).';
  });
  const abrirPrevia = async (id: string) => {
    setOcupado(id);
    try { setPrevia(await api(`/api/integracoes/rnds/fila/${id}`)); } catch (e) { setAviso({ tipo: 'erro', texto: erroTexto(e) }); } finally { setOcupado(null); }
  };

  if (erro) return <ErrorState message={erro} onRetry={() => void carregar()} />;
  if (!estado || !itens) return <LoadingState message="Carregando a integração com a RNDS..." />;
  const n = (s: StatusEnvio) => estado.fila[s] ?? 0;

  return (
    <>
      {aviso && <p role={aviso.tipo === 'sucesso' ? 'status' : 'alert'} className={`mod-aviso mod-aviso-${aviso.tipo}`}>{aviso.texto}</p>}
      <StatGrid>
        <StatCard icon="las la-hourglass-half" value={n('PENDENTE')} label="Pendentes" tone="warning" />
        <StatCard icon="las la-exclamation-triangle" value={n('ERRO')} label="Com erro" tone="danger" alerta={n('ERRO') > 0} />
        <StatCard icon="las la-check-double" value={n('SIMULADO')} label="Validados" tone="info" hint="Validados nos perfis oficiais no modo simulação, sem envio" />
        <StatCard icon="las la-cloud-upload-alt" value={n('ENVIADO')} label="Enviados" tone="success" />
      </StatGrid>

      <Configuracao estado={estado} podeGerir={podeGerir} onSalvo={() => void carregar()} />

      <Panel
        title="Fila de envio"
        icon="las la-stream"
        actions={podeGerir ? (
          <div className="mod-acoes">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExame(true)}><i className="las la-vial" aria-hidden="true"></i> Exame</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void processar()} disabled={!!ocupado || n('PENDENTE') === 0}>
              <i className="las la-play" aria-hidden="true"></i> {ocupado === 'processar' ? 'Processando...' : 'Processar pendentes'}
            </button>
          </div>
        ) : undefined}
      >
        <div className="mod-filtros">
          <select aria-label="Status do envio" value={filtro} onChange={e => setFiltro(e.target.value as StatusEnvio | '')}>
            <option value="">Todos os status</option>
            {(Object.keys(NOME_STATUS) as StatusEnvio[]).map(s => <option key={s} value={s}>{NOME_STATUS[s]}</option>)}
          </select>
        </div>
        {itens.length === 0 ? (
          <EmptyState icon="las la-stream" message={filtro ? 'Nenhum item com este status.' : 'A fila está vazia. Cada dose registrada em Vacinação entra aqui.'} />
        ) : (
          <div className="tabela-wrapper int-fila">
            <table className="tabela">
              <thead><tr><th>Registro</th><th>Paciente</th><th>Situação</th><th>Atualizado</th>{podeGerir && <th><span className="int-oculto">Ações</span></th>}</tr></thead>
              <tbody>
                {itens.map(i => (
                  <tr key={i.id}>
                    <td>
                      <strong>{NOME_TIPO[i.tipo] ?? i.tipo}</strong>
                      <span className="mod-secundario">{i.descricao}{i.data ? ` · ${dataHoraTexto(i.data)}` : ''}</span>
                    </td>
                    <td>{i.paciente ?? '—'}</td>
                    <td>
                      <Badge tone={TOM_STATUS[i.status]}>{NOME_STATUS[i.status]}</Badge>
                      {i.ultimoErro && <span className="mod-secundario int-erro">{i.ultimoErro}</span>}
                      {i.idRnds && <span className="mod-secundario">Id RNDS {i.idRnds}</span>}
                    </td>
                    <td className="int-num">{dataHoraTexto(i.updatedAt)}<span className="mod-secundario">{i.tentativas} tentativa{i.tentativas === 1 ? '' : 's'}</span></td>
                    {podeGerir && (
                      <td>
                        <div className="mod-acoes-tabela">
                          <button type="button" className="btn btn-secondary btn-xs" onClick={() => void abrirPrevia(i.id)} disabled={!!ocupado}>Documento</button>
                          <button type="button" className="btn btn-primary btn-xs" onClick={() => void enviar(i.id)} disabled={!!ocupado}>
                            {ocupado === i.id ? 'Enviando...' : i.status === 'ENVIADO' ? 'Retificar' : estado.ambiente === 'SIMULACAO' ? 'Validar' : 'Enviar'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {previa && (
        <Modal title="Documento FHIR" icon="las la-file-code" size="lg" onClose={() => setPrevia(null)}>
          {previa.erro ? <p role="alert" className="mod-aviso mod-aviso-erro">{previa.erro}</p> : previa.problemas?.length ? (
            <>
              <p role="alert" className="mod-aviso mod-aviso-erro">Não passa no perfil oficial da RNDS:</p>
              <ul className="int-problemas">{previa.problemas.map((p, k) => <li key={k}><code>{p.caminho}</code> {p.mensagem}</li>)}</ul>
            </>
          ) : <p role="status" className="mod-aviso mod-aviso-sucesso">Válido nos perfis oficiais da RNDS.</p>}
          {previa.documento !== undefined && <pre className="int-json" tabIndex={0}>{JSON.stringify(previa.documento, null, 2)}</pre>}
          <ModalActions><button type="button" className="btn btn-secondary" onClick={() => setPrevia(null)}>Fechar</button></ModalActions>
        </Modal>
      )}
      {exame && <NovoExame onFechar={() => setExame(false)} onCriado={() => { setExame(false); setAviso({ tipo: 'sucesso', texto: 'Exame colocado na fila.' }); void carregar(); }} />}
    </>
  );
}

function Configuracao({ estado, podeGerir, onSalvo }: { estado: Estado; podeGerir: boolean; onSalvo: () => void }) {
  const [form, setForm] = useState({ ambiente: estado.ambiente, identificadorSolicitante: estado.identificadorSolicitante ?? '', cnsRequisitante: '', envioAutomatico: estado.envioAutomatico });
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const salvar = async () => {
    setSalvando(true); setAviso(null);
    try {
      const { cnsRequisitante, ...resto } = form;
      await api('/api/integracoes/rnds', 'PUT', { ...resto, ...(cnsRequisitante ? { cnsRequisitante } : {}) });
      setAviso({ tipo: 'sucesso', texto: 'Configuração salva.' });
      setForm(f => ({ ...f, cnsRequisitante: '' }));
      onSalvo();
    } catch (e) { setAviso({ tipo: 'erro', texto: erroTexto(e) }); } finally { setSalvando(false); }
  };

  return (
    <Panel title="Configuração" icon="las la-plug">
      {aviso && <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`mod-aviso mod-aviso-${aviso.tipo}`}>{aviso.texto}</p>}
      {estado.pendencias.length > 0 && (
        <div className="mod-aviso mod-aviso-atencao" role="status">
          <strong>Falta para {estado.ambiente === 'SIMULACAO' ? 'validar' : 'enviar'}:</strong>
          <ul className="int-pendencias">{estado.pendencias.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      <dl className="int-dados">
        <div><dt>CNES</dt><dd>{estado.cnes ?? 'Não cadastrado'}</dd></div>
        <div><dt>UF</dt><dd>{estado.uf ?? '—'}</dd></div>
        <div><dt>Certificado digital</dt><dd>{estado.certificadoConfigurado ? 'Configurado' : 'Não configurado'}</dd></div>
        {estado.endereco && <div><dt>Servidor</dt><dd>{estado.endereco.ehr ?? 'Informe a UF'}</dd></div>}
      </dl>
      {!estado.certificadoConfigurado && estado.variaveisCertificado && (
        <p className="mod-nota">O certificado ICP-Brasil (e-CNPJ) fica fora do banco: o responsável técnico grava o arquivo .pfx em base64 em <code>{estado.variaveisCertificado[0]}</code> e a senha em <code>{estado.variaveisCertificado[1]}</code>, nas variáveis de ambiente do servidor.</p>
      )}
      <form onSubmit={e => { e.preventDefault(); void salvar(); }}>
        <fieldset disabled={!podeGerir || salvando} className="int-grupo">
          <legend className="int-oculto">Dados do credenciamento</legend>
          <div className="mod-form-grid">
            <div className="form-group">
              <label htmlFor="rnds-ambiente">Ambiente</label>
              <select id="rnds-ambiente" value={form.ambiente} onChange={e => setForm(f => ({ ...f, ambiente: e.target.value as Estado['ambiente'] }))}>
                {Object.entries(NOME_AMBIENTE).map(([v, nome]) => <option key={v} value={v}>{nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="rnds-solicitante">Identificador do solicitante</label>
              <input id="rnds-solicitante" inputMode="numeric" maxLength={20} placeholder="Dado pela RNDS" value={form.identificadorSolicitante}
                onChange={e => setForm(f => ({ ...f, identificadorSolicitante: e.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="rnds-cns">CNS do requisitante</label>
              <input id="rnds-cns" inputMode="numeric" maxLength={18} autoComplete="off" placeholder={estado.cnsRequisitante ?? '15 dígitos'} value={form.cnsRequisitante}
                onChange={e => setForm(f => ({ ...f, cnsRequisitante: e.target.value }))} />
            </div>
            <div className="form-group int-check">
              <label><input type="checkbox" checked={form.envioAutomatico} onChange={e => setForm(f => ({ ...f, envioAutomatico: e.target.checked }))} /> Pôr cada dose na fila</label>
            </div>
          </div>
        </fieldset>
        {podeGerir && <button type="submit" className="btn btn-primary" disabled={salvando}><i className="las la-save" aria-hidden="true"></i> Salvar</button>}
      </form>
    </Panel>
  );
}

type TabelasExame = Record<'codigoExame' | 'categoria' | 'resultado' | 'amostra' | 'suspeita', Opcao[]>;
type ExameLiberado = { id: string; nome: string; liberadoEm: string | null; paciente: { nome: string } };

function NovoExame({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [tabelas, setTabelas] = useState<TabelasExame | null>(null);
  const [exames, setExames] = useState<ExameLiberado[] | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ categoria: '0202', suspeita: 'B342', valorReferencia: 'Não detectável' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    Promise.all([api<TabelasExame>('/api/vacinas/tabelas?tipo=exame'), api<{ itens: ExameLiberado[] }>('/api/exames?status=CONCLUIDO&limite=100')])
      .then(([t, e]) => { setTabelas(t); setExames((e.itens ?? []).filter(x => x.liberadoEm)); })
      .catch(e => setErro(erroTexto(e)));
  }, []);
  const mudar = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const lista = (k: keyof TabelasExame, rotulo: string, largo = false) => (
    <div className={`form-group${largo ? ' int-largo' : ''}`}>
      <label htmlFor={`rel-${k}`}>{rotulo}</label>
      <select id={`rel-${k}`} required value={form[k] ?? ''} onChange={e => mudar(k, e.target.value)}>
        <option value="">Selecione</option>
        {tabelas?.[k].map(o => <option key={o.codigo} value={o.codigo}>{o.codigo} · {o.nome}</option>)}
      </select>
    </div>
  );
  const salvar = async () => {
    setSalvando(true); setErro('');
    try {
      await api('/api/integracoes/rnds/fila', 'POST', { acao: 'enfileirar-exame', ...form, coletadoEm: form.coletadoEm ? new Date(form.coletadoEm).toISOString() : '' });
      onCriado();
    } catch (e) { setErro(erroTexto(e)); } finally { setSalvando(false); }
  };

  return (
    <Modal title="Exame para a RNDS" icon="las la-vial" size="lg" onClose={onFechar} busy={salvando}>
      <p className="mod-nota">A RNDS recebe resultado de exame laboratorial de COVID-19 e Monkeypox. Escolha um exame com laudo liberado e os códigos oficiais.</p>
      {erro && <p role="alert" className="mod-aviso mod-aviso-erro">{erro}</p>}
      {!tabelas || !exames ? <LoadingState message="Carregando exames e tabelas..." /> : (
        <form id="form-rel" onSubmit={e => { e.preventDefault(); void salvar(); }}>
          <div className="mod-form-grid">
            <div className="form-group int-largo">
              <label htmlFor="rel-exame">Exame liberado</label>
              <select id="rel-exame" required value={form.exameId ?? ''} onChange={e => mudar('exameId', e.target.value)}>
                <option value="">{exames.length ? 'Selecione' : 'Nenhum exame liberado'}</option>
                {exames.map(x => <option key={x.id} value={x.id}>{x.paciente.nome} · {x.nome}</option>)}
              </select>
            </div>
            {lista('codigoExame', 'Exame (código LOINC)', true)}
            {lista('resultado', 'Resultado')}
            {lista('amostra', 'Amostra')}
            {lista('categoria', 'Categoria')}
            {lista('suspeita', 'Suspeita')}
            <div className="form-group">
              <label htmlFor="rel-coleta">Coleta</label>
              <input id="rel-coleta" type="datetime-local" required value={form.coletadoEm ?? ''} onChange={e => mudar('coletadoEm', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="rel-metodo">Método</label>
              <input id="rel-metodo" required maxLength={200} placeholder="Ex.: RT-PCR em tempo real" value={form.metodo ?? ''} onChange={e => mudar('metodo', e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="rel-ref">Valor de referência</label>
              <input id="rel-ref" required maxLength={200} value={form.valorReferencia ?? ''} onChange={e => mudar('valorReferencia', e.target.value)} />
            </div>
          </div>
        </form>
      )}
      <ModalActions>
        <button type="button" className="btn btn-secondary" onClick={onFechar} disabled={salvando}>Cancelar</button>
        <button type="submit" form="form-rel" className="btn btn-primary" disabled={salvando || !tabelas}><i className="las la-plus" aria-hidden="true"></i> Pôr na fila</button>
      </ModalActions>
    </Modal>
  );
}
