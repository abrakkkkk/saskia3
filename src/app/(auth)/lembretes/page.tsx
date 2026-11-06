'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  PlusCircle,
  CheckCircle,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pill,
  Stethoscope,
  Activity,
  User
} from 'lucide-react';
import { PageHeader, StatGrid, StatCard, Panel, Badge, EmptyState, LoadingState } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import '@/components/ui/modulo.css';
import '@/components/ui/ui-extras.css';
import './lembretes.css';

interface Lembrete {
  id: string;
  titulo: string;
  tipo: 'consulta' | 'medicacao' | 'exame' | 'cirurgia' | 'pessoal';
  data: string; // YYYY-MM-DD
  hora: string;
  descricao: string;
  relacionado: string;
  concluido: boolean;
  criadoPor: string;
  criadoEm: string;
}

function dateForInput(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

async function getErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function timeForInput(value: string | Date) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toIsoDateTime(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  if (Number.isNaN(value.getTime())) throw new Error('Data e horário inválidos.');
  return value.toISOString();
}

const TIPO_INFO = {
  consulta: { label: 'Consulta', icon: Stethoscope },
  medicacao: { label: 'Registro antigo', icon: Pill },
  exame: { label: 'Exame', icon: Activity },
  cirurgia: { label: 'Cirurgia', icon: Activity },
  pessoal: { label: 'Pessoal', icon: User }
};

export default function LembretesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const hospitalId = session?.user?.hospitalId;
  
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'concluido' | 'hoje'>('todos');
  const [dataAtual, setDataAtual] = useState(new Date());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lembreteEditando, setLembreteEditando] = useState<Lembrete | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'consulta' as Lembrete['tipo'],
    data: dateForInput(new Date()),
    hora: '09:00',
    descricao: '',
    relacionado: ''
  });

  const carregarLembretes = useCallback(async (signal?: AbortSignal) => {
    if (!hospitalId) {
      setLembretes([]);
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch('/api/lembretes', { signal });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Não foi possível carregar os lembretes.'));
      const data: unknown = await res.json();
      if (!Array.isArray(data)) throw new Error('A resposta de lembretes está inválida.');
      const mapData = (data as (Lembrete & { dataHora?: string })[]).map(d => ({
        ...d,
        data: d.dataHora ? dateForInput(d.dataHora) : (d.data || ''),
        hora: d.dataHora ? timeForInput(d.dataHora) : (d.hora || '')
      }));
      if (!signal?.aborted) {
        setLembretes(mapData);
        setErroCarga('');
      }
    } catch (error) {
      if (!signal?.aborted) setErroCarga(error instanceof Error ? error.message : 'Não foi possível carregar os lembretes.');
    } finally {
      if (!signal?.aborted) setCarregando(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!hospitalId) {
      void Promise.resolve().then(() => { setLembretes([]); });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- estado inicial/reinício dependente da sessão e da busca
      setCarregando(false);
      setErroCarga(sessionStatus === 'unauthenticated'
        ? 'Sua sessão expirou. Entre novamente para ver seus lembretes.'
        : 'Hospital da sessão não identificado.');
      return;
    }
    const controller = new AbortController();
    void carregarLembretes(controller.signal);
    return () => controller.abort();
  }, [hospitalId, sessionStatus, carregarLembretes]);

  const abrirModal = (l?: Lembrete) => {
    if (l) {
      setLembreteEditando(l);
      setForm({
        titulo: l.titulo,
        tipo: l.tipo,
        data: l.data,
        hora: l.hora,
        descricao: l.descricao || '',
        relacionado: l.relacionado || ''
      });
    } else {
      setLembreteEditando(null);
      setForm({
        titulo: '',
        tipo: 'consulta',
        data: dateForInput(dataAtual),
        hora: '09:00',
        descricao: '',
        relacionado: ''
      });
    }
    setIsModalOpen(true);
  };

  const salvarLembrete = async () => {
    if (!form.titulo.trim() || !form.data || !form.hora) {
      alert("Preencha título, data e horário.");
      return;
    }
    
    try {
      const dataHora = toIsoDateTime(form.data, form.hora);
      let res: Response;
      if (lembreteEditando) {
        res = await fetch(`/api/lembretes/${lembreteEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            dataHora
          })
        });
      } else {
        res = await fetch('/api/lembretes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            dataHora,
          })
        });
      }
      if (!res.ok) {
        const response = await res.json().catch(() => ({}));
        throw new Error(response.error || 'Não foi possível salvar o lembrete.');
      }
      carregarLembretes();
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erro ao salvar lembrete!");
    }
  };

  const concluirLembrete = async (id: string) => {
    try {
      const res = await fetch(`/api/lembretes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluido: true })
      });
      if (!res.ok) throw new Error(await getErrorMessage(res, 'Não foi possível concluir o lembrete.'));
      carregarLembretes();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Erro ao concluir o lembrete.');
    }
  };

  const excluirLembrete = async (id: string) => {
    if (!await confirm('Excluir este lembrete? Esta ação não pode ser desfeita.')) return;
    try {
        const res = await fetch(`/api/lembretes/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) throw new Error(await getErrorMessage(res, 'Não foi possível excluir o lembrete.'));
        carregarLembretes();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Erro ao excluir o lembrete.');
    }
  };

  const mudarMes = (direcao: number) => {
    const d = new Date(dataAtual);
    d.setMonth(d.getMonth() + direcao);
    setDataAtual(d);
  };

  const selecionarData = (dataStr: string) => {
    setLembreteEditando(null);
    setForm({
      titulo: '', tipo: 'consulta', data: dataStr, hora: '09:00', descricao: '', relacionado: ''
    });
    setIsModalOpen(true);
  };

  // Stats
  const hojeStr = dateForInput(new Date());
  const stats = {
    pendentes: lembretes.filter(l => !l.concluido).length,
    hoje: lembretes.filter(l => l.data === hojeStr && !l.concluido).length,
    concluidos: lembretes.filter(l => l.concluido).length,
    total: lembretes.length
  };

  // List Filter
  const listaFiltrada = lembretes.filter(l => {
    if (filtro === 'pendente') return !l.concluido;
    if (filtro === 'concluido') return l.concluido;
    if (filtro === 'hoje') return l.data === hojeStr;
    return true;
  }).sort((a, b) => new Date(`${a.data}T${a.hora || '00:00'}`).getTime() - new Date(`${b.data}T${b.hora || '00:00'}`).getTime());

  // Calendário Lógica
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const diaInicioSemana = primeiroDia.getDay(); // 0(Dom) a 6(Sab)
  
  const diasBrancos = Array.from({ length: diaInicioSemana });
  const dias = Array.from({ length: diasNoMes }, (_, i) => i + 1);
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="mod-pagina">
      <PageHeader
        icon="las la-bell"
        title="Meus lembretes"
        subtitle="Agenda pessoal, visível só para você."
        actions={<button type="button" className="btn btn-primary" onClick={() => abrirModal()}><PlusCircle aria-hidden="true" size={18} /> Novo lembrete</button>}
      />

      <p className="mod-aviso mod-aviso-atencao" role="note">Esta agenda não emite alertas nem notificações. Não use para medicação, exames ou prazos clínicos.</p>

      <StatGrid>
        <StatCard icon="las la-clock" value={stats.pendentes} label="Pendentes" tone="warning" />
        <StatCard icon="las la-calendar-day" value={stats.hoje} label="Para hoje" tone="info" alerta />
        <StatCard icon="las la-check-circle" value={stats.concluidos} label="Concluídos" tone="success" />
        <StatCard icon="las la-list" value={stats.total} label="Total" />
      </StatGrid>

      {erroCarga && <p role="alert" className="mod-aviso mod-aviso-erro">{erroCarga}</p>}

      <div className="lb-grade">
        <Panel title="Calendário" icon="las la-calendar">
          <div className="lb-mes">
            <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="btn btn-secondary btn-sm ux-icon-btn"><ChevronLeft aria-hidden="true" size={18} /></button>
            <h3>{meses[mes]} {ano}</h3>
            <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" className="btn btn-secondary btn-sm ux-icon-btn"><ChevronRight aria-hidden="true" size={18} /></button>
          </div>

          <div className="lb-semana" aria-hidden="true">
            <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
          </div>

          <div className="lb-dias">
            {diasBrancos.map((_, i) => <span key={`b-${i}`}></span>)}
            {dias.map(dia => {
              const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
              const isHoje = dataStr === hojeStr;
              const temLembrete = lembretes.some(l => l.data === dataStr && !l.concluido);

              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => selecionarData(dataStr)}
                  aria-label={`Criar lembrete em ${formatDate(dataStr)}${temLembrete ? ', há lembretes pendentes' : ''}`}
                  aria-current={isHoje ? 'date' : undefined}
                  className={`lb-dia${isHoje ? ' hoje' : ''}`}
                >
                  {dia}
                  {temLembrete && <span aria-hidden="true" className="lb-ponto"></span>}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Lembretes" icon="las la-list">
          <div className="ux-chips lb-filtros" role="group" aria-label="Filtrar lembretes">
            {(['todos', 'pendente', 'concluido', 'hoje'] as const).map(f => (
              <button key={f} type="button" className="ux-chip" onClick={() => setFiltro(f)} aria-pressed={filtro === f}>
                {f === 'todos' ? 'Todos' : f === 'pendente' ? 'Pendentes' : f === 'concluido' ? 'Concluídos' : 'Hoje'}
              </button>
            ))}
          </div>

          {carregando ? (
            <LoadingState message="Carregando lembretes..." />
          ) : listaFiltrada.length === 0 ? (
            <EmptyState icon="las la-bell" message="Nenhum lembrete encontrado." />
          ) : (
            <ul className="ux-lista lb-lista">
              {listaFiltrada.map(l => {
                const info = TIPO_INFO[l.tipo];
                const Icon = info.icon;

                return (
                  <li key={l.id} className={`lb-item${l.concluido ? ' feito' : ''}`}>
                    <div className="lb-item-corpo">
                      <div className="lb-item-topo">
                        <h3>{l.titulo}</h3>
                        <Badge><Icon aria-hidden="true" size={12} /> {info.label}</Badge>
                      </div>
                      <p className="ux-secundario">
                        {formatDate(l.data)} às {l.hora}
                        {l.relacionado && <> · {l.relacionado}</>}
                      </p>
                      {l.descricao && <p className="lb-descricao">{l.descricao}</p>}
                    </div>
                    <div className="ux-acoes">
                      {!l.concluido && (
                        <button type="button" onClick={() => concluirLembrete(l.id)} className="btn btn-success btn-sm ux-icon-btn" title="Concluir" aria-label={`Concluir ${l.titulo}`}>
                          <CheckCircle aria-hidden="true" size={16} />
                        </button>
                      )}
                      <button type="button" onClick={() => abrirModal(l)} className="btn btn-secondary btn-sm ux-icon-btn" title="Editar" aria-label={`Editar ${l.titulo}`}>
                        <Edit aria-hidden="true" size={16} />
                      </button>
                      <button type="button" onClick={() => excluirLembrete(l.id)} className="btn btn-danger btn-sm ux-icon-btn" title="Excluir" aria-label={`Excluir ${l.titulo}`}>
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {isModalOpen && (
        <Modal title={lembreteEditando ? 'Editar lembrete' : 'Novo lembrete'} icon="las la-bell" onClose={() => setIsModalOpen(false)}>
          <div className="form-group">
            <label htmlFor="lembrete-titulo">Título</label>
            <input
              id="lembrete-titulo"
              type="text"
              value={form.titulo}
              onChange={e => setForm({...form, titulo: e.target.value})}
              placeholder="Ex.: reunião da equipe"
              maxLength={200}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lembrete-tipo">Tipo</label>
            <select
              id="lembrete-tipo"
              value={form.tipo}
              onChange={e => setForm({...form, tipo: e.target.value as Lembrete['tipo']})}
            >
              <option value="consulta">Consulta</option>
              <option value="exame">Exame</option>
              <option value="cirurgia">Cirurgia</option>
              <option value="pessoal">Pessoal</option>
            </select>
          </div>

          <div className="ux-campos">
            <div className="form-group">
              <label htmlFor="lembrete-data">Data</label>
              <input id="lembrete-data" type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} />
            </div>
            <div className="form-group">
              <label htmlFor="lembrete-hora">Horário</label>
              <input id="lembrete-hora" type="time" value={form.hora} onChange={e => setForm({...form, hora: e.target.value})} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lembrete-relacionado">Relacionado a (opcional)</label>
            <input
              id="lembrete-relacionado"
              type="text"
              value={form.relacionado}
              onChange={e => setForm({...form, relacionado: e.target.value})}
              placeholder="Ex.: João da Silva (paciente)"
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lembrete-descricao">Descrição</label>
            <textarea
              id="lembrete-descricao"
              value={form.descricao}
              onChange={e => setForm({...form, descricao: e.target.value})}
              rows={3}
              maxLength={4000}
            />
          </div>

          <div className="ui-modal-foot">
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={salvarLembrete}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
