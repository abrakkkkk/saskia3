'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader, StatGrid, StatCard, Tabs, Badge, SearchInput, EmptyState, LoadingState, ErrorState, Panel, type Tone } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './gestao-salas.css';

function dataLocalISO(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

interface Sala {
  id: string;
  nome: string;
  tipo: string | null;
  setor: string | null;
  andar?: string;
  capacidade: number;
  equipamentos?: string;
  obs?: string;
  status: string; // LIVRE, OCUPADO, RESERVADO, MANUTENCAO
}

interface Reserva {
  id: string;
  salaId: string;
  profissional: string;
  paciente?: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string; // ATIVA, RESERVADA, FINALIZADA, CANCELADA
}

const tiposSala: Record<string, string> = {
  consultorio: "Consultório",
  cirurgica: "Sala cirúrgica",
  exame: "Sala de exames",
  reuniao: "Sala de reunião",
  triagem: "Sala de triagem",
  observacao: "Sala de observação",
  procedimento: "Sala de procedimentos",
  aula: "Sala de aula",
  outro: "Outro"
};

const statusLabel: Record<string, string> = {
  LIVRE: "Livre",
  OCUPADO: "Em uso",
  RESERVADO: "Reservada",
  MANUTENCAO: "Manutenção"
};

const ABAS = [
  { id: 'mapa', label: 'Mapa de Salas', icon: 'las la-th-large' },
  { id: 'cadastro', label: 'Cadastrar Sala', icon: 'las la-plus-circle' },
  { id: 'reservas', label: 'Reservas', icon: 'las la-calendar-alt' },
  { id: 'historico', label: 'Histórico', icon: 'las la-history' },
] as const;

export default function GestaoSalasPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'mapa' | 'cadastro' | 'reservas' | 'historico'>('mapa');
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  const [salas, setSalas] = useState<Sala[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  // Filters
  const [buscarSala, setBuscarSala] = useState('');
  const [filtroStatusSala, setFiltroStatusSala] = useState('todos');
  const [buscarReserva, setBuscarReserva] = useState('');

  // Form Sala
  const [formSala, setFormSala] = useState({
    nome: '', tipo: 'consultorio', setor: 'Consultórios', andar: '', capacidade: 1, equipamentos: '', obs: ''
  });

  // Modal Reserva
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formReserva, setFormReserva] = useState({
    salaId: '', profissional: '', paciente: '', data: '', horaInicio: '', horaFim: '', duracao: ''
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [resSalas, resReservas] = await Promise.all([
        fetch('/api/salas', { cache: 'no-store' }),
        fetch('/api/salas/reservas', { cache: 'no-store' })
      ]);
      if (!resSalas.ok || !resReservas.ok) {
        throw new Error('Não foi possível carregar salas e reservas. Atualize a tela e tente novamente.');
      }
      const [salasData, reservasData] = await Promise.all([resSalas.json(), resReservas.json()]);
      if (!Array.isArray(salasData) || !Array.isArray(reservasData)) {
        throw new Error('A resposta de salas e reservas está inválida.');
      }
      setSalas(salasData);
      setReservas(reservasData);
      setErroCarga('');
    } catch (error) {
      setErroCarga(error instanceof Error ? error.message : 'Erro ao carregar salas e reservas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => { carregarDados(); });
  }, []);

  const cadastrarSala = async () => {
    if (!formSala.nome) { alert("Digite o nome da sala."); return; }
    setIsSaving(true);
    try {
      const res = await fetch('/api/salas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formSala.nome.trim(),
          tipo: formSala.tipo,
          setor: formSala.setor,
          andar: formSala.andar.trim(),
          capacidade: Number(formSala.capacidade) || 1,
          equipamentos: formSala.equipamentos.trim(),
          obs: formSala.obs.trim(),
          status: "LIVRE"
        })
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || "Erro ao cadastrar sala");

      setFormSala({ nome: '', tipo: 'consultorio', setor: 'Consultórios', andar: '', capacidade: 1, equipamentos: '', obs: '' });
      setActiveTab('mapa');
      alert("Sala cadastrada com sucesso.");
      carregarDados();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setIsSaving(false);
    }
  };

  const abrirReserva = (salaId?: string) => {
    const agora = new Date();
    const horaInicio = agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    agora.setHours(agora.getHours() + 1);
    const horaFim = agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

    setFormReserva({
      salaId: salaId || '',
      profissional: session?.user?.name || '',
      paciente: '',
      data: dataLocalISO(),
      horaInicio,
      horaFim,
      duracao: ''
    });
    setIsModalOpen(true);
  };

  const calcularHoraFim = (duracaoStr: string, hrInicio: string) => {
    if (!duracaoStr) return;
    const duracao = parseInt(duracaoStr);
    if (!hrInicio) return;
    const [h, m] = hrInicio.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m) + duracao);
    setFormReserva(prev => ({ ...prev, duracao: duracaoStr, horaFim: d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) }));
  };

  const confirmarReserva = async () => {
    if(!formReserva.salaId || !formReserva.data || !formReserva.horaInicio || !formReserva.horaFim){
      alert("Preencha os campos obrigatórios (*).");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/salas/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salaId: formReserva.salaId,
          paciente: formReserva.paciente.trim(),
          data: formReserva.data,
          horaInicio: formReserva.horaInicio,
          horaFim: formReserva.horaFim
        })
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || "Erro ao criar reserva");

      setIsModalOpen(false);
      alert("Reserva confirmada.");
      carregarDados();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setIsSaving(false);
    }
  };

  const encerrarReserva = async (reservaId: string, status: 'FINALIZADA' | 'CANCELADA') => {
    try {
      const res = await fetch(`/api/salas/reservas/${reservaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || "Erro ao atualizar reserva");
      alert(status === 'FINALIZADA' ? "Sala liberada." : "Reserva cancelada.");
      carregarDados();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro inesperado.');
    }
  };

  const alterarStatusSala = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/salas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const resposta = await res.json().catch(() => null);
      if (!res.ok) throw new Error(resposta?.error || "Erro ao atualizar status");
      alert(`Status alterado para: ${statusLabel[status]}.`);
      carregarDados();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro inesperado.');
    }
  };

  // Stats
  const stats = {
    livres: salas.filter(s => s.status === 'LIVRE').length,
    ocupadas: salas.filter(s => s.status === 'OCUPADO').length,
    reservadas: salas.filter(s => s.status === 'RESERVADO').length,
    manutencao: salas.filter(s => s.status === 'MANUTENCAO').length,
    total: salas.length
  };

  // Filters
  let salasFiltradas = salas;
  if (filtroStatusSala !== 'todos') salasFiltradas = salasFiltradas.filter(s => s.status === filtroStatusSala);
  if (buscarSala.trim()) {
    const t = buscarSala.trim().toLocaleLowerCase('pt-BR');
    salasFiltradas = salasFiltradas.filter(s => s.nome.toLocaleLowerCase('pt-BR').includes(t) || (s.tipo || '').toLocaleLowerCase('pt-BR').includes(t) || (s.setor || '').toLocaleLowerCase('pt-BR').includes(t));
  }

  let reservasFiltradas = [...reservas];
  if (buscarReserva) {
    const t = buscarReserva.toLowerCase();
    reservasFiltradas = reservasFiltradas.filter(r => r.profissional.toLowerCase().includes(t) || (r.paciente || '').toLowerCase().includes(t));
  }

  if (loading) return <div className="mod-pagina"><PageHeader icon="las la-door-open" title="Gestão de salas" /><LoadingState message="Carregando salas..." /></div>;

  const reservasAbertas = reservasFiltradas.filter(r => r.status === 'ATIVA' || r.status === 'RESERVADA');
  const toneSala: Record<string, Tone> = { LIVRE: 'success', OCUPADO: 'danger', RESERVADO: 'warning', MANUTENCAO: 'neutral' };
  const toneReserva = (status: string): Tone => status === 'ATIVA' ? 'danger' : status === 'RESERVADA' ? 'warning' : status === 'FINALIZADA' ? 'success' : 'neutral';
  const rotuloReserva = (status: string) => status === 'ATIVA' ? 'Em uso' : status === 'RESERVADA' ? 'Reservada' : status === 'FINALIZADA' ? 'Finalizada' : 'Cancelada';

  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-door-open"
        title="Gestão de salas"
        subtitle="Cadastro, reservas e situação das salas e consultórios."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('cadastro')}><i className="las la-plus-circle" aria-hidden="true"></i> Nova sala</button>
            <button type="button" className="btn btn-primary" onClick={() => abrirReserva()} disabled={!!erroCarga} title={erroCarga ? 'Carregue os dados antes de criar uma reserva' : undefined}><i aria-hidden="true" className="las la-calendar-plus"></i> Nova reserva</button>
          </>
        }
      />

      <StatGrid>
        <StatCard icon="las la-check-circle" tone="success" value={erroCarga ? '—' : stats.livres} label="Livres" />
        <StatCard icon="las la-door-closed" tone="danger" value={erroCarga ? '—' : stats.ocupadas} label="Em uso" />
        <StatCard icon="las la-clock" tone="warning" value={erroCarga ? '—' : stats.reservadas} label="Reservadas" />
        <StatCard icon="las la-tools" value={erroCarga ? '—' : stats.manutencao} label="Manutenção" />
        <StatCard icon="las la-door-open" value={erroCarga ? '—' : stats.total} label="Total de salas" />
      </StatGrid>

      {erroCarga && <ErrorState message={erroCarga} onRetry={carregarDados} />}

      <Tabs label="Seções de salas" tabs={ABAS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'mapa' && (
        <div>
          <div className="ux-barra">
            <SearchInput value={buscarSala} onChange={setBuscarSala} placeholder="Buscar por nome, tipo ou setor" label="Buscar sala por nome, tipo ou setor" />
            <div className="form-group">
              <select aria-label="Filtrar salas por status" value={filtroStatusSala} onChange={e => setFiltroStatusSala(e.target.value)}>
                <option value="todos">Todos os status</option>
                <option value="LIVRE">Livres</option>
                <option value="RESERVADO">Reservadas</option>
                <option value="OCUPADO">Em uso</option>
                <option value="MANUTENCAO">Manutenção</option>
              </select>
            </div>
          </div>
          {erroCarga ? null : salasFiltradas.length === 0 ? (
            <EmptyState icon="las la-door-open" message="Nenhuma sala encontrada." />
          ) : (
            <div className="sl-mapa">
              {salasFiltradas.map(s => {
                const resAtiva = reservas.find(r => r.salaId === s.id && r.status === "ATIVA");
                let tempoRestante = '';
                let urgente = false;

                if (resAtiva && resAtiva.horaFim) {
                  const agora = new Date();
                  const fim = new Date(resAtiva.data + 'T' + resAtiva.horaFim);
                  const diff = Math.floor((fim.getTime() - agora.getTime()) / 60000);

                  if (diff > 0) {
                    const horas = Math.floor(diff / 60);
                    const mins = diff % 60;
                    tempoRestante = horas > 0 ? `${horas}h ${mins}min restantes` : `${mins} min restantes`;
                    if (diff <= 5) urgente = true;
                  } else if (diff === 0) {
                    tempoRestante = 'Encerrando agora';
                    urgente = true;
                  } else {
                    tempoRestante = 'Prazo da reserva encerrado';
                    urgente = true;
                  }
                }

                return (
                  <article key={s.id} className="sl-sala">
                    <header className="sl-sala-topo">
                      <h2>{s.nome}</h2>
                      <Badge tone={toneSala[s.status] ?? 'neutral'}>{statusLabel[s.status] ?? s.status}</Badge>
                    </header>
                    <ul className="sl-info">
                      <li><i aria-hidden="true" className="las la-tag"></i> {tiposSala[s.tipo || ''] || s.tipo || 'Tipo não informado'}</li>
                      <li><i aria-hidden="true" className="las la-map-marker"></i> {s.setor || 'Setor não informado'}{s.andar ? ' - ' + s.andar : ''}</li>
                      <li><i aria-hidden="true" className="las la-users"></i> Capacidade: {s.capacidade}</li>
                      {s.equipamentos && <li><i aria-hidden="true" className="las la-tools"></i> {s.equipamentos}</li>}
                      {s.obs && <li><i aria-hidden="true" className="las la-info-circle"></i> {s.obs}</li>}
                      {resAtiva && (
                        <>
                          <li><i aria-hidden="true" className="las la-user"></i> <strong>{resAtiva.profissional}</strong>{resAtiva.paciente ? ' | ' + resAtiva.paciente : ''}</li>
                          <li className={urgente ? 'sl-urgente' : undefined}><i aria-hidden="true" className="las la-hourglass-half"></i> {tempoRestante}</li>
                        </>
                      )}
                    </ul>
                    <div className="sl-acoes">
                      {(s.status === 'LIVRE' || s.status === 'RESERVADO') && (
                        <>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => abrirReserva(s.id)}><i className="las la-calendar-plus" aria-hidden="true"></i> Reservar</button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => alterarStatusSala(s.id, 'MANUTENCAO')}><i className="las la-tools" aria-hidden="true"></i> Manutenção</button>
                        </>
                      )}
                      {s.status === 'OCUPADO' && resAtiva && (
                        <button type="button" className="btn btn-success btn-sm" onClick={() => encerrarReserva(resAtiva.id, 'FINALIZADA')}><i className="las la-check-circle" aria-hidden="true"></i> Liberar agora</button>
                      )}
                      {s.status === 'MANUTENCAO' && (
                        <button type="button" className="btn btn-success btn-sm" onClick={() => alterarStatusSala(s.id, 'LIVRE')}><i className="las la-check" aria-hidden="true"></i> Liberar</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'cadastro' && (
        <Panel title="Cadastrar sala" icon="las la-plus-circle">
          <div className="ux-campos">
            <div className="form-group"><label htmlFor="sala-nome">Nome da sala *</label><input id="sala-nome" type="text" placeholder="Ex.: Consultório 3" value={formSala.nome} onChange={e => setFormSala({...formSala, nome: e.target.value})} /></div>
            <div className="form-group"><label htmlFor="sala-tipo">Tipo *</label><select id="sala-tipo" value={formSala.tipo} onChange={e => setFormSala({...formSala, tipo: e.target.value})}>
              {Object.entries(tiposSala).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
            </select></div>
            <div className="form-group"><label htmlFor="sala-setor">Setor *</label><select id="sala-setor" value={formSala.setor} onChange={e => setFormSala({...formSala, setor: e.target.value})}>
              <option>Consultórios</option><option>Centro Cirúrgico</option><option>Emergência</option>
              <option>UTI</option><option>Enfermaria</option><option>Ambulatório</option>
              <option>Administração</option><option>Outro</option>
            </select></div>
            <div className="form-group"><label htmlFor="sala-andar">Andar</label><input id="sala-andar" type="text" placeholder="Térreo, 1º andar..." value={formSala.andar} onChange={e => setFormSala({...formSala, andar: e.target.value})} /></div>
            <div className="form-group"><label htmlFor="sala-capacidade">Capacidade</label><input id="sala-capacidade" type="number" min="1" value={formSala.capacidade} onChange={e => setFormSala({...formSala, capacidade: parseInt(e.target.value) || 1})} /></div>
            <div className="form-group"><label htmlFor="sala-equipamentos">Equipamentos</label><input id="sala-equipamentos" type="text" placeholder="Maca, computador, projetor..." value={formSala.equipamentos} onChange={e => setFormSala({...formSala, equipamentos: e.target.value})} /></div>
            <div className="form-group ux-largo"><label htmlFor="sala-obs">Observações</label><textarea id="sala-obs" rows={2} value={formSala.obs} onChange={e => setFormSala({...formSala, obs: e.target.value})}></textarea></div>
          </div>
          <div className="ui-modal-foot">
            <button type="button" className="btn btn-primary" onClick={cadastrarSala} disabled={isSaving}><i className="las la-save" aria-hidden="true"></i> {isSaving ? 'Cadastrando…' : 'Cadastrar sala'}</button>
          </div>
        </Panel>
      )}

      {activeTab === 'reservas' && (
        <div>
          <div className="ux-barra">
            <SearchInput value={buscarReserva} onChange={setBuscarReserva} placeholder="Buscar por profissional ou paciente" label="Buscar reserva por profissional ou paciente" />
          </div>
          {erroCarga ? (
            <EmptyState icon="las la-calendar-alt" message="Reservas indisponíveis enquanto os dados não carregam." />
          ) : reservasAbertas.length === 0 ? (
            <EmptyState icon="las la-calendar-alt" message="Nenhuma reserva ativa encontrada." />
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead><tr><th>Sala</th><th>Profissional</th><th>Paciente ou evento</th><th>Data</th><th>Horário</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {reservasAbertas.map(r => {
                    const sala = salas.find(s => s.id === r.salaId);
                    return (
                      <tr key={r.id}>
                        <td><strong>{sala ? sala.nome : '—'}</strong></td>
                        <td>{r.profissional}</td>
                        <td>{r.paciente || '—'}</td>
                        <td>{new Date(r.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>{r.horaInicio} - {r.horaFim}</td>
                        <td><Badge tone={toneReserva(r.status)}>{rotuloReserva(r.status)}</Badge></td>
                        <td>
                          <button type="button" className="btn btn-secondary btn-xs" onClick={() => encerrarReserva(r.id, r.status === 'ATIVA' ? 'FINALIZADA' : 'CANCELADA')}><i className={`las ${r.status === 'ATIVA' ? 'la-check' : 'la-times'}`} aria-hidden="true"></i> {r.status === 'ATIVA' ? 'Finalizar' : 'Cancelar'}</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'historico' && (
        erroCarga ? (
          <EmptyState icon="las la-history" message="Histórico indisponível enquanto os dados não carregam." />
        ) : reservas.length === 0 ? (
          <EmptyState icon="las la-history" message="Nenhum histórico." />
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead><tr><th>Data</th><th>Sala</th><th>Profissional</th><th>Status</th><th>Detalhes</th></tr></thead>
              <tbody>
                {reservas.map(r => {
                  const sala = salas.find(s => s.id === r.salaId);
                  return (
                    <tr key={r.id}>
                      <td>{new Date(r.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td>{sala ? sala.nome : '—'}</td>
                      <td>{r.profissional}</td>
                      <td><Badge tone={toneReserva(r.status)}>{rotuloReserva(r.status)}</Badge></td>
                      <td>{r.horaInicio} - {r.horaFim} | {r.paciente || 'N/I'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {isModalOpen && (
        <Modal title="Reservar sala" icon="las la-calendar-plus" onClose={() => setIsModalOpen(false)} busy={isSaving}>
          <div className="ux-campos">
            <div className="form-group">
              <label htmlFor="reserva-sala">Sala *</label>
              <select id="reserva-sala" value={formReserva.salaId} onChange={e => setFormReserva({...formReserva, salaId: e.target.value})}>
                <option value="">Selecione...</option>
                {salas.filter(s => s.status === 'LIVRE' || s.status === 'RESERVADO' || s.id === formReserva.salaId).map(s => <option key={s.id} value={s.id}>{s.nome} ({s.setor})</option>)}
              </select>
            </div>
            <div className="form-group"><label htmlFor="reserva-profissional">Profissional</label><input id="reserva-profissional" type="text" value={session?.user?.name || ''} readOnly /></div>
            <div className="form-group"><label htmlFor="reserva-paciente">Paciente ou evento</label><input id="reserva-paciente" type="text" value={formReserva.paciente} onChange={e => setFormReserva({...formReserva, paciente: e.target.value})} /></div>
            <div className="form-group"><label htmlFor="reserva-data">Data *</label><input id="reserva-data" type="date" value={formReserva.data} onChange={e => setFormReserva({...formReserva, data: e.target.value})} /></div>
            <div className="form-group"><label htmlFor="reserva-inicio">Início *</label><input id="reserva-inicio" type="time" value={formReserva.horaInicio} onChange={e => setFormReserva({...formReserva, horaInicio: e.target.value})} /></div>
            <div className="form-group"><label htmlFor="reserva-fim">Término *</label><input id="reserva-fim" type="time" value={formReserva.horaFim} onChange={e => setFormReserva({...formReserva, horaFim: e.target.value})} /></div>
            <div className="form-group">
              <label htmlFor="reserva-duracao">Duração</label>
              <select id="reserva-duracao" value={formReserva.duracao} onChange={e => calcularHoraFim(e.target.value, formReserva.horaInicio)}>
                <option value="">Personalizada</option><option value="15">15 minutos</option><option value="30">30 minutos</option>
                <option value="45">45 minutos</option><option value="60">1 hora</option><option value="120">2 horas</option>
              </select>
            </div>
          </div>
          <div className="ui-modal-foot">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={confirmarReserva} disabled={isSaving}><i className="las la-save" aria-hidden="true"></i> {isSaving ? 'Confirmando…' : 'Confirmar'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
