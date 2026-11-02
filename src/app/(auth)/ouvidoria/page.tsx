'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatCard, StatGrid, Tabs, type Tone } from '@/components/ui';
import { pode } from '@/lib/permissions';
import './ouvidoria.css';

const ABAS = [
  { id: 'registrar', label: 'Registrar', icon: 'las la-plus-circle' },
  { id: 'lista', label: 'Manifestações', icon: 'las la-list' },
] as const;

const STATUS_ROTULO: Record<string, string> = {
  ABERTO: 'Pendente', EM_ANALISE: 'Em análise', RESPONDIDA: 'Respondida', ENCERRADA: 'Encerrada',
};
const TOM_TIPO: Record<string, Tone> = { Elogio: 'success', Sugestão: 'info', Reclamação: 'warning', Denúncia: 'danger' };

interface Manifestacao {
  id: string;
  protocolo: string;
  tipo: string;
  setor: string;
  paciente: string;
  mensagem: string;
  respostas: string[];
  status: string;
  prazo: string;
  createdAt: string;
}

const encerrada = (status: string) => status === 'RESPONDIDA' || status === 'ENCERRADA';
const formatarPrazo = (prazo: string) => {
  const data = new Date(`${prazo}T00:00:00`);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
};
const vencida = (m: Manifestacao) => {
  const data = new Date(`${m.prazo}T23:59:59`);
  return !encerrada(m.status) && !Number.isNaN(data.getTime()) && data.getTime() < Date.now();
};

export default function OuvidoriaPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = pode(session?.user?.cargo, 'admin:acesso');
  const [tabAtiva, setTabAtiva] = useState<(typeof ABAS)[number]['id']>('registrar');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [protocoloCriado, setProtocoloCriado] = useState<{ protocolo: string; anonimo: boolean } | null>(null);
  const [manifestacoes, setManifestacoes] = useState<Manifestacao[]>([]);
  const [form, setForm] = useState({ tipo: 'Elogio', nome: '', anonimo: false, setor: 'Geral', descricao: '' });

  const [detalhe, setDetalhe] = useState<Manifestacao | null>(null);
  const [textoResposta, setTextoResposta] = useState('');
  const [statusNovo, setStatusNovo] = useState('RESPONDIDA');
  const [respondendo, setRespondendo] = useState(false);
  const [erroResposta, setErroResposta] = useState('');

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ouvidoria', { cache: 'no-store' });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof (data as { error?: unknown })?.error === 'string' ? (data as { error: string }).error : 'Não foi possível carregar as manifestações.');
      if (!Array.isArray(data)) throw new Error('A resposta da ouvidoria está inválida.');
      setManifestacoes(data as Manifestacao[]);
      setErroCarga('');
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : 'Não foi possível carregar as manifestações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus !== 'authenticated') {
      void Promise.resolve().then(() => { setLoading(false); });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
      setErroCarga('É necessário entrar novamente para acessar a ouvidoria.');
      return;
    }
    void carregarDados();
  }, [sessionStatus, carregarDados]);

  const registrarManifestacao = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (salvando) return;
    setErroForm('');
    if (!form.descricao.trim()) { setErroForm('Descreva a manifestação.'); return; }
    if (!form.anonimo && !form.nome.trim()) { setErroForm('Informe seu nome ou marque a manifestação como anônima.'); return; }

    setSalvando(true);
    try {
      const res = await fetch('/api/ouvidoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: form.tipo, setor: form.setor, anonimo: form.anonimo,
          nome: form.anonimo ? '' : form.nome.trim(), mensagem: form.descricao.trim(),
        }),
      });
      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof resposta?.error === 'string' ? resposta.error : 'Não foi possível registrar a manifestação.');
      setProtocoloCriado({ protocolo: resposta.protocolo, anonimo: form.anonimo });
      setForm({ tipo: 'Elogio', nome: '', anonimo: false, setor: 'Geral', descricao: '' });
      void carregarDados();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Não foi possível registrar a manifestação.');
    } finally {
      setSalvando(false);
    }
  };

  const abrirDetalhe = (m: Manifestacao) => {
    setDetalhe(m);
    setTextoResposta('');
    setStatusNovo(m.status === 'ABERTO' ? 'EM_ANALISE' : m.status);
    setErroResposta('');
  };

  const salvarResposta = async () => {
    if (!detalhe || respondendo) return;
    if (statusNovo === 'RESPONDIDA' && !textoResposta.trim()) { setErroResposta('Escreva a resposta antes de marcar como respondida.'); return; }
    if (!await confirm(statusNovo === 'RESPONDIDA' ? 'Registrar esta resposta e marcar a manifestação como respondida?' : 'Salvar a alteração desta manifestação?')) return;
    setRespondendo(true);
    setErroResposta('');
    try {
      const res = await fetch(`/api/ouvidoria/${detalhe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusNovo, resposta: textoResposta.trim() }),
      });
      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof resposta?.error === 'string' ? resposta.error : 'Não foi possível atualizar a manifestação.');
      setDetalhe(null);
      await carregarDados();
    } catch (e) {
      setErroResposta(e instanceof Error ? e.message : 'Não foi possível atualizar a manifestação.');
    } finally {
      setRespondendo(false);
    }
  };

  useEffect(() => {
    if (!detalhe) return;
    const fechar = (evento: KeyboardEvent) => { if (evento.key === 'Escape' && !respondendo) setDetalhe(null); };
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, [detalhe, respondendo]);

  const pendentes = manifestacoes.filter(m => !encerrada(m.status)).length;
  const respondidas = manifestacoes.filter(m => encerrada(m.status)).length;
  const atrasadas = manifestacoes.filter(vencida).length;

  if (sessionStatus === 'loading' || (loading && manifestacoes.length === 0 && !erroCarga)) return <LoadingState message="Carregando manifestações..." />;

  return (
    <div className="conteudo">
      <div className="ouv-container">
        <PageHeader
          icon="las la-headset"
          title="Ouvidoria"
          subtitle="Canal de manifestações: elogios, sugestões, reclamações e denúncias. O prazo de resposta é de 30 dias."
          actions={<button type="button" className="btn btn-success" onClick={() => { setProtocoloCriado(null); setTabAtiva('registrar'); }}><i className="las la-plus-circle" aria-hidden="true"></i> Nova manifestação</button>}
        />

        {erroCarga && <ErrorState message={erroCarga} onRetry={() => void carregarDados()} />}

        <StatGrid>
          <StatCard icon="las la-inbox" tone="info" value={manifestacoes.length} label="Total de manifestações" />
          <StatCard icon="las la-hourglass-half" tone="warning" value={pendentes} label="Pendentes" />
          <StatCard icon="las la-check-circle" tone="success" value={respondidas} label="Respondidas" />
          {isAdmin && <StatCard icon="las la-exclamation-circle" tone="danger" value={atrasadas} label="Fora do prazo" />}
        </StatGrid>

        <Tabs label="Seções da ouvidoria" tabs={ABAS} active={tabAtiva} onChange={setTabAtiva} />

        {tabAtiva === 'registrar' && (
          <Panel title="Registrar manifestação" icon="las la-headset">
            {protocoloCriado && (
              <p role="status" className="alert-sucesso" style={{ marginBottom: 16 }}>
                Manifestação registrada. Protocolo: <strong>{protocoloCriado.protocolo}</strong>.
                {protocoloCriado.anonimo ? ' Como ela é anônima, não fica ligada à sua conta: anote o protocolo, que é a única forma de acompanhá-la.' : ''}
              </p>
            )}
            {erroForm && <p role="alert" className="alert-erro" style={{ marginBottom: 16 }}>{erroForm}</p>}
            <form onSubmit={registrarManifestacao}>
              <div className="form-grid">
                <div className="form-grupo">
                  <label htmlFor="ouv-tipo">Tipo *</label>
                  <select id="ouv-tipo" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option>Elogio</option><option>Sugestão</option><option>Reclamação</option><option>Denúncia</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="ouv-setor">Setor relacionado</label>
                  <select id="ouv-setor" value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })}>
                    <option>Geral</option><option>Emergência</option><option>UTI</option><option>Enfermaria</option><option>Recepção</option><option>Farmácia</option>
                  </select>
                </div>
                <div className="form-grupo">
                  <label htmlFor="ouv-nome">Seu nome {form.anonimo ? '(não será gravado)' : '*'}</label>
                  <input id="ouv-nome" type="text" maxLength={200} value={form.anonimo ? '' : form.nome} disabled={form.anonimo} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="form-grupo" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label htmlFor="ouv-anonimo" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input id="ouv-anonimo" type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={form.anonimo} onChange={e => setForm({ ...form, anonimo: e.target.checked })} />
                    Enviar de forma anônima
                  </label>
                </div>
                <div className="form-grupo full">
                  <label htmlFor="ouv-descricao">Descrição *</label>
                  <textarea id="ouv-descricao" rows={4} maxLength={5000} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva sua manifestação..."></textarea>
                </div>
              </div>
              <button type="submit" className="btn btn-success btn-enviar-ouv" disabled={salvando}>
                <i className="las la-save" aria-hidden="true"></i> {salvando ? 'Enviando...' : 'Enviar manifestação'}
              </button>
            </form>
          </Panel>
        )}

        {tabAtiva === 'lista' && (manifestacoes.length === 0
          ? <EmptyState message="Nenhuma manifestação registrada." />
          : (
            <Panel>
              <div className="tabela-wrapper">
                <table className="tabela">
                  <thead><tr><th>Protocolo</th><th>Data</th><th>Tipo</th><th>Identificação</th><th>Setor</th><th>Prazo</th><th>Status</th><th>Ações</th></tr></thead>
                  <tbody>
                    {manifestacoes.map(m => (
                      <tr key={m.id}>
                        <td><strong>{m.protocolo}</strong></td>
                        <td>{new Date(m.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td><Badge tone={TOM_TIPO[m.tipo] ?? 'neutral'}>{m.tipo}</Badge></td>
                        <td>{m.paciente}</td>
                        <td>{m.setor}</td>
                        <td>{formatarPrazo(m.prazo)}{vencida(m) && <> <Badge tone="danger">Vencido</Badge></>}</td>
                        <td><Badge tone={encerrada(m.status) ? 'success' : 'warning'}>{STATUS_ROTULO[m.status] ?? m.status}</Badge></td>
                        <td><button type="button" className="btn btn-primary btn-sm" onClick={() => abrirDetalhe(m)}>{isAdmin ? 'Abrir e responder' : 'Ver'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
      </div>

      {detalhe && (
        <div className="modal-overlay show" onMouseDown={e => { if (e.target === e.currentTarget && !respondendo) setDetalhe(null); }}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="ouv-detalhe-titulo" style={{ color: 'var(--ui-text)' }}>
            <h2 id="ouv-detalhe-titulo" style={{ fontSize: 20, marginBottom: 12, color: 'var(--ui-text)' }}>Manifestação {detalhe.protocolo}</h2>
            <p style={{ marginBottom: 8 }}><strong>{detalhe.tipo}</strong> · {detalhe.setor} · {detalhe.paciente}</p>
            <p style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>{detalhe.mensagem}</p>
            {detalhe.respostas.map((resposta, indice) => (
              <div key={indice} style={{ background: 'var(--ui-surface-muted)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <strong>Resposta da ouvidoria</strong>
                <p style={{ whiteSpace: 'pre-wrap' }}>{resposta}</p>
              </div>
            ))}
            {isAdmin && !encerrada(detalhe.status) && (
              <>
                <div className="form-group">
                  <label htmlFor="ouv-resposta">Resposta</label>
                  <textarea id="ouv-resposta" rows={4} maxLength={4000} value={textoResposta} onChange={e => setTextoResposta(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="ouv-status">Situação</label>
                  <select id="ouv-status" value={statusNovo} onChange={e => setStatusNovo(e.target.value)}>
                    <option value="EM_ANALISE">Em análise</option>
                    <option value="RESPONDIDA">Respondida</option>
                    <option value="ENCERRADA">Encerrada</option>
                  </select>
                </div>
                {erroResposta && <p role="alert" className="alert-erro">{erroResposta}</p>}
              </>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDetalhe(null)} disabled={respondendo}>Fechar</button>
              {isAdmin && !encerrada(detalhe.status) && (
                <button type="button" className="btn btn-success" onClick={() => void salvarResposta()} disabled={respondendo}>{respondendo ? 'Salvando…' : 'Salvar'}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
