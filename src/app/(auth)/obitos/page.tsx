'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatCard, StatGrid, Tabs } from '@/components/ui';
import PacienteSelect from '@/components/ui/PacienteSelect';
import { pode } from '@/lib/permissions';
import { dataLocalISO, mensagemDeErro, Modal } from '../setores-ui';
import '../setores.css';
import './obitos.css';

interface Obito {
  id: string;
  pacienteId: string | null;
  nome: string;
  nascimento: string | null;
  cpf: string | null;
  sexo: string | null;
  data: string;
  hora: string;
  local: string | null;
  causa: string;
  causaSec: string | null;
  medico: string;
  prontuario: string | null;
  responsavel: string | null;
  telefone: string | null;
  observacoes: string | null;
  registradoPor: string | null;
  dataRegistro: string | null;
  certidaoEmitida: boolean;
  fichaEmitidaEm: string | null;
}

type Aba = 'registro' | 'listagem' | 'fichas';

const LOCAIS = ['Hospitalar - Enfermaria', 'Hospitalar - UTI', 'Hospitalar - Emergência', 'Hospitalar - Centro Cirúrgico', 'Domiciliar', 'Via Pública', 'Outro'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ABAS = [
  { id: 'registro', label: 'Registrar', icon: 'las la-plus-circle' },
  { id: 'listagem', label: 'Listagem', icon: 'las la-list' },
  { id: 'fichas', label: 'Fichas internas', icon: 'las la-file-alt' },
] as const;

const formVazio = () => ({
  pacienteId: '', semCadastro: false, nome: '', nascimento: '', cpf: '', sexo: '', data: dataLocalISO(), hora: '',
  local: LOCAIS[0], causa: '', causaSec: '', medico: '', prontuario: '', responsavel: '', telefone: '', observacoes: '',
});

const fmtData = (valor: string) => new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR');
const AVISO_INTERNO = 'Documento de uso interno. Não substitui a Declaração de Óbito nem a certidão emitida em cartório.';

function FichaInterna({ obito }: { obito: Obito }) {
  return (
    <>
      <p>
        Registro interno: <strong>{obito.nome}</strong>, óbito em <strong>{fmtData(obito.data)}</strong> às <strong>{obito.hora}</strong>,
        local informado: <strong>{obito.local || 'não informado'}</strong>. Causa registrada: <strong>{obito.causa}</strong>.
      </p>
      <p>Médico declarante: <strong>{obito.medico}</strong></p>
      <p className="sc-muted">
        {obito.fichaEmitidaEm
          ? `Ficha emitida em ${new Date(obito.fichaEmitidaEm).toLocaleString('pt-BR')}.`
          : 'Data de emissão não registrada (registro anterior a este controle).'}
      </p>
      <p className="sc-muted">{AVISO_INTERNO}</p>
    </>
  );
}

export default function ObitosPage() {
  const { data: session, status: statusSessao } = useSession();
  const podeRegistrar = pode(session?.user?.cargo, 'obito:registrar');

  const [abaEscolhida, setAbaEscolhida] = useState<Aba>('registro');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [obitos, setObitos] = useState<Obito[]>([]);
  const [versaoPacientes, setVersaoPacientes] = useState(0);
  const [form, setForm] = useState(formVazio);
  const [busca, setBusca] = useState('');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [visualizado, setVisualizado] = useState<Obito | null>(null);
  const [agora] = useState(() => new Date());

  const aba: Aba = !podeRegistrar && abaEscolhida === 'registro' ? 'listagem' : abaEscolhida;
  const fecharModal = useCallback(() => setVisualizado(null), []);

  const carregarDados = useCallback(async () => {
    try {
      const res = await fetch('/api/obitos');
      if (!res.ok) throw new Error(await mensagemDeErro(res, 'Não foi possível carregar os registros de óbito.'));
      const dados: unknown = await res.json();
      if (!Array.isArray(dados)) throw new Error('A resposta dos registros de óbito é inválida.');
      setObitos(dados as Obito[]);
      setErroCarga('');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar os registros de óbito.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (statusSessao !== 'authenticated') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregarDados();
  }, [statusSessao, carregarDados]);

  const registrarObito = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (salvando) return;
    setSalvando(true);
    const { pacienteId, semCadastro, nome, nascimento, cpf, sexo, ...comuns } = form;
    const corpo = semCadastro ? { semCadastro, nome, nascimento, cpf, sexo, ...comuns } : { pacienteId, ...comuns };
    try {
      const res = await fetch('/api/obitos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (!res.ok) throw new Error(await mensagemDeErro(res, 'Não foi possível registrar o óbito.'));
      setForm(formVazio());
      setVersaoPacientes(v => v + 1);
      alert('Óbito registrado com sucesso. Leito, chamadas, agendamentos e cirurgias futuras do paciente foram encerrados.');
      await carregarDados();
      setAbaEscolhida('listagem');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível registrar o óbito.');
    } finally {
      setSalvando(false);
    }
  };

  const emitirFicha = async (id: string) => {
    if (!await confirm('Emitir a ficha interna deste óbito? A data de emissão ficará registrada.')) return;
    try {
      const res = await fetch(`/api/obitos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certidaoEmitida: true }),
      });
      if (!res.ok) throw new Error(await mensagemDeErro(res, 'Não foi possível emitir a ficha interna.'));
      await carregarDados();
      setAbaEscolhida('fichas');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível emitir a ficha interna.');
    }
  };

  const termo = busca.toLowerCase();
  const lista = obitos.filter(o => {
    const mesOk = filtroMes === 'todos' || new Date(`${o.data}T00:00:00`).getMonth() + 1 === Number(filtroMes);
    const buscaOk = !termo || [o.nome, o.causa, o.medico].some(v => v.toLowerCase().includes(termo));
    return mesOk && buscaOk;
  });
  const fichas = obitos.filter(o => o.certidaoEmitida);
  const obitosMes = obitos.filter(o => {
    const d = new Date(`${o.data}T00:00:00`);
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
  }).length;

  const atualizar = (campo: keyof ReturnType<typeof formVazio>) => (evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(atual => ({ ...atual, [campo]: evento.target.value }));
  };

  return (
    <div className="conteudo obitos-page">
      <div className="obitos-container">
        <PageHeader
          icon="las la-cross"
          title="Registro de Óbitos"
          subtitle="Registro interno de óbitos e seus efeitos no atendimento"
          actions={podeRegistrar && (
            <button type="button" className="btn btn-primary" onClick={() => setAbaEscolhida('registro')}>
              <i className="las la-plus-circle" aria-hidden="true"></i> Novo registro
            </button>
          )}
        />

        {loading && statusSessao !== 'unauthenticated' ? <LoadingState message="Carregando registros de óbito..." /> : erroCarga ? <ErrorState message={erroCarga} onRetry={() => void carregarDados()} /> : (
          <>
            <StatGrid>
              <StatCard icon="las la-cross" value={obitos.length} label="Total de óbitos" tone="neutral" />
              <StatCard icon="las la-calendar-check" value={obitosMes} label="Neste mês" />
              <StatCard icon="las la-file-alt" value={fichas.length} label="Fichas emitidas" tone="success" />
              <StatCard icon="las la-clock" value={obitos.length - fichas.length} label="Fichas pendentes" tone="warning" />
            </StatGrid>

            <Tabs tabs={podeRegistrar ? ABAS : ABAS.filter(a => a.id !== 'registro')} active={aba} onChange={setAbaEscolhida} label="Seções de registros de óbito" />

            {aba === 'registro' && (
              <Panel title="Registrar óbito" icon="las la-cross">
                <form onSubmit={registrarObito}>
                  <label className="sc-check">
                    <input
                      type="checkbox"
                      checked={form.semCadastro}
                      onChange={e => setForm(atual => ({ ...atual, semCadastro: e.target.checked, pacienteId: '' }))}
                    />
                    Exceção: pessoa sem cadastro neste hospital
                  </label>

                  <div className="form-grid">
                    {form.semCadastro ? (
                      <>
                        <div className="form-grupo"><label htmlFor="obito-nome"><i className="las la-user" aria-hidden="true"></i> Nome completo *</label><input id="obito-nome" required maxLength={160} value={form.nome} onChange={atualizar('nome')} /></div>
                        <div className="form-grupo"><label htmlFor="obito-nascimento"><i className="las la-calendar" aria-hidden="true"></i> Data de nascimento</label><input id="obito-nascimento" type="date" value={form.nascimento} onChange={atualizar('nascimento')} /></div>
                        <div className="form-grupo"><label htmlFor="obito-cpf"><i className="las la-id-card" aria-hidden="true"></i> CPF</label><input id="obito-cpf" maxLength={20} value={form.cpf} onChange={atualizar('cpf')} placeholder="000.000.000-00" /></div>
                        <div className="form-grupo">
                          <label htmlFor="obito-sexo"><i className="las la-venus-mars" aria-hidden="true"></i> Sexo</label>
                          <select id="obito-sexo" value={form.sexo} onChange={atualizar('sexo')}>
                            <option value="">Selecione...</option><option>Masculino</option><option>Feminino</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <div className="sc-completo">
                        <PacienteSelect key={versaoPacientes} required value={form.pacienteId} onChange={id => setForm(atual => ({ ...atual, pacienteId: id }))} />
                      </div>
                    )}
                    <div className="form-grupo"><label htmlFor="obito-data"><i className="las la-calendar-check" aria-hidden="true"></i> Data do óbito *</label><input id="obito-data" type="date" required max={dataLocalISO(agora)} value={form.data} onChange={atualizar('data')} /></div>
                    <div className="form-grupo"><label htmlFor="obito-hora"><i className="las la-clock" aria-hidden="true"></i> Horário *</label><input id="obito-hora" type="time" required value={form.hora} onChange={atualizar('hora')} /></div>
                    <div className="form-grupo">
                      <label htmlFor="obito-local"><i className="las la-door-open" aria-hidden="true"></i> Local</label>
                      <select id="obito-local" value={form.local} onChange={atualizar('local')}>{LOCAIS.map(l => <option key={l}>{l}</option>)}</select>
                    </div>
                    <div className="form-grupo"><label htmlFor="obito-causa"><i className="las la-procedures" aria-hidden="true"></i> Causa principal *</label><input id="obito-causa" required maxLength={1000} value={form.causa} onChange={atualizar('causa')} /></div>
                    <div className="form-grupo"><label htmlFor="obito-causa-sec"><i className="las la-stethoscope" aria-hidden="true"></i> Causas secundárias</label><input id="obito-causa-sec" maxLength={1000} value={form.causaSec} onChange={atualizar('causaSec')} /></div>
                    <div className="form-grupo">
                      <label htmlFor="obito-medico"><i className="las la-user-md" aria-hidden="true"></i> Médico declarante</label>
                      <input id="obito-medico" maxLength={160} value={form.medico} onChange={atualizar('medico')} placeholder={session?.user?.name ?? 'Nome e CRM'} />
                    </div>
                    <div className="form-grupo"><label htmlFor="obito-prontuario"><i className="las la-file-medical" aria-hidden="true"></i> Prontuário</label><input id="obito-prontuario" maxLength={100} value={form.prontuario} onChange={atualizar('prontuario')} /></div>
                    <div className="form-grupo"><label htmlFor="obito-responsavel"><i className="las la-user-friends" aria-hidden="true"></i> Responsável familiar</label><input id="obito-responsavel" maxLength={160} value={form.responsavel} onChange={atualizar('responsavel')} /></div>
                    <div className="form-grupo"><label htmlFor="obito-telefone"><i className="las la-phone" aria-hidden="true"></i> Telefone do responsável</label><input id="obito-telefone" maxLength={40} value={form.telefone} onChange={atualizar('telefone')} placeholder="(00) 00000-0000" /></div>
                    <div className="form-grupo sc-completo"><label htmlFor="obito-observacoes"><i className="las la-comment-medical" aria-hidden="true"></i> Observações</label><textarea id="obito-observacoes" rows={3} maxLength={4000} value={form.observacoes} onChange={atualizar('observacoes')} /></div>
                  </div>

                  <p className="sc-nota">O número da Declaração de Óbito e o documento assinado ainda não são armazenados nesta tela.</p>
                  <div className="sc-acoes">
                    <button type="submit" className="btn btn-primary" disabled={salvando} aria-busy={salvando}>
                      <i className="las la-save" aria-hidden="true"></i> {salvando ? 'Salvando...' : 'Salvar registro'}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => setForm(formVazio())}>
                      <i className="las la-eraser" aria-hidden="true"></i> Limpar
                    </button>
                  </div>
                </form>
              </Panel>
            )}

            {aba === 'listagem' && (
              <>
                <div className="search-box">
                  <input type="search" aria-label="Buscar por nome, causa ou médico" placeholder="Buscar por nome, causa ou médico..." value={busca} onChange={e => setBusca(e.target.value)} />
                  <select aria-label="Filtrar por mês" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
                    <option value="todos">Todos os meses</option>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                {lista.length === 0 ? <EmptyState icon="las la-cross" message="Nenhum registro encontrado." /> : lista.map(o => (
                  <article key={o.id} className="registro-card">
                    <div className="registro-header">
                      <h4><i className="las la-user" aria-hidden="true"></i> {o.nome}</h4>
                      <Badge tone={o.certidaoEmitida ? 'success' : 'warning'}>{o.certidaoEmitida ? 'Ficha emitida' : 'Ficha pendente'}</Badge>
                    </div>
                    <div className="registro-info">
                      <p><strong>Óbito:</strong> {fmtData(o.data)} às {o.hora}</p>
                      <p><strong>Causa:</strong> {o.causa}</p>
                      <p><strong>Médico:</strong> {o.medico}</p>
                      {!o.pacienteId && <p>Registro sem vínculo a paciente cadastrado</p>}
                    </div>
                    <div className="registro-actions">
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setVisualizado(o)}>
                        <i className="las la-eye" aria-hidden="true"></i> Visualizar
                      </button>
                      {podeRegistrar && !o.certidaoEmitida && (
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => void emitirFicha(o.id)}>
                          <i className="las la-file-alt" aria-hidden="true"></i> Emitir ficha interna
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </>
            )}

            {aba === 'fichas' && (fichas.length === 0 ? <EmptyState icon="las la-file-alt" message="Nenhuma ficha interna emitida." /> : (
              fichas.map(o => (
                <Panel key={o.id} title="Ficha interna de óbito" icon="las la-file-alt">
                  <div className="sc-dados"><FichaInterna obito={o} /></div>
                </Panel>
              ))
            ))}
          </>
        )}
      </div>

      {visualizado && (
        <Modal titulo="Ficha interna de óbito" aoFechar={fecharModal} classe="sc-imprimir">
          <div className="sc-dados">
            <p><strong>Nome:</strong> {visualizado.nome}</p>
            <p><strong>Nascimento:</strong> {visualizado.nascimento ? fmtData(visualizado.nascimento.slice(0, 10)) : 'Não informado'}</p>
            <p><strong>CPF:</strong> {visualizado.cpf || 'Não informado'}</p>
            <p><strong>Sexo:</strong> {visualizado.sexo || 'Não informado'}</p>
            <p><strong>Óbito:</strong> {fmtData(visualizado.data)} às {visualizado.hora}</p>
            <p><strong>Local:</strong> {visualizado.local || 'Não informado'}</p>
            <p className="sc-completo"><strong>Causa principal:</strong> {visualizado.causa}</p>
            <p className="sc-completo"><strong>Causas secundárias:</strong> {visualizado.causaSec || 'Não informadas'}</p>
            <p><strong>Médico:</strong> {visualizado.medico}</p>
            <p><strong>Prontuário:</strong> {visualizado.prontuario || 'Não informado'}</p>
            <p><strong>Responsável:</strong> {visualizado.responsavel || 'Não informado'}</p>
            <p><strong>Telefone:</strong> {visualizado.telefone || 'Não informado'}</p>
            <p className="sc-completo"><strong>Observações:</strong> {visualizado.observacoes || 'Nenhuma'}</p>
            <p className="sc-completo sc-muted">
              Registrado por {visualizado.registradoPor || 'não identificado'}
              {visualizado.dataRegistro ? ` em ${new Date(visualizado.dataRegistro).toLocaleString('pt-BR')}` : ''}.
            </p>
            <p className="sc-completo sc-muted">{AVISO_INTERNO}</p>
          </div>
          <div className="sc-acoes sc-acoes-fim sc-nao-imprimir">
            <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}>
              <i className="las la-print" aria-hidden="true"></i> Imprimir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
