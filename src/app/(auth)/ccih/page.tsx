'use client';

import { useState, useEffect } from 'react';

interface PacienteInfectado {
  id: string;
  nome: string;
  setor: string;
  leito: string;
  bacteria: string;
  isolamento: boolean;
  antibiotico: string;
  diasAntibiotico: number;
}

export default function CcihPage() {
  const [pacientes, setPacientes] = useState<PacienteInfectado[]>([
    { id: '1', nome: 'João da Silva', setor: 'UTI Adulto', leito: 'Leito 03', bacteria: 'KPC (Klebsiella pneumoniae)', isolamento: true, antibiotico: 'Polimixina B', diasAntibiotico: 7 },
    { id: '2', nome: 'Maria Oliveira', setor: 'Clínica Médica', leito: 'Quarto 201', bacteria: 'MRSA', isolamento: true, antibiotico: 'Vancomicina', diasAntibiotico: 12 },
    { id: '3', nome: 'Carlos Souza', setor: 'UTI Pediátrica', leito: 'Leito 01', bacteria: 'Acinetobacter baumannii', isolamento: true, antibiotico: 'Meropenem', diasAntibiotico: 3 },
  ]);

  const [loading, setLoading] = useState(false);
  const [showNovo, setShowNovo] = useState(false);

  // Form
  const [nome, setNome] = useState('');
  const [setor, setSetor] = useState('UTI Adulto');
  const [leito, setLeito] = useState('');
  const [bacteria, setBacteria] = useState('');
  const [isolamento, setIsolamento] = useState(true);
  const [antibiotico, setAntibiotico] = useState('');

  const registrarCaso = () => {
    if (!nome || !bacteria) return;
    const novo: PacienteInfectado = {
      id: Math.random().toString(),
      nome,
      setor,
      leito,
      bacteria,
      isolamento,
      antibiotico,
      diasAntibiotico: 1
    };
    setPacientes([...pacientes, novo]);
    setNome(''); setBacteria(''); setAntibiotico(''); setLeito('');
    setShowNovo(false);
  };

  const metricas = {
    totalCasos: pacientes.length,
    emIsolamento: pacientes.filter(p => p.isolamento).length,
    usoProlongado: pacientes.filter(p => p.diasAntibiotico > 10).length
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-microscope"></i> CCIH</h2>
          <p>Comissão de Controle de Infecção Hospitalar e Vigilância</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary"  onClick={() => setShowNovo(!showNovo)}>
            <i className="las la-exclamation-triangle"></i> Reportar Infecção
          </button>
        </div>
      </div>

      {showNovo && (
        <div className="card" style={{ marginBottom: '20px', padding: '20px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#991b1b' }}>Novo Caso Epidemiológico</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#7f1d1d', marginBottom: '5px' }}>Nome do Paciente</label>
              <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5' }} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#7f1d1d', marginBottom: '5px' }}>Bactéria / Patógeno</label>
              <input type="text" className="input-field" placeholder="Ex: KPC, VRE, MRSA" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5' }} value={bacteria} onChange={(e) => setBacteria(e.target.value)} />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#7f1d1d', marginBottom: '5px' }}>Setor</label>
              <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5' }} value={setor} onChange={(e) => setSetor(e.target.value)}>
                <option value="UTI Adulto">UTI Adulto</option>
                <option value="UTI Pediátrica">UTI Pediátrica</option>
                <option value="Clínica Médica">Clínica Médica</option>
                <option value="Centro Cirúrgico">Centro Cirúrgico</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#7f1d1d', marginBottom: '5px' }}>Leito</label>
              <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5' }} value={leito} onChange={(e) => setLeito(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#7f1d1d', marginBottom: '5px' }}>Antibiótico Iniciado</label>
              <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5' }} value={antibiotico} onChange={(e) => setAntibiotico(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 600 }}>
              <input type="checkbox" checked={isolamento} onChange={(e) => setIsolamento(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              Paciente em Isolamento de Contato
            </label>
            <button className="btn btn-primary" style={{ background: '#b91c1c', padding: '10px 20px' }} onClick={registrarCaso}>
              Registrar no CCIH
            </button>
          </div>
        </div>
      )}

      {/* Métricas de Alerta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="card-contador" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="contador-info">
            <span className="titulo">CASOS ATIVOS</span>
            <div className="valor" style={{ color: '#ef4444' }}>{metricas.totalCasos}</div>
          </div>
          <div className="contador-icone" style={{ background: '#fee2e2', color: '#ef4444' }}>
            <i className="las la-bug"></i>
          </div>
        </div>
        <div className="card-contador" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="contador-info">
            <span className="titulo">EM ISOLAMENTO</span>
            <div className="valor" style={{ color: '#f59e0b' }}>{metricas.emIsolamento}</div>
          </div>
          <div className="contador-icone" style={{ background: '#fef3c7', color: '#f59e0b' }}>
            <i className="las la-user-lock"></i>
          </div>
        </div>
        <div className="card-contador" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="contador-info">
            <span className="titulo">ATB PROLONGADO (&gt;10d)</span>
            <div className="valor" style={{ color: '#8b5cf6' }}>{metricas.usoProlongado}</div>
          </div>
          <div className="contador-icone" style={{ background: '#ede9fe', color: '#8b5cf6' }}>
            <i className="las la-prescription-bottle-alt"></i>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Monitoramento de Pacientes</h3>
        
        {loading ? (
          <p>Carregando mapa epidemiológico...</p>
        ) : pacientes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <i className="las la-shield-virus" style={{ fontSize: '48px', marginBottom: '10px', color: '#10b981' }}></i>
            <p>Nenhum caso de infecção hospitalar ativo.</p>
          </div>
        ) : (
          <div className="tabela-wrapper">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Paciente / Local</th>
                  <th>Patógeno (Bactéria)</th>
                  <th>Antibioticoterapia</th>
                  <th>Isolamento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map(p => (
                  <tr key={p.id} style={{ background: p.isolamento ? '#fef2f2' : 'white' }}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>{p.nome}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}><i className="las la-map-marker"></i> {p.setor} - {p.leito}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="las la-bug"></i> {p.bacteria}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.antibiotico}</div>
                      <div style={{ fontSize: '12px', color: p.diasAntibiotico > 10 ? '#ef4444' : '#64748b', fontWeight: p.diasAntibiotico > 10 ? 700 : 400 }}>
                        {p.diasAntibiotico} dias de uso
                      </div>
                    </td>
                    <td>
                      {p.isolamento ? (
                        <span className="status-badge bg-orange-100 text-orange-800 border border-orange-200">
                          <i className="las la-exclamation-circle"></i> Isolamento
                        </span>
                      ) : (
                        <span className="status-badge bg-gray-100 text-gray-600">Sem Isolamento</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', color: '#10b981', border: '1px solid #10b981' }} onClick={() => setPacientes(pacientes.filter(x => x.id !== p.id))}>
                        <i className="las la-check-circle"></i> Alta/Cura
                      </button>
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
