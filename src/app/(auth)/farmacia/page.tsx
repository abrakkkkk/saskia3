'use client';

import { useState, useEffect } from 'react';

interface EstoqueItem {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  minimo: number;
  lote: string | null;
  validade: string | null;
  fornecedor: string | null;
}

export default function FarmaciaPage() {
  const [medicamentos, setMedicamentos] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('mg');
  const [minimo, setMinimo] = useState('');
  const [lote, setLote] = useState('');
  const [validade, setValidade] = useState('');
  const [fornecedor, setFornecedor] = useState('');

  const carregarDados = () => {
    setLoading(true);
    fetch('/api/estoque?categoria=FARMACIA')
      .then(res => res.json())
      .then(data => {
        setMedicamentos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const cadastrarMedicamento = async () => {
    if (!nome || !quantidade) {
      alert('Preencha ao menos Nome e Quantidade.');
      return;
    }

    try {
      const res = await fetch('/api/estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: 'FARMACIA',
          nome,
          quantidade,
          unidade,
          minimo,
          lote,
          validade,
          fornecedor
        })
      });

      if (res.ok) {
        setNome(''); setQuantidade(''); setLote(''); setValidade(''); setFornecedor('');
        carregarDados();
      } else {
        alert('Erro ao cadastrar medicamento.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    }
  };

  const checarAlerta = (item: EstoqueItem) => {
    const isBaixoEstoque = item.quantidade <= item.minimo;
    const isVencendo = item.validade && new Date(item.validade).getTime() - new Date().getTime() < (30 * 24 * 60 * 60 * 1000); // 30 dias
    
    if (isBaixoEstoque) return <span className="status-badge bg-red-100 text-red-800">Estoque Crítico</span>;
    if (isVencendo) return <span className="status-badge bg-yellow-100 text-yellow-800">Próximo Vencimento</span>;
    return <span className="status-badge bg-green-100 text-green-800">Normal</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-pills"></i> Farmácia Central</h2>
          <p>Gestão de medicamentos, lotes e validades</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Formulário de Cadastro */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Entrada de Medicamento</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Nome da Droga</label>
              <input type="text" className="input-field" placeholder="Ex: Dipirona Sódica" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Quantidade</label>
                <input type="number" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Und.</label>
                <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="comp">comp</option>
                  <option value="amp">amp</option>
                  <option value="cx">cx</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Estoque Mínimo</label>
                <input type="number" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={minimo} onChange={(e) => setMinimo(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Lote</label>
                <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={lote} onChange={(e) => setLote(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Validade</label>
              <input type="date" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={validade} onChange={(e) => setValidade(e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Fornecedor</label>
              <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
            </div>

            <button className="btn-primary" style={{ justifyContent: 'center', padding: '12px', marginTop: '10px' }} onClick={cadastrarMedicamento}>
              <i className="las la-save"></i> Registrar Entrada
            </button>
          </div>
        </div>

        {/* Tabela de Estoque */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Inventário Ativo</h3>
          
          {loading ? (
            <p>Carregando inventário...</p>
          ) : medicamentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="las la-box-open" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
              <p>Nenhum medicamento em estoque.</p>
            </div>
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Medicamento</th>
                    <th>Qtd</th>
                    <th>Lote</th>
                    <th>Validade</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {medicamentos.map(med => (
                    <tr key={med.id}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>
                        {med.nome}
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Fornecedor: {med.fornecedor || 'N/I'}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>{med.quantidade}</span> <span style={{ fontSize: '12px', color: '#64748b' }}>{med.unidade}</span>
                      </td>
                      <td><span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{med.lote || 'N/A'}</span></td>
                      <td>{med.validade ? new Date(med.validade).toLocaleDateString() : 'N/A'}</td>
                      <td>{checarAlerta(med)}</td>
                      <td>
                        <button className="btn-icon" style={{ color: '#ef4444' }} title="Dar Baixa"><i className="las la-minus-circle"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
