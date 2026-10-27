'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Bell, 
  PlusCircle, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  BarChart, 
  List,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pill,
  Stethoscope,
  Activity,
  User
} from 'lucide-react';

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
  consulta: { label: 'Consulta', icon: Stethoscope, color: 'text-blue-600 bg-blue-100' },
  medicacao: { label: 'Medicação', icon: Pill, color: 'text-red-600 bg-red-100' },
  exame: { label: 'Exame', icon: Activity, color: 'text-purple-600 bg-purple-100' },
  cirurgia: { label: 'Cirurgia', icon: Activity, color: 'text-orange-600 bg-orange-100' },
  pessoal: { label: 'Pessoal', icon: User, color: 'text-slate-600 bg-slate-100' }
};

export default function LembretesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const hospitalId = (session?.user as any)?.hospitalId;
  
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
      const mapData = data.map((d: any) => ({
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
      setLembretes([]);
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
      alert("Preencha título e data!");
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
    if (!window.confirm('Excluir este lembrete? Esta ação não pode ser desfeita.')) return;
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
    <div className="max-w-[1500px] mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-8 h-8 text-blue-900" />
            Lembretes e Notificações
          </h2>
          <p className="text-slate-500 mt-1">Gerencie seus compromissos, tarefas e alertas.</p>
        </div>
        <button 
          onClick={() => abrirModal()}
          className="bg-blue-900 hover:bg-blue-950 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" /> Novo Lembrete
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pendentes', value: stats.pendentes, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100 border-orange-500' },
          { label: 'Para Hoje', value: stats.hoje, icon: CalendarIcon, color: 'text-blue-600', bg: 'bg-blue-100 border-blue-500' },
          { label: 'Concluídos', value: stats.concluidos, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 border-green-500' },
          { label: 'Total', value: stats.total, icon: BarChart, color: 'text-slate-600', bg: 'bg-slate-100 border-slate-500' }
        ].map((s, i) => (
          <div key={i} className={`bg-white p-5 rounded-xl shadow-sm border-l-4 ${s.bg} flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-sm ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {erroCarga && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erroCarga}</p>}

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Calendário */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 self-start">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="font-bold text-slate-800 text-lg">{meses[mes]} {ano}</h3>
            <button onClick={() => mudarMes(1)} aria-label="Próximo mês" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight className="w-5 h-5" /></button>
          </div>
          
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400">
            <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {diasBrancos.map((_, i) => <div key={`b-${i}`} className="aspect-square"></div>)}
            {dias.map(dia => {
              const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
              const isHoje = dataStr === hojeStr;
              const temLembrete = lembretes.some(l => l.data === dataStr && !l.concluido);
              
              return (
                <button 
                  key={dia}
                  onClick={() => selecionarData(dataStr)}
                  aria-label={`Criar lembrete em ${formatDate(dataStr)}`}
                  className={`
                    aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-colors relative
                    ${isHoje ? 'bg-blue-900 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}
                  `}
                >
                  {dia}
                  {temLembrete && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isHoje ? 'bg-white' : 'bg-red-500'}`}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <List className="w-5 h-5 text-blue-900" /> Meus Lembretes
            </h3>
            <div className="flex gap-2">
              {(['todos', 'pendente', 'concluido', 'hoje'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  aria-pressed={filtro === f}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtro === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {carregando ? (
              <div role="status" className="flex h-full items-center justify-center text-slate-500">Carregando lembretes...</div>
            ) : listaFiltrada.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <Bell className="w-16 h-16 opacity-30" />
                <p>Nenhum lembrete encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listaFiltrada.map(l => {
                  const info = TIPO_INFO[l.tipo];
                  const Icon = info.icon;
                  
                  return (
                    <div key={l.id} className={`p-4 rounded-xl border transition-all ${l.concluido ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm hover:shadow-md border-l-4 border-l-blue-900'}`}>
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className={`font-bold ${l.concluido ? 'line-through text-slate-500' : 'text-slate-800'}`}>{l.titulo}</h4>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${info.color}`}>
                              <Icon className="w-3 h-3" /> {info.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-3">
                            <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> {formatDate(l.data)} às {l.hora}</span>
                            {l.relacionado && <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {l.relacionado}</span>}
                          </div>
                          {l.descricao && <p className="text-sm text-slate-600 mt-2">{l.descricao}</p>}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!l.concluido && (
                            <button onClick={() => concluirLembrete(l.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Concluir" aria-label={`Concluir ${l.titulo}`}>
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button onClick={() => abrirModal(l)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar" aria-label={`Editar ${l.titulo}`}>
                            <Edit className="w-5 h-5" />
                          </button>
                          <button onClick={() => excluirLembrete(l.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir" aria-label={`Excluir ${l.titulo}`}>
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Lembrete */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="lembrete-modal-titulo" className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="bg-blue-900 p-4 px-6 flex justify-between items-center text-white">
              <h3 id="lembrete-modal-titulo" className="font-bold flex items-center gap-2"><Bell className="w-5 h-5" /> {lembreteEditando ? 'Editar Lembrete' : 'Novo Lembrete'}</h3>
              <button onClick={() => setIsModalOpen(false)} aria-label="Fechar formulário" className="text-white/70 hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="lembrete-titulo" className="block text-sm font-bold text-slate-700 mb-1">Título</label>
                <input 
                  id="lembrete-titulo"
                  type="text" 
                  value={form.titulo}
                  onChange={e => setForm({...form, titulo: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm"
                  placeholder="Ex: Reunião Equipe"
                  maxLength={200}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="lembrete-tipo" className="block text-sm font-bold text-slate-700 mb-1">Tipo</label>
                <select 
                  id="lembrete-tipo"
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value as any})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm bg-white"
                >
                  <option value="consulta"> Consulta</option>
                  <option value="medicacao"> Medicação</option>
                  <option value="exame"> Exame</option>
                  <option value="cirurgia"> Cirurgia</option>
                  <option value="pessoal"> Pessoal</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lembrete-data" className="block text-sm font-bold text-slate-700 mb-1">Data</label>
                  <input 
                    id="lembrete-data"
                    type="date" 
                    value={form.data}
                    onChange={e => setForm({...form, data: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="lembrete-hora" className="block text-sm font-bold text-slate-700 mb-1">Horário</label>
                  <input 
                    id="lembrete-hora"
                    type="time" 
                    value={form.hora}
                    onChange={e => setForm({...form, hora: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="lembrete-relacionado" className="block text-sm font-bold text-slate-700 mb-1">Relacionado a (Opcional)</label>
                <input 
                  id="lembrete-relacionado"
                  type="text" 
                  value={form.relacionado}
                  onChange={e => setForm({...form, relacionado: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm"
                  placeholder="Ex: João da Silva (Paciente)"
                  maxLength={200}
                />
              </div>
              
              <div>
                <label htmlFor="lembrete-descricao" className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                <textarea 
                  id="lembrete-descricao"
                  value={form.descricao}
                  onChange={e => setForm({...form, descricao: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm resize-y"
                  rows={3}
                  maxLength={4000}
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={salvarLembrete}
                className="w-full bg-blue-900 hover:bg-blue-950 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Salvar Lembrete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
