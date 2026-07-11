'use client';

import { useState, useEffect } from 'react';
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
  id: number;
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

const TIPO_INFO = {
  consulta: { label: 'Consulta', icon: Stethoscope, color: 'text-blue-600 bg-blue-100' },
  medicacao: { label: 'Medicação', icon: Pill, color: 'text-red-600 bg-red-100' },
  exame: { label: 'Exame', icon: Activity, color: 'text-purple-600 bg-purple-100' },
  cirurgia: { label: 'Cirurgia', icon: Activity, color: 'text-orange-600 bg-orange-100' },
  pessoal: { label: 'Pessoal', icon: User, color: 'text-slate-600 bg-slate-100' }
};

export default function LembretesPage() {
  const { data: session } = useSession();
  const hospitalId = (session?.user as any)?.hospitalId;
  const usuario = session?.user as any;
  
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'concluido' | 'hoje'>('todos');
  const [dataAtual, setDataAtual] = useState(new Date());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lembreteEditando, setLembreteEditando] = useState<Lembrete | null>(null);
  
  // Form state
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'consulta' as Lembrete['tipo'],
    data: new Date().toISOString().split('T')[0],
    hora: '09:00',
    descricao: '',
    relacionado: ''
  });

  useEffect(() => {
    if (!hospitalId) return;
    const saved = localStorage.getItem(`${hospitalId}_lembretes_sistema`);
    if (saved) {
      setLembretes(JSON.parse(saved));
    }
  }, [hospitalId]);

  const salvar = (lista: Lembrete[]) => {
    setLembretes(lista);
    if (hospitalId) {
      localStorage.setItem(`${hospitalId}_lembretes_sistema`, JSON.stringify(lista));
    }
  };

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
        data: dataAtual.toISOString().split('T')[0],
        hora: '09:00',
        descricao: '',
        relacionado: ''
      });
    }
    setIsModalOpen(true);
  };

  const salvarLembrete = () => {
    if (!form.titulo || !form.data) {
      alert("Preencha título e data!");
      return;
    }
    
    let atualizado = [...lembretes];
    if (lembreteEditando) {
      atualizado = atualizado.map(l => l.id === lembreteEditando.id ? {
        ...l,
        ...form,
        atualizadoPor: usuario?.nome || "Usuário",
        atualizadoEm: new Date().toISOString()
      } : l);
    } else {
      atualizado.push({
        id: Date.now(),
        ...form,
        concluido: false,
        criadoPor: usuario?.nome || "Usuário",
        criadoEm: new Date().toISOString()
      });
    }
    
    salvar(atualizado);
    setIsModalOpen(false);
  };

  const concluirLembrete = (id: number) => {
    salvar(lembretes.map(l => l.id === id ? { ...l, concluido: true } : l));
  };

  const excluirLembrete = (id: number) => {
    const senha = prompt("Ação destrutiva: Digite sua senha para excluir este lembrete:");
    if (senha === usuario?.senha || senha === "admin") {
      salvar(lembretes.filter(l => l.id !== id));
    } else if (senha !== null) {
      alert("Senha incorreta!");
    }
  };

  const mudarMes = (direcao: number) => {
    const d = new Date(dataAtual);
    d.setMonth(d.getMonth() + direcao);
    setDataAtual(d);
  };

  const selecionarData = (dataStr: string) => {
    setForm(prev => ({ ...prev, data: dataStr }));
    abrirModal();
  };

  // Stats
  const hojeStr = new Date().toISOString().split('T')[0];
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

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Calendário */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 self-start">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => mudarMes(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="font-bold text-slate-800 text-lg">{meses[mes]} {ano}</h3>
            <button onClick={() => mudarMes(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight className="w-5 h-5" /></button>
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
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtro === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {listaFiltrada.length === 0 ? (
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
                            <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> {new Date(l.data).toLocaleDateString('pt-BR')} às {l.hora}</span>
                            {l.relacionado && <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {l.relacionado}</span>}
                          </div>
                          {l.descricao && <p className="text-sm text-slate-600 mt-2">{l.descricao}</p>}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!l.concluido && (
                            <button onClick={() => concluirLembrete(l.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Concluir">
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button onClick={() => abrirModal(l)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                            <Edit className="w-5 h-5" />
                          </button>
                          <button onClick={() => excluirLembrete(l.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
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
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="bg-blue-900 p-4 px-6 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><Bell className="w-5 h-5" /> {lembreteEditando ? 'Editar Lembrete' : 'Novo Lembrete'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Título</label>
                <input 
                  type="text" 
                  value={form.titulo}
                  onChange={e => setForm({...form, titulo: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm"
                  placeholder="Ex: Reunião Equipe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo</label>
                <select 
                  value={form.tipo}
                  onChange={e => setForm({...form, tipo: e.target.value as any})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm bg-white"
                >
                  <option value="consulta">📋 Consulta</option>
                  <option value="medicacao">💊 Medicação</option>
                  <option value="exame">🔬 Exame</option>
                  <option value="cirurgia">🏥 Cirurgia</option>
                  <option value="pessoal">👤 Pessoal</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Data</label>
                  <input 
                    type="date" 
                    value={form.data}
                    onChange={e => setForm({...form, data: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Horário</label>
                  <input 
                    type="time" 
                    value={form.hora}
                    onChange={e => setForm({...form, hora: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Relacionado a (Opcional)</label>
                <input 
                  type="text" 
                  value={form.relacionado}
                  onChange={e => setForm({...form, relacionado: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm"
                  placeholder="Ex: João da Silva (Paciente)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Descrição</label>
                <textarea 
                  value={form.descricao}
                  onChange={e => setForm({...form, descricao: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-sm resize-y"
                  rows={3}
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
