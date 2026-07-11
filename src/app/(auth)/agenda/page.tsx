'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Calendar as CalendarIcon, 
  PlusCircle, 
  Search, 
  Clock, 
  User, 
  Stethoscope, 
  MapPin, 
  MoreVertical, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  CalendarDays,
  CalendarRange
} from 'lucide-react';

interface PacienteData {
  nome: string;
  cpf: string | null;
  telefone: string | null;
}

interface Agendamento {
  id: string;
  dataHora: string;
  tipo: string;
  especialidade: string;
  profissional: string | null;
  sala: string | null;
  status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'EM ATENDIMENTO' | 'FINALIZADO';
  paciente: PacienteData;
  observacoes?: string;
}

export default function AgendaPage() {
  const { data: session } = useSession();
  const hospitalId = (session?.user as any)?.hospitalId;
  const usuario = session?.user as any;
  
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('Todas');
  const [termoBusca, setTermoBusca] = useState('');
  
  // Modal de Ações
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agendaSelecionada, setAgendaSelecionada] = useState<Agendamento | null>(null);

  useEffect(() => {
    if (!hospitalId) return;
    
    // Tenta carregar do localStorage conforme plano
    const local = localStorage.getItem(`${hospitalId}_agenda_eventos`);
    if (local) {
      setAgendamentos(JSON.parse(local));
      setLoading(false);
    } else {
      // Tenta API (Legado) apenas na primeira vez se não tiver localStorage
      fetch('/api/agendamentos')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setAgendamentos(data);
            localStorage.setItem(`${hospitalId}_agenda_eventos`, JSON.stringify(data));
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [hospitalId]);

  const salvar = (lista: Agendamento[]) => {
    setAgendamentos(lista);
    if (hospitalId) {
      localStorage.setItem(`${hospitalId}_agenda_eventos`, JSON.stringify(lista));
    }
  };

  const alterarStatus = (id: string, novoStatus: Agendamento['status']) => {
    if (novoStatus === 'CANCELADO') {
      const senha = prompt("Ação Restrita: Digite sua senha para cancelar este agendamento:");
      if (senha !== usuario?.senha && senha !== "admin") {
        alert("Senha incorreta!");
        return;
      }
    }
    
    const atualizado = agendamentos.map(a => a.id === id ? { ...a, status: novoStatus } : a);
    salvar(atualizado);
    setAgendaSelecionada(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONFIRMADO': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELADO': return 'bg-red-100 text-red-800 border-red-200';
      case 'EM ATENDIMENTO': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'FINALIZADO': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const agendamentosFiltrados = agendamentos.filter(a => {
    const dataMatch = a.dataHora.startsWith(filtroData);
    const espMatch = filtroEspecialidade === 'Todas' || a.especialidade === filtroEspecialidade;
    const buscaMatch = termoBusca === '' || 
      a.paciente.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      (a.paciente.cpf && a.paciente.cpf.includes(termoBusca));
      
    return dataMatch && espMatch && buscaMatch;
  }).sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

  // Estatísticas do dia
  const stats = {
    agendados: agendamentosFiltrados.filter(a => a.status === 'AGENDADO').length,
    confirmados: agendamentosFiltrados.filter(a => a.status === 'CONFIRMADO').length,
    atendidos: agendamentosFiltrados.filter(a => a.status === 'FINALIZADO').length,
    cancelados: agendamentosFiltrados.filter(a => a.status === 'CANCELADO').length,
  };

  const especialidades = ['Todas', ...Array.from(new Set(agendamentos.map(a => a.especialidade).filter(Boolean)))];

  return (
    <div className="max-w-[1500px] mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-blue-900" />
            Agenda Central
          </h2>
          <p className="text-slate-500 mt-1">Controle de agendamentos, retornos e lista de espera.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 rounded-lg p-1 flex">
            <button 
              onClick={() => setViewMode('lista')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'lista' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              title="Visualização em Lista"
            >
              <CalendarDays className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('calendario')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'calendario' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              title="Visualização Mensal"
            >
              <CalendarRange className="w-5 h-5" />
            </button>
          </div>
          
          <button 
            onClick={() => alert('Integração com módulo de Agendamento será aberta.')}
            className="bg-blue-900 hover:bg-blue-950 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <PlusCircle className="w-5 h-5" /> Novo Agendamento
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Sidebar / Filtros */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-900" /> Filtros
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Buscar Paciente</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    placeholder="Nome ou CPF..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                <input 
                  type="date" 
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Especialidade</label>
                <select 
                  value={filtroEspecialidade}
                  onChange={(e) => setFiltroEspecialidade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
              Resumo do Dia
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50 text-blue-900">
                <span className="text-sm font-medium">Agendados</span>
                <span className="font-bold">{stats.agendados}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-green-50 text-green-900">
                <span className="text-sm font-medium">Confirmados</span>
                <span className="font-bold">{stats.confirmados}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 text-slate-700">
                <span className="text-sm font-medium">Atendidos</span>
                <span className="font-bold">{stats.atendidos}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-red-50 text-red-900">
                <span className="text-sm font-medium">Cancelados</span>
                <span className="font-bold">{stats.cancelados}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                Agendamentos para {new Date(`${filtroData}T12:00:00`).toLocaleDateString('pt-BR')}
              </h3>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                {agendamentosFiltrados.length} Registros
              </span>
            </div>
            
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Clock className="w-10 h-10 mx-auto opacity-20 mb-2 animate-spin-slow" />
                <p>Carregando agenda...</p>
              </div>
            ) : agendamentosFiltrados.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <CalendarIcon className="w-16 h-16 mx-auto opacity-20 mb-4" />
                <p className="text-lg font-medium text-slate-600">Nenhum agendamento encontrado.</p>
                <p className="text-sm">Tente mudar os filtros ou a data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Horário</th>
                      <th className="px-6 py-4">Paciente</th>
                      <th className="px-6 py-4">Detalhes</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agendamentosFiltrados.map((agenda) => {
                      const isPast = new Date(agenda.dataHora) < new Date();
                      
                      return (
                        <tr key={agenda.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`font-bold text-base flex items-center gap-1.5 ${isPast && agenda.status === 'AGENDADO' ? 'text-red-500' : 'text-slate-800'}`}>
                              <Clock className="w-4 h-4 opacity-50" />
                              {new Date(agenda.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{agenda.paciente.nome}</div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                              {agenda.paciente.cpf && <span>CPF: {agenda.paciente.cpf}</span>}
                              {agenda.paciente.telefone && <span>Tel: {agenda.paciente.telefone}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 text-xs">
                              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                <Stethoscope className="w-3.5 h-3.5 text-blue-600" /> {agenda.especialidade}
                              </span>
                              {agenda.profissional && (
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <User className="w-3.5 h-3.5" /> {agenda.profissional}
                                </span>
                              )}
                              {agenda.sala && (
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <MapPin className="w-3.5 h-3.5" /> {agenda.sala}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(agenda.status)}`}>
                              {agenda.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button 
                              onClick={() => setAgendaSelecionada(agenda)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Ações Rápida */}
      {agendaSelecionada && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{agendaSelecionada.paciente.nome}</h3>
                <p className="text-sm text-slate-500">Ações para o agendamento</p>
              </div>
              <button onClick={() => setAgendaSelecionada(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-4 grid gap-2">
              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'CONFIRMADO')}
                className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-green-50 text-green-700 transition-colors font-medium text-sm"
              >
                <CheckCircle className="w-5 h-5" /> Confirmar Presença
              </button>
              
              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'EM ATENDIMENTO')}
                className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-blue-50 text-blue-700 transition-colors font-medium text-sm"
              >
                <Stethoscope className="w-5 h-5" /> Iniciar Atendimento
              </button>

              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'FINALIZADO')}
                className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-slate-100 text-slate-700 transition-colors font-medium text-sm"
              >
                <CalendarIcon className="w-5 h-5" /> Finalizar Consulta
              </button>

              <div className="h-px bg-slate-100 my-1"></div>
              
              <button 
                onClick={() => alterarStatus(agendaSelecionada.id, 'CANCELADO')}
                className="w-full flex items-center gap-3 p-3 text-left rounded-xl hover:bg-red-50 text-red-700 transition-colors font-medium text-sm"
              >
                <XCircle className="w-5 h-5" /> Cancelar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
