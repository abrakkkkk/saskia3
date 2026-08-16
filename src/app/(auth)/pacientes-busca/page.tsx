'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
  status: string;
  classificacao: string;
  leitoTipo?: string;
  leitoNumero?: string;
  nascimento?: string;
  telefone?: string;
  sexo?: string;
  endereco?: string;
  mae?: string;
}

export default function BuscarPacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    nome: '',
    cpf: '',
    mae: '',
    nascimento: '',
    telefone: '',
    sexo: '',
    endereco: '',
    status: ''
  });

  const [ordenacao, setOrdenacao] = useState<{ campo: keyof Paciente, direcao: 'asc'|'desc' }>({ campo: 'nome', direcao: 'asc' });

  useEffect(() => {
    fetch('/api/pacientes')
      .then(r => r.json())
      .then(data => {
        setPacientes(data);
        setCarregando(false);
      });
  }, []);

  const limparFiltros = () => {
    setFiltros({
      nome: '', cpf: '', mae: '', nascimento: '', telefone: '', sexo: '', endereco: '', status: ''
    });
  };

  const pacientesFiltrados = pacientes.filter(p => {
    if (filtros.nome && !p.nome.toLowerCase().includes(filtros.nome.toLowerCase())) return false;
    if (filtros.cpf && !p.cpf.replace(/\D/g, '').includes(filtros.cpf.replace(/\D/g, ''))) return false;
    if (filtros.mae && p.mae && !p.mae.toLowerCase().includes(filtros.mae.toLowerCase())) return false;
    if (filtros.telefone && p.telefone && !p.telefone.replace(/\D/g, '').includes(filtros.telefone.replace(/\D/g, ''))) return false;
    if (filtros.sexo && p.sexo !== filtros.sexo) return false;
    if (filtros.endereco && p.endereco && !p.endereco.toLowerCase().includes(filtros.endereco.toLowerCase())) return false;
    if (filtros.status && p.status !== filtros.status) return false;
    if (filtros.nascimento) {
      const dataFiltro = filtros.nascimento.split('T')[0];
      const dataPac = p.nascimento ? new Date(p.nascimento).toISOString().split('T')[0] : '';
      if (dataFiltro !== dataPac) return false;
    }
    return true;
  }).sort((a, b) => {
    const valA = a[ordenacao.campo] || '';
    const valB = b[ordenacao.campo] || '';
    if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1;
    if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1;
    return 0;
  });

  const handleOrdenacao = (campo: keyof Paciente) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportarCSV = () => {
    const cabecalho = "Nome,CPF,Nascimento,Sexo,Status,Classificação\n";
    const linhas = pacientesFiltrados.map(p => 
      `"${p.nome}","${p.cpf}","${p.nascimento ? new Date(p.nascimento).toLocaleDateString() : ''}","${p.sexo || ''}","${p.status}","${p.classificacao}"`
    ).join("\n");
    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "busca_pacientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const STATUS_CORES: Record<string, string> = {
    'Recepção': 'bg-slate-100 text-slate-700',
    'Aguardando Triagem': 'bg-amber-100 text-amber-700',
    'Em Triagem': 'bg-blue-100 text-blue-700',
    'Internado': 'bg-pink-100 text-pink-700',
    'Alta Médica': 'bg-green-100 text-green-700',
    'Óbito': 'bg-slate-800 text-slate-100',
    'Evasão': 'bg-red-100 text-red-700'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0a1f44, #1e3a8a)', borderRadius: '8px', padding: '30px 40px', color: 'white', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: 0 }}><i className="las la-search"></i> Busca Avançada de Pacientes</h1>
          <p style={{ opacity: 0.9, margin: '5px 0 0 0', fontSize: '14px' }}>Pesquise pacientes cadastrados por qualquer critério - histórico completo sempre disponível</p>
        </div>
        <div>
          <button onClick={exportarCSV} style={{ padding: '12px 24px', background: '#0891b2', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="las la-download"></i> Exportar
          </button>
        </div>
      </div>

      {/* Painel de Filtros */}
      <div className="card" style={{ padding: '30px', marginBottom: '25px' }}>
        <h3 style={{ color: '#0a1f44', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', fontSize: '18px' }}>
          <i className="las la-filter"></i> Filtros de Pesquisa
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}><i className="las la-user"></i> Nome</label>
            <input type="text" className="input-field" value={filtros.nome} onChange={e => setFiltros({...filtros, nome: e.target.value})} placeholder="Nome completo ou parte" style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '2px solid #e2e8f0' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}><i className="las la-id-card"></i> CPF</label>
            <input type="text" className="input-field" value={filtros.cpf} onChange={e => setFiltros({...filtros, cpf: e.target.value})} placeholder="000.000.000-00" style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '2px solid #e2e8f0' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}><i className="las la-female"></i> Nome da Mãe</label>
            <input type="text" className="input-field" value={filtros.mae} onChange={e => setFiltros({...filtros, mae: e.target.value})} placeholder="Nome da mãe" style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '2px solid #e2e8f0' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}><i className="las la-calendar"></i> Nascimento</label>
            <input type="date" className="input-field" value={filtros.nascimento} onChange={e => setFiltros({...filtros, nascimento: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '2px solid #e2e8f0' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}><i className="las la-phone"></i> Telefone</label>
            <input type="text" className="input-field" value={filtros.telefone} onChange={e => setFiltros({...filtros, telefone: e.target.value})} placeholder="(00) 00000-0000" style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '2px solid #e2e8f0' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}><i className="las la-venus-mars"></i> Sexo</label>
            <select className="input-field" value={filtros.sexo} onChange={e => setFiltros({...filtros, sexo: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '2px solid #e2e8f0' }}>
              <option value="">Todos</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}><i className="las la-map-marker"></i> Cidade/Endereço</label>
            <input type="text" className="input-field" value={filtros.endereco} onChange={e => setFiltros({...filtros, endereco: e.target.value})} placeholder="Cidade ou rua" style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '2px solid #e2e8f0' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}><i className="las la-flag"></i> Status</label>
            <select className="input-field" value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})} style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '2px solid #e2e8f0' }}>
              <option value="">Todos os Status</option>
              <option value="Recepção">Recepção</option>
              <option value="Aguardando Triagem">Aguardando Triagem</option>
              <option value="Em Triagem">Em Triagem</option>
              <option value="Internado">Internado</option>
              <option value="Alta Médica">Alta Médica</option>
              <option value="Óbito">Óbito</option>
              <option value="Evasão">Evasão</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '15px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', marginRight: '8px', fontWeight: 600, display: 'flex', alignItems: 'center' }}>Buscas rápidas:</span>
          <button onClick={() => setFiltros({...filtros, status: 'Internado'})} style={{ background: '#eff6ff', color: '#1e3a8a', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', border: '1px solid transparent', fontWeight: 600, cursor: 'pointer' }}>🏥 Internados</button>
          <button onClick={() => setFiltros({...filtros, status: 'Alta Médica'})} style={{ background: '#eff6ff', color: '#1e3a8a', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', border: '1px solid transparent', fontWeight: 600, cursor: 'pointer' }}>✅ Altas</button>
          <button onClick={() => setFiltros({...filtros, status: 'Óbito'})} style={{ background: '#eff6ff', color: '#1e3a8a', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', border: '1px solid transparent', fontWeight: 600, cursor: 'pointer' }}>🕊️ Óbitos</button>
          <button onClick={() => setFiltros({...filtros, status: 'Evasão'})} style={{ background: '#eff6ff', color: '#1e3a8a', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', border: '1px solid transparent', fontWeight: 600, cursor: 'pointer' }}>🚫 Evasões</button>
          <button onClick={limparFiltros} style={{ background: '#f8fafc', color: '#64748b', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0', fontWeight: 600, cursor: 'pointer' }}>🔄 Limpar Filtros</button>
        </div>
      </div>

      {/* Resultados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', color: '#64748b' }}><i className="las la-users"></i> <strong style={{ color: '#0a1f44' }}>{pacientesFiltrados.length}</strong> paciente(s) encontrado(s)</div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {carregando ? (
          <div style={{ padding: '40px', textAlign: 'center' }}><i className="las la-spinner la-spin" style={{ fontSize: '40px', color: '#1e3a8a' }}></i></div>
        ) : pacientesFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
            <i className="las la-search" style={{ fontSize: '64px', marginBottom: '15px', opacity: 0.3 }}></i>
            <p>Nenhum paciente encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#0f172a' }}>
                <tr>
                  <th onClick={() => handleOrdenacao('nome')} style={{ padding: '15px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', cursor: 'pointer' }}>Paciente <i className="las la-sort"></i></th>
                  <th onClick={() => handleOrdenacao('cpf')} style={{ padding: '15px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', cursor: 'pointer' }}>CPF <i className="las la-sort"></i></th>
                  <th style={{ padding: '15px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Sexo</th>
                  <th style={{ padding: '15px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Nascimento</th>
                  <th style={{ padding: '15px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '15px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {pacientesFiltrados.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#0a1f44', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a', fontWeight: 700, fontSize: '14px' }}>
                        {p.nome.charAt(0)}
                      </div>
                      {p.nome}
                    </td>
                    <td style={{ padding: '14px', fontSize: '13px', color: '#334155' }}>{p.cpf || 'N/I'}</td>
                    <td style={{ padding: '14px', fontSize: '13px', color: '#334155' }}>{p.sexo || 'N/I'}</td>
                    <td style={{ padding: '14px', fontSize: '13px', color: '#334155' }}>{p.nascimento ? new Date(p.nascimento).toLocaleDateString() : 'N/I'}</td>
                    <td style={{ padding: '14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }} className={STATUS_CORES[p.status] || STATUS_CORES['Recepção']}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>
                      <Link href={`/pacientes/${p.id}`} style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e3a8a', fontWeight: 600, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                        <i className="las la-folder-open"></i> Ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
