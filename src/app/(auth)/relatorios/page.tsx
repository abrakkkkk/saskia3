'use client';
import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import './relatorios.css';

// Cores para gráficos
const COLORS = ['#f59e0b', '#3b82f6', '#ec4899', '#22c55e', '#64748b'];

function dataLocalKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function RelatoriosPage() {
  const [mounted, setMounted] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const requisicaoAtual = useRef(0);
  const [activeTab, setActiveTab] = useState('geral');
  const [filtroRapido, setFiltroRapido] = useState('mes');
  const [erro, setErro] = useState('');
  
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  // --- Estados de Dados Brutos ---
  const [agendamentosProfissionais, setAgendamentosProfissionais] = useState<any[]>([]);
  const [utiLeitos, setUtiLeitos] = useState<any[]>([]);
  
  // --- Estados Computados (Cards) ---
  const [data, setData] = useState({
    totalPacientes: 0, atendimentos: 0, internacoes: 0, obitos: 0,
    taxaUTI: '—', cirurgias: 0,
  });

  // --- Gráficos Data ---
  const [chartStatus, setChartStatus] = useState<any[]>([]);
  const [chartLeitos, setChartLeitos] = useState<any[]>([]);
  const [chartProd, setChartProd] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    aplicarFiltroRapido('mes');
  }, []);

  useEffect(() => {
    if (mounted) void gerarRelatorios();
  }, [inicio, fim, mounted]);

  const aplicarFiltroRapido = (periodo: string) => {
    setFiltroRapido(periodo);
    const hoje = new Date();
    
    if (periodo === 'hoje') {
      setInicio(dataLocalKey(hoje));
      setFim(dataLocalKey(hoje));
    } else if (periodo === 'semana') {
      const sete = new Date(hoje); sete.setDate(hoje.getDate() - 7);
      setInicio(dataLocalKey(sete));
      setFim(dataLocalKey(hoje));
    } else if (periodo === 'mes') {
      const trinta = new Date(hoje); trinta.setDate(hoje.getDate() - 30);
      setInicio(dataLocalKey(trinta));
      setFim(dataLocalKey(hoje));
    } else if (periodo === 'ano') {
      setInicio(dataLocalKey(new Date(hoje.getFullYear(), 0, 1)));
      setFim(dataLocalKey(hoje));
    } else {
      setInicio(''); setFim('');
    }
  };

  const gerarRelatorios = async () => {
    const idRequisicao = ++requisicaoAtual.current;
    setErro('');
    setCarregando(true);
    try {
      const params = new URLSearchParams({ inicio, fim });
      const response = await fetch(`/api/relatorios?${params.toString()}`);
      const report = await response.json();
      if (!response.ok) throw new Error(report.error || 'Não foi possível carregar os dados do relatório.');
      const metricas = ['pacientesNoPeriodo', 'internadosAgora', 'obitosNoPeriodo', 'cirurgiasNoPeriodo'];
      if (!report || metricas.some(campo => typeof report[campo] !== 'number' || !Number.isFinite(report[campo]))
        || !Array.isArray(report.agendamentos) || !Array.isArray(report.leitos)) {
        throw new Error('A resposta do relatório está incompleta.');
      }
      if (idRequisicao !== requisicaoAtual.current) return;
      const agendamentos = report.agendamentos;
      const leitos = report.leitos;
      setAgendamentosProfissionais(agendamentos);
      setUtiLeitos(leitos.map((leito: any) => ({ tipo: leito.tipo, status: leito.status === 'OCUPADO' ? 'ocupado' : 'livre' })));
      const concluidos = agendamentos.filter((item: any) => item.status === 'CONCLUIDO').reduce((sum: number, item: any) => sum + item.total, 0);
      const ocupados = leitos.filter((leito: any) => leito.status === 'OCUPADO').length;
      setData({
        totalPacientes: report.pacientesNoPeriodo,
        atendimentos: concluidos,
        internacoes: report.internadosAgora,
        obitos: report.obitosNoPeriodo,
        taxaUTI: leitos.length ? `${Math.round(ocupados / leitos.length * 100)}%` : '—',
        cirurgias: report.cirurgiasNoPeriodo,
      });
      const statuses = ['AGENDADO', 'CONFIRMADO', 'EM_ESPERA', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTOU'];
      setChartStatus(statuses.map(name => ({ name, value: agendamentos.filter((item: any) => item.status === name).reduce((sum: number, item: any) => sum + item.total, 0) })));
      const tipos = Array.from(new Set(leitos.map((leito: any) => leito.tipo).filter(Boolean)));
      setChartLeitos(tipos.map(tipo => ({ tipo, ocupados: leitos.filter((leito: any) => leito.tipo === tipo && leito.status === 'OCUPADO').length, total: leitos.filter((leito: any) => leito.tipo === tipo).length })));
      const porProfissional = new Map<string, number>();
      agendamentos.forEach((item: any) => porProfissional.set(item.profissional || 'Não informado', (porProfissional.get(item.profissional || 'Não informado') || 0) + item.total));
      setChartProd(Array.from(porProfissional, ([name, valor]) => ({ name, valor })));

    } catch (error) {
      if (idRequisicao !== requisicaoAtual.current) return;
      console.error('Erro ao carregar relatórios:', error);
      setErro(error instanceof Error ? error.message : 'Erro ao carregar relatórios.');
      setData({ totalPacientes: 0, atendimentos: 0, internacoes: 0, obitos: 0, taxaUTI: '—', cirurgias: 0 });
      setAgendamentosProfissionais([]);
      setUtiLeitos([]);
      setChartStatus([]);
      setChartLeitos([]);
      setChartProd([]);
    } finally {
      if (idRequisicao === requisicaoAtual.current) setCarregando(false);
    }
  };

  const handleExportCSV = () => {
    const csv = 'Indicador;Valor\n' + Object.entries(data).map(([nome, valor]) => `"${nome}";"${valor}"`).join('\n');
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'relatorio-gerencial.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) return null;

  return (
    <div className="conteudo">
      <div className="rel-container">
        
        {/* HEADER */}
        <div className="banner-rel" style={{ background: 'linear-gradient(135deg, #0a1f44, #1e3a8a)', borderRadius: '8px', padding: '30px 40px', color: 'white', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '28px', margin: 0 }}><i className="las la-chart-bar"></i> Relatórios Gerenciais Avançados</h1>
            <p style={{ opacity: 0.9, marginTop: '5px' }}>Indicadores calculados a partir dos registros do hospital e exportação</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={handleExportCSV} style={{ padding: '11px 22px', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}><i className="las la-file-excel"></i> Exportar Excel</button>
            <button className="btn btn-warning btn-imprimir" onClick={handlePrint} style={{ padding: '11px 22px', background: '#f59e0b', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}><i className="las la-print"></i> Imprimir PDF</button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="filtros-rapidos" style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
          {['hoje', 'semana', 'mes', 'ano', 'todos'].map(f => (
            <button key={f} aria-pressed={filtroRapido === f} onClick={() => aplicarFiltroRapido(f)} style={{ padding: '8px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: filtroRapido === f ? '#1e3a8a' : 'white', color: filtroRapido === f ? 'white' : '#64748b', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="filtros-periodo" style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label htmlFor="relatorio-inicio" style={{display:'block', fontSize:'12px', fontWeight:600, color:'#64748b', marginBottom:'4px'}}>Data Inicial</label><input id="relatorio-inicio" type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '8px' }} /></div>
          <div><label htmlFor="relatorio-fim" style={{display:'block', fontSize:'12px', fontWeight:600, color:'#64748b', marginBottom:'4px'}}>Data Final</label><input id="relatorio-fim" type="date" value={fim} onChange={e => setFim(e.target.value)} style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '8px' }} /></div>
          <button className="btn-atualizar" onClick={gerarRelatorios} disabled={carregando} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: carregando ? 'wait' : 'pointer', height: '42px', opacity: carregando ? 0.7 : 1 }}><i className="las la-sync-alt"></i> {carregando ? 'Atualizando...' : 'Atualizar'}</button>
        </div>
        {erro && <p role="alert" style={{ margin: '0 0 16px', padding: '12px 16px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8 }}>{erro}</p>}

        {/* MINI CARDS (STATS GRID) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px', marginBottom: '25px' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderTop: '3px solid #1e3a8a', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px'}}><i className="las la-users"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.totalPacientes}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Total Pacientes</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderTop: '3px solid #16a34a', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px', color:'#16a34a'}}><i className="las la-calendar-check"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.atendimentos}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Atendimentos concluídos no período</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderTop: '3px solid #f59e0b', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px', color:'#f59e0b'}}><i className="las la-clock"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.internacoes}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Internados agora</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderTop: '3px solid #dc2626', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px', color:'#dc2626'}}><i className="las la-cross"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.obitos}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Óbitos</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderTop: '3px solid #1e3a8a', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px'}}><i className="las la-bed"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.taxaUTI}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Ocupação UTI atual</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderTop: '3px solid #16a34a', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px', color:'#16a34a'}}><i className="las la-chart-line"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.cirurgias}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Cirurgias cadastradas no período</div></div>
        </div>

        {/* TAB MENU */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap' }}>
          {[
            { id: 'geral', icon: 'la-chart-pie', label: 'Dashboard Geral (Gráficos)' },
            { id: 'producao', icon: 'la-user-md', label: 'Produção Médica' },
            { id: 'leitos', icon: 'la-bed', label: 'Ocupação Leitos' },
          ].map(t => (
            <button key={t.id} aria-pressed={activeTab === t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '13px 26px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: activeTab === t.id ? '#1e3a8a' : '#64748b', borderBottom: `3px solid ${activeTab === t.id ? '#1e3a8a' : 'transparent'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className={`las ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>

        {/* TAB GERAL */}
        {activeTab === 'geral' && (
          <div className="animate-in fade-in duration-300">
            {/* GRÁFICOS */}
            <div className="rel-graficos">
              <div style={{ background: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                <h3 style={{ color: '#0a1f44', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-chart-bar"></i> Agendamentos por profissional</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartProd} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="valor" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                <h3 style={{ color: '#0a1f44', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-chart-pie"></i> Distribuição por Status</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                        {chartStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                <h3 style={{ color: '#0a1f44', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-bed"></i> Ocupação de Leitos</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartLeitos} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="tipo" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}} />
                      <Legend />
                      <Line type="monotone" dataKey="ocupados" stroke="#dc2626" strokeWidth={3} dot={{r: 6, fill: '#dc2626', strokeWidth: 0}} />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{r: 6, fill: '#3b82f6', strokeWidth: 0}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>


            </div>

            {/* TABELAS DETALHADAS */}
          </div>
        )}

        {/* TAB PRODUCAO MEDICA */}
        {activeTab === 'producao' && (
          <div className="animate-in fade-in duration-300">
            <div className="rel-tabela-wrap" style={{ background: 'white', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <table className="rel-tabela" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    {['Profissional', 'Agendamentos no período'].map(th => <th key={th} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{th}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(agendamentosProfissionais.map(p => p.profissional || 'Não informado'))).map((prof, i) => {
                    const atds = agendamentosProfissionais.filter(p => (p.profissional || 'Não informado') === prof).reduce((sum, item) => sum + item.total, 0);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155', fontWeight: 'bold' }}>{prof}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>{atds}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB LEITOS */}
        {activeTab === 'leitos' && (
          <div className="animate-in fade-in duration-300">
            <div className="rel-tabela-wrap" style={{ background: 'white', borderRadius: '8px', overflowX: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <table className="rel-tabela" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    {['Tipo de leito UTI', 'Leitos ocupados / total', 'Taxa de ocupação atual'].map(th => <th key={th} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{th}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(utiLeitos.map(l => l.tipo))).map((t, i) => {
                    const leitosTipo = utiLeitos.filter(l => l.tipo === t);
                    const ocupados = leitosTipo.filter(l => l.status === 'ocupado').length;
                    const taxa = Math.round((ocupados / leitosTipo.length) * 100);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155', fontWeight: 'bold' }}>{t}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>{ocupados} / {leitosTipo.length}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>
                          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden', marginTop: '5px' }}>
                            <div style={{ height: '100%', width: `${taxa}%`, background: taxa > 80 ? '#dc2626' : (taxa > 50 ? '#f59e0b' : '#16a34a') }}></div>
                          </div>
                          {taxa}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
