'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, SearchInput, StatCard, StatGrid, Tabs, type Tone } from '@/components/ui';
import PacienteSelect from '@/components/ui/PacienteSelect';
import { pode } from '@/lib/permissions';
import '@/components/ui/modulo.css';
import '../setores.css';
import './servico-social.css';

interface CasoSocial { id: string; pacienteNome?: string; situacao?: string; detalhe?: string; status?: string; createdAt: string }

type Aba = 'atendimento' | 'lista' | 'encaminhamentos';

const ABAS = [
  { id: 'atendimento', label: 'Atendimento', icon: 'las la-plus-circle' },
  { id: 'lista', label: 'Lista completa', icon: 'las la-list' },
  { id: 'encaminhamentos', label: 'Encaminhamentos', icon: 'las la-share' },
] as const;

const DESTINOS = [
  { nome: 'CRAS / CREAS', descricao: 'Centro de Referência de Assistência Social' },
  { nome: 'Conselho Tutelar', descricao: 'Para casos de vulnerabilidade infantil' },
  { nome: 'Delegacia da Mulher (DEAM)', descricao: 'Violência doméstica' },
  { nome: 'Abrigos Institucionais', descricao: 'Pessoas em situação de rua' },
  { nome: 'INSS', descricao: 'Auxílio doença e benefícios' },
  { nome: 'Vara da Infância/Idoso', descricao: 'Ministério Público' },
];

function dataDoAtendimento(registro: CasoSocial): Date | null {
  const dataInformada = typeof registro.detalhe === 'string'
    ? registro.detalhe.match(/(?:^|\n)Data do atendimento: (\d{4}-\d{2}-\d{2})(?:\n|$)/)?.[1]
    : undefined;
  if (dataInformada) {
    const [ano, mes, dia] = dataInformada.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    if (data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia) return data;
  }

  const criadaEm = new Date(registro.createdAt);
  return Number.isNaN(criadaEm.getTime()) ? null : criadaEm;
}

function tomDoStatus(status?: string): Tone {
  const s = (status || '').toUpperCase();
  if (s.includes('CONCLU')) return 'success';
  if (s.includes('AGUARDANDO') || s.includes('ACOMPANHAMENTO') || s.includes('ANDAMENTO')) return 'warning';
  return 'info';
}

export default function ServicoSocialPage() {
  const { data: session, status: sessionStatus } = useSession();
  const podeGerir = pode(session?.user?.cargo, 'social:gerir');
  const [tabEscolhida, setTabAtiva] = useState<Aba>('atendimento');
  const tabAtiva: Aba = !podeGerir && tabEscolhida === 'atendimento' ? 'lista' : tabEscolhida;
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedbackAtendimento, setFeedbackAtendimento] = useState({ texto: '', erro: false });

  // Dados
  const [atendimentos, setAtendimentos] = useState<CasoSocial[]>([]);

  // Form State
  const [form, setForm] = useState({
    pacienteId: '',
    tipo: 'Orientação Social',
    demanda: 'Vulnerabilidade Social',
    profissional: '',
    data: '',
    status: 'Em Andamento',
    relato: '',
    encaminhamentos: ''
  });

  // Filtros
  const [buscaLista, setBuscaLista] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const resA = await fetch('/api/servico-social', { cache: 'no-store' });
      if (!resA.ok) throw new Error('Não foi possível carregar os dados do Serviço Social. Atualize a página.');
      const dadosAtendimentos: unknown = await resA.json();
      if (!Array.isArray(dadosAtendimentos)) throw new Error('A resposta do servidor está inválida.');
      setAtendimentos(dadosAtendimentos);
      setErroCarga('');
    } catch (e) {
      setErroCarga(e instanceof Error ? e.message : 'Erro ao carregar os dados do Serviço Social.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus !== 'authenticated' || !session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAtendimentos([]);
      setLoading(false);
      return;
    }
    void carregarDados();
    const hoje = new Date();
    const hojeLocal = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    setForm(prev => ({ ...prev, data: prev.data || hojeLocal, profissional: session.user.name || '' }));
  }, [sessionStatus, session?.user]);

  const registrarAtendimento = async () => {
    if (!form.pacienteId || !form.data || !form.relato.trim()) {
      setFeedbackAtendimento({ texto: 'Selecione o paciente e preencha a data e o relato do atendimento.', erro: true });
      return;
    }
    if (salvando) return;
    setSalvando(true);
    setFeedbackAtendimento({ texto: '', erro: false });
    const payload = {
      pacienteId: form.pacienteId,
      situacao: form.demanda,
      tipo: form.tipo,
      status: form.status,
      data: form.data,
      relato: form.relato.trim(),
      encaminhamentos: form.encaminhamentos.trim(),
    };

    try {
      const res = await fetch('/api/servico-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || 'Erro ao registrar atendimento');

      setForm(prev => ({ ...prev, relato: '', encaminhamentos: '', pacienteId: '' }));
      setFeedbackAtendimento({ texto: 'Atendimento registrado com sucesso.', erro: false });
      await carregarDados();
      setTabAtiva('lista');
    } catch (error) {
      setFeedbackAtendimento({ texto: error instanceof Error ? error.message : 'Não foi possível registrar o atendimento.', erro: true });
    } finally {
      setSalvando(false);
    }
  };

  // Filtros de Tabela
  let listaFiltrada = atendimentos.slice();
  if (buscaLista) {
    const t = buscaLista.trim().toLocaleLowerCase('pt-BR');
    listaFiltrada = listaFiltrada.filter(a =>
      (a.pacienteNome || '').toLocaleLowerCase('pt-BR').includes(t) ||
      (a.situacao || '').toLocaleLowerCase('pt-BR').includes(t)
    );
  }

  // Estatísticas
  const agora = new Date();
  const mesAtual = agora.getMonth() + 1;
  const anoAtual = agora.getFullYear();
  const atendimentosMes = atendimentos.filter(a => {
    const d = dataDoAtendimento(a);
    return d !== null && (d.getMonth() + 1) === mesAtual && d.getFullYear() === anoAtual;
  }).length;

  const pendentes = atendimentos.filter(a => {
    const s = (a.status || '').toUpperCase();
    return s.includes('ACOMPANHAMENTO') || s.includes('PENDENTE') || s.includes('ANDAMENTO');
  }).length;
  const concluidos = atendimentos.filter(a => {
    const s = (a.status || '').toUpperCase();
    return s.includes('CONCLU') || s.includes('RESOLVIDO') || s.includes('FINALIZADO');
  }).length;
  const comEncaminhamentos = atendimentos.filter(a => {
    return (a.detalhe || '').toLowerCase().includes('encaminhamentos:');
  }).length;

  return (
    <div className="conteudo">
      <div className="ss-container">
        <PageHeader
          icon="las la-hands-helping"
          title="Serviço social"
          subtitle="Atendimento social, acolhimento e demandas do paciente"
          actions={podeGerir ? (
            <button type="button" className="btn btn-success" onClick={() => setTabAtiva('atendimento')}>
              <i className="las la-plus-circle" aria-hidden="true"></i> Novo atendimento
            </button>
          ) : undefined}
        />

        {loading && atendimentos.length === 0 ? <LoadingState message="Carregando dados do Serviço Social..." /> : erroCarga && atendimentos.length === 0 ? (
          <ErrorState message={erroCarga} onRetry={() => void carregarDados()} />
        ) : (
          <>
            {erroCarga && <p className="mod-aviso mod-aviso-erro" role="alert">{erroCarga}</p>}
            {feedbackAtendimento.texto && (
              <p className={`mod-aviso ${feedbackAtendimento.erro ? 'mod-aviso-erro' : 'mod-aviso-sucesso'}`} role={feedbackAtendimento.erro ? 'alert' : 'status'}>
                {feedbackAtendimento.texto}
              </p>
            )}

            <StatGrid>
              <StatCard icon="las la-users" value={atendimentosMes} label="Atendimentos no mês" />
              <StatCard icon="las la-clock" value={pendentes} label="Pendentes" tone="warning" alerta />
              <StatCard icon="las la-check-circle" value={concluidos} label="Concluídos" />
              <StatCard icon="las la-share" value={comEncaminhamentos} label="Encaminhamentos" />
            </StatGrid>

            <Tabs tabs={podeGerir ? ABAS : ABAS.filter(a => a.id !== 'atendimento')} active={tabAtiva} onChange={setTabAtiva} label="Seções do Serviço Social" />

            {tabAtiva === 'atendimento' && podeGerir && (
              <Panel title="Registrar atendimento social" icon="las la-hands-helping">
                <div className="mod-form-grid">
                  <PacienteSelect required value={form.pacienteId} onChange={id => setForm(atual => ({ ...atual, pacienteId: id }))} />
                  <div className="form-group">
                    <label htmlFor="social-tipo">Tipo de atendimento *</label>
                    <select id="social-tipo" required value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                      <option>Orientação Social</option>
                      <option>Acolhimento</option>
                      <option>Visita Domiciliar</option>
                      <option>Entrevista Social</option>
                      <option>Grupo de Apoio</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="social-demanda">Demanda principal *</label>
                    <select id="social-demanda" required value={form.demanda} onChange={e => setForm({...form, demanda: e.target.value})}>
                      <option>Vulnerabilidade Social</option>
                      <option>Violência Doméstica</option>
                      <option>Abandono Familiar</option>
                      <option>Dependência Química</option>
                      <option>Moradia/Habitação</option>
                      <option>Benefícios/Previdência</option>
                      <option>Documentação</option>
                      <option>Óbito/Trâmites</option>
                      <option>Alta Hospitalar Complexa</option>
                      <option>Outra</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="social-profissional">Profissional responsável</label>
                    <input id="social-profissional" type="text" value={form.profissional} readOnly aria-readonly="true" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="social-data">Data *</label>
                    <input id="social-data" type="date" required value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="social-status">Status</label>
                    <select id="social-status" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option>Em Andamento</option>
                      <option>Aguardando Retorno</option>
                      <option>Concluído</option>
                    </select>
                  </div>
                  <div className="form-group mod-largo">
                    <label htmlFor="social-relato">Relato e evolução *</label>
                    <textarea id="social-relato" rows={3} required maxLength={4000} aria-describedby="social-relato-contagem" value={form.relato} onChange={e => setForm({...form, relato: e.target.value})} placeholder="Descreva o atendimento ou a evolução do caso..."></textarea>
                    <small id="social-relato-contagem" className="sc-muted">{form.relato.length}/4000 caracteres</small>
                  </div>
                  <div className="form-group mod-largo">
                    <label htmlFor="social-encaminhamentos">Encaminhamentos realizados</label>
                    <textarea id="social-encaminhamentos" rows={2} maxLength={1000} value={form.encaminhamentos} onChange={e => setForm({...form, encaminhamentos: e.target.value})} placeholder="Ex: Encaminhado ao CRAS para benefício eventual."></textarea>
                  </div>
                </div>
                <div className="mod-acoes">
                  <button type="button" className="btn btn-success" onClick={registrarAtendimento} disabled={salvando || loading || sessionStatus !== 'authenticated'} aria-busy={salvando}>
                    <i className="las la-save" aria-hidden="true"></i> {salvando ? 'Salvando...' : 'Salvar atendimento'}
                  </button>
                </div>
              </Panel>
            )}

            {tabAtiva === 'lista' && (
              <>
                <SearchInput value={buscaLista} onChange={setBuscaLista} placeholder="Buscar por paciente ou demanda..." label="Buscar por paciente ou demanda" />
                {listaFiltrada.length === 0 ? (
                  <EmptyState icon="las la-hands-helping" message={buscaLista.trim() ? 'Nenhum atendimento corresponde à busca.' : 'Nenhum atendimento registrado.'} />
                ) : (
                  <div className="tabela-wrapper">
                    <table className="tabela">
                      <caption className="sr-only">Atendimentos de Serviço Social registrados</caption>
                      <thead>
                        <tr><th scope="col">Data</th><th scope="col">Paciente</th><th scope="col">Demanda</th><th scope="col">Detalhe</th><th scope="col">Status</th></tr>
                      </thead>
                      <tbody>
                        {listaFiltrada.map((a) => (
                          <tr key={a.id}>
                            <td>{dataDoAtendimento(a)?.toLocaleDateString('pt-BR') || '—'}</td>
                            <td><strong>{a.pacienteNome}</strong></td>
                            <td>{a.situacao}</td>
                            <td className="sc-historico">{a.detalhe}</td>
                            <td><Badge tone={tomDoStatus(a.status)}>{a.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {tabAtiva === 'encaminhamentos' && (
              <>
                <p role="note" className="mod-aviso mod-aviso-atencao">
                  O sistema não envia ofícios, notificações ou pedidos de vaga. Use os canais institucionais autorizados e registre o encaminhamento no atendimento.
                </p>
                <ul className="mod-lista ss-destinos">
                  {DESTINOS.map(d => (
                    <li key={d.nome} className="mod-cartao">
                      <strong>{d.nome}</strong>
                      <span className="mod-secundario">{d.descricao}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
