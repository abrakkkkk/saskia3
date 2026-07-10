'use client';

import { useState, useEffect } from 'react';

interface Paciente {
  id: string;
  nome: string;
  cpf: string;
}

interface Receita {
  id: string;
  paciente: { nome: string; cpf: string };
  medicamentos: any;
  profissional: string;
  createdAt: string;
}

export default function ReceituarioPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [pacienteSelecionado, setPacienteSelecionado] = useState('');
  const [medicamento, setMedicamento] = useState('');
  const [posologia, setPosologia] = useState('');
  const [listaMedicamentos, setListaMedicamentos] = useState<{ nome: string; posologia: string }[]>([]);
  const [observacoes, setObservacoes] = useState('');

  const carregarDados = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/pacientes').then(res => res.json()),
      fetch('/api/receitas').then(res => res.json())
    ]).then(([pacs, recs]) => {
      setPacientes(pacs);
      setReceitas(recs);
      setLoading(false);
    });
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const adicionarMedicamento = () => {
    if (!medicamento || !posologia) return;
    setListaMedicamentos([...listaMedicamentos, { nome: medicamento, posologia }]);
    setMedicamento('');
    setPosologia('');
  };

  const removerMedicamento = (index: number) => {
    setListaMedicamentos(listaMedicamentos.filter((_, i) => i !== index));
  };

  const salvarReceita = async () => {
    if (!pacienteSelecionado || listaMedicamentos.length === 0) {
      alert('Selecione um paciente e adicione ao menos um medicamento.');
      return;
    }

    try {
      const res = await fetch('/api/receitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          medicamentos: listaMedicamentos,
          observacoes
        })
      });

      if (res.ok) {
        alert('Receita gerada com sucesso!');
        setPacienteSelecionado('');
        setListaMedicamentos([]);
        setObservacoes('');
        carregarDados();
      } else {
        alert('Erro ao gerar receita.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-file-medical"></i> Receituário Digital</h2>
          <p>Emissão e controle de prescrições médicas</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Formulário de Nova Receita */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Nova Prescrição</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' }}>Paciente</label>
              <select 
                className="input-field" 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                value={pacienteSelecionado}
                onChange={(e) => setPacienteSelecionado(e.target.value)}
              >
                <option value="">-- Selecione o Paciente --</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} (CPF: {p.cpf || 'N/A'})</option>
                ))}
              </select>
            </div>

            <div style={{ padding: '20px', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#334155' }}>Adicionar Medicamento</h4>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    placeholder="Nome do Medicamento (ex: Amoxicilina 500mg)" 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px' }}
                    value={medicamento}
                    onChange={(e) => setMedicamento(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Posologia (ex: Tomar 1 comprimido de 8 em 8 horas por 7 dias)" 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    value={posologia}
                    onChange={(e) => setPosologia(e.target.value)}
                  />
                </div>
                <button className="btn-primary" style={{ padding: '10px 20px', height: '84px' }} onClick={adicionarMedicamento}>
                  <i className="las la-plus" style={{ fontSize: '24px' }}></i>
                </button>
              </div>
            </div>

            {listaMedicamentos.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#334155' }}>Medicamentos Prescritos</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {listaMedicamentos.map((med, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 15px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{med.nome}</div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>{med.posologia}</div>
                      </div>
                      <button onClick={() => removerMedicamento(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '20px' }}>
                        <i className="las la-trash-alt"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px', fontWeight: 'bold' }}>Observações Gerais</label>
              <textarea 
                rows={3} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                placeholder="Instruções adicionais, dieta, repouso..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              ></textarea>
            </div>

            <button className="btn-primary" style={{ padding: '14px', fontSize: '16px', justifyContent: 'center' }} onClick={salvarReceita}>
              <i className="las la-print"></i> Gerar e Salvar Prescrição
            </button>
          </div>
        </div>

        {/* Histórico Recente */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Últimas Receitas</h3>
          
          {loading ? (
            <p>Carregando histórico...</p>
          ) : receitas.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center' }}>Nenhuma receita recente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {receitas.map(rec => (
                <div key={rec.id} style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#1e3a8a' }}>{rec.paciente.nome}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <i className="las la-user-md"></i> {rec.profissional}
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '8px', background: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
                    {Array.isArray(rec.medicamentos) ? rec.medicamentos.length : 0} medicamento(s) prescrito(s)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
