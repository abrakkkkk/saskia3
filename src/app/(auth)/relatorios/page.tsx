'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import './relatorios.css';

// Cores para gráficos
const COLORS = ['#f59e0b', '#3b82f6', '#ec4899', '#22c55e', '#64748b'];

export default function RelatoriosPage() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('geral');
  const [filtroRapido, setFiltroRapido] = useState('mes');
  
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  // --- Estados de Dados Brutos ---
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [utiLeitos, setUtiLeitos] = useState<any[]>([]);
  const [transfusoes, setTransfusoes] = useState<any[]>([]);
  
  // --- Estados Computados (Cards) ---
  const [data, setData] = useState({
    totalPacientes: 0, atendimentos: 0, internacoes: 0, altas: 0, obitos: 0,
    taxaUTI: '0%', tmp: '-', dispensacoes: 0, itensAlmox: 0, cirurgias: 0,
    exames: 0, transfusoes: 0, iras: 0, taxaIRAS: '0%', hm: '0%', cssd: 0, ouvidoria: 0
  });

  // --- Gráficos Data ---
  const [chartAtend, setChartAtend] = useState<any[]>([]);
  const [chartStatus, setChartStatus] = useState<any[]>([]);
  const [chartLeitos, setChartLeitos] = useState<any[]>([]);
  const [chartProd, setChartProd] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    aplicarFiltroRapido('mes');
  }, []);

  useEffect(() => {
    if (mounted && inicio && fim) {
      gerarRelatorios();
    }
  }, [inicio, fim, mounted]);

  const aplicarFiltroRapido = (periodo: string) => {
    setFiltroRapido(periodo);
    const hoje = new Date();
    
    if (periodo === 'hoje') {
      setInicio(hoje.toISOString().split('T')[0]);
      setFim(hoje.toISOString().split('T')[0]);
    } else if (periodo === 'semana') {
      const sete = new Date(hoje); sete.setDate(hoje.getDate() - 7);
      setInicio(sete.toISOString().split('T')[0]);
      setFim(hoje.toISOString().split('T')[0]);
    } else if (periodo === 'mes') {
      const trinta = new Date(hoje); trinta.setDate(hoje.getDate() - 30);
      setInicio(trinta.toISOString().split('T')[0]);
      setFim(hoje.toISOString().split('T')[0]);
    } else if (periodo === 'ano') {
      setInicio(new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0]);
      setFim(hoje.toISOString().split('T')[0]);
    } else {
      setInicio(''); setFim('');
    }
  };

  const carregarMockDados = () => {
    // Gerar pacientes mock para o gráfico e tabelas
    const pcts = [];
    const statusArr = ["Recepção", "Em Atendimento Médico", "Internado", "Alta Médica", "Óbito"];
    const medicos = ["Dr. João", "Dra. Maria", "Dr. Carlos", "Dra. Ana"];
    for(let i=0; i<150; i++) {
      const m = Math.floor(Math.random() * 12);
      const d = new Date(2026, m, Math.floor(Math.random()*28)+1);
      pcts.push({
        id: i,
        nome: `Paciente Mock ${i}`,
        status: statusArr[Math.floor(Math.random()*statusArr.length)],
        dataCadastro: d.toISOString(),
        profissional: medicos[Math.floor(Math.random()*medicos.length)]
      });
    }

    const leitos = [
      { id: 1, tipo: 'UTI Adulto', status: 'ocupado' }, { id: 2, tipo: 'UTI Adulto', status: 'livre' },
      { id: 3, tipo: 'UTI Pediátrica', status: 'ocupado' }, { id: 4, tipo: 'UTI Pediátrica', status: 'ocupado' },
      { id: 5, tipo: 'Enfermaria', status: 'ocupado' }, { id: 6, tipo: 'Enfermaria', status: 'livre' }, { id: 7, tipo: 'Enfermaria', status: 'livre' }
    ];

    const bsTransf = localStorage.getItem('saskiaBsTransfusoes') ? JSON.parse(localStorage.getItem('saskiaBsTransfusoes') as string) : new Array(42).fill({ data: new Date().toISOString() });

    return { pcts, leitos, bsTransf };
  };

  const gerarRelatorios = () => {
    const { pcts, leitos, bsTransf } = carregarMockDados();
    setPacientes(pcts);
    setUtiLeitos(leitos);
    setTransfusoes(bsTransf);

    // Filter by date (mock implementation for visuals)
    const fPacientes = pcts; // In a real app, filter by 'inicio' e 'fim'
    
    // Cards
    const altas = fPacientes.filter(p => p.status === "Alta Médica").length;
    const internados = fPacientes.filter(p => p.status === "Internado").length;
    const obitos = fPacientes.filter(p => p.status === "Óbito").length;
    
    const utiOcup = leitos.filter(l => l.status === "ocupado").length;
    const taxaUTI = Math.round((utiOcup / leitos.length) * 100);

    setData({
      totalPacientes: fPacientes.length,
      atendimentos: fPacientes.filter(p => p.status !== "Recepção").length,
      internacoes: internados,
      altas: altas,
      obitos: obitos,
      taxaUTI: taxaUTI + '%',
      tmp: '4.2',
      dispensacoes: 854,
      itensAlmox: 1205,
      cirurgias: 34,
      exames: 215,
      transfusoes: bsTransf.length,
      iras: 2,
      taxaIRAS: '1.3%',
      hm: '85%',
      cssd: 45,
      ouvidoria: 12
    });

    // Chart Atendimentos por Mês
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const dadosMeses = new Array(12).fill(0);
    fPacientes.forEach(p => { const m = new Date(p.dataCadastro).getMonth(); dadosMeses[m]++; });
    setChartAtend(meses.map((m, i) => ({ mes: m, atendimentos: dadosMeses[i] })));

    // Chart Status
    setChartStatus([
      { name: 'Recepção', value: fPacientes.filter(p => p.status === "Recepção").length },
      { name: 'Atendimento', value: fPacientes.filter(p => p.status === "Em Atendimento Médico").length },
      { name: 'Internado', value: internados },
      { name: 'Alta', value: altas },
      { name: 'Óbito', value: obitos }
    ]);

    // Chart Leitos
    const tipos = Array.from(new Set(leitos.map(l => l.tipo)));
    setChartLeitos(tipos.map(t => {
      return {
        tipo: t,
        ocupados: leitos.filter(l => l.tipo === t && l.status === 'ocupado').length,
        total: leitos.filter(l => l.tipo === t).length
      }
    }));

    // Chart Produção
    setChartProd([
      { name: 'Atendimentos', valor: fPacientes.length },
      { name: 'Cirurgias', valor: 34 },
      { name: 'Exames', valor: 215 }
    ]);
  };

  const handleExportCSV = () => {
    let csv = "Nome;Status;Profissional\n";
    pacientes.forEach(p => { csv += `"${p.nome}";"${p.status}";"${p.profissional}"\n`; });
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'relatorio_pacientes.csv';
    a.click();
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
            <p style={{ opacity: 0.9, marginTop: '5px' }}>Indicadores hospitalares, ANS, CFM, gráficos e exportação</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-success" onClick={handleExportCSV} style={{ padding: '11px 22px', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}><i className="las la-file-excel"></i> Exportar Excel</button>
            <button className="btn btn-warning" onClick={handlePrint} style={{ padding: '11px 22px', background: '#f59e0b', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}><i className="las la-print"></i> Imprimir PDF</button>
          </div>
        </div>

        {/* FILTROS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
          {['hoje', 'semana', 'mes', 'ano', 'todos'].map(f => (
            <button key={f} onClick={() => aplicarFiltroRapido(f)} style={{ padding: '8px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: filtroRapido === f ? '#1e3a8a' : 'white', color: filtroRapido === f ? 'white' : '#64748b', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label style={{display:'block', fontSize:'12px', fontWeight:600, color:'#64748b', marginBottom:'4px'}}>Data Inicial</label><input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '8px' }} /></div>
          <div><label style={{display:'block', fontSize:'12px', fontWeight:600, color:'#64748b', marginBottom:'4px'}}>Data Final</label><input type="date" value={fim} onChange={e => setFim(e.target.value)} style={{ padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: '8px' }} /></div>
          <button onClick={gerarRelatorios} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', height: '42px' }}><i className="las la-sync-alt"></i> Atualizar</button>
        </div>

        {/* MINI CARDS (STATS GRID) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px', marginBottom: '25px' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '5px solid #1e3a8a', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px'}}><i className="las la-users"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.totalPacientes}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Total Pacientes</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '5px solid #16a34a', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px', color:'#16a34a'}}><i className="las la-check-circle"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.altas}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Altas</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '5px solid #f59e0b', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px', color:'#f59e0b'}}><i className="las la-clock"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.internacoes}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Internados</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '5px solid #dc2626', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px', color:'#dc2626'}}><i className="las la-cross"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.obitos}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Óbitos</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '5px solid #1e3a8a', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px'}}><i className="las la-bed"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.taxaUTI}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Taxa Ocup. UTI</div></div>
          <div style={{ background: 'white', borderRadius: '8px', padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', borderLeft: '5px solid #16a34a', textAlign: 'center' }}><div style={{fontSize:'28px', marginBottom:'6px', color:'#16a34a'}}><i className="las la-chart-line"></i></div><div style={{fontSize:'24px', fontWeight:800, color:'#0a1f44'}}>{data.tmp}</div><div style={{fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', fontWeight:600}}>Média Perm. (dias)</div></div>
        </div>

        {/* TAB MENU */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap' }}>
          {[
            { id: 'geral', icon: 'la-chart-pie', label: 'Dashboard Geral (Gráficos)' },
            { id: 'producao', icon: 'la-user-md', label: 'Produção Médica' },
            { id: 'leitos', icon: 'la-bed', label: 'Ocupação Leitos' },
            { id: 'ans', icon: 'la-file-medical', label: 'ANS / CFM' }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '13px 26px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: activeTab === t.id ? '#1e3a8a' : '#64748b', borderBottom: `3px solid ${activeTab === t.id ? '#1e3a8a' : 'transparent'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className={`las ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>

        {/* TAB GERAL */}
        {activeTab === 'geral' && (
          <div className="animate-in fade-in duration-300">
            {/* GRÁFICOS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px', marginBottom: '25px' }}>
              <div style={{ background: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                <h3 style={{ color: '#0a1f44', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-chart-bar"></i> Atendimentos por Mês</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartAtend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="atendimentos" fill="#3b82f6" radius={[6, 6, 0, 0]} />
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

              <div style={{ background: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                <h3 style={{ color: '#0a1f44', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-user-md"></i> Produção Médica Rápida</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartProd} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="valor" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* TABELAS DETALHADAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
              <div style={{ background: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', borderLeft: '5px solid #1e3a8a' }}>
                <h3 style={{ color: '#0a1f44', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-shield-virus"></i> CCIH & Qualidade</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>IRAS Notificadas</span><span style={{fontWeight:700, color:'#dc2626'}}>{data.iras}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Densidade Incidência IRAS</span><span style={{fontWeight:700, color:'#1e3a8a'}}>{data.taxaIRAS}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Adesão Higiene de Mãos</span><span style={{fontWeight:700, color:'#16a34a'}}>{data.hm}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Manifestações Ouvidoria</span><span style={{fontWeight:700, color:'#f59e0b'}}>{data.ouvidoria}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB PRODUCAO MEDICA */}
        {activeTab === 'producao' && (
          <div className="animate-in fade-in duration-300">
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    {['Profissional', 'Atendimentos', 'Cirurgias', 'Exames Solicitados', 'Total Procedimentos'].map(th => <th key={th} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{th}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(pacientes.map(p => p.profissional))).map((prof, i) => {
                    const atds = pacientes.filter(p => p.profissional === prof).length;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155', fontWeight: 'bold' }}>{prof}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>{atds}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>-</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>-</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#16a34a', fontWeight: 'bold' }}>{atds}</td>
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
            <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    {['Leito/Tipo', 'Ocupação (dias)', 'Taxa Ocupação', 'Giro de Leito', 'Média Permanência'].map(th => <th key={th} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{th}</th>)}
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
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>-</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>-</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB ANS */}
        {activeTab === 'ans' && (
          <div className="animate-in fade-in duration-300">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px' }}>
              <div style={{ background: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', borderLeft: '5px solid #1e3a8a' }}>
                <h3 style={{ color: '#0a1f44', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-file-medical"></i> Indicadores ANS</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Taxa de Ocupação Operacional</span><span style={{fontWeight:700, color:'#1e3a8a'}}>{data.taxaUTI}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Média de Permanência Geral</span><span style={{fontWeight:700, color:'#1e3a8a'}}>{data.tmp} dias</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Índice de Rotatividade</span><span style={{fontWeight:700, color:'#1e3a8a'}}>-</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Taxa de Cesáreas</span><span style={{fontWeight:700, color:'#1e3a8a'}}>-</span></div>
              </div>
              <div style={{ background: 'white', borderRadius: '8px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', borderLeft: '5px solid #f59e0b' }}>
                <h3 style={{ color: '#0a1f44', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="las la-user-md"></i> Indicadores CFM</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Consultas/Hora (Recomendado: 4)</span><span style={{fontWeight:700, color:'#f59e0b'}}>-</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Pacientes-dia</span><span style={{fontWeight:700, color:'#f59e0b'}}>{data.internacoes}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}><span style={{color:'#64748b'}}>Taxa de Suspensão Cirúrgica</span><span style={{fontWeight:700, color:'#f59e0b'}}>-</span></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
