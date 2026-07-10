'use client';

import { useState, useEffect } from 'react';

interface EstoqueItem {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  minimo: number;
  fornecedor: string | null;
}

export default function AlmoxarifadoPage() {
  const [materiais, setMateriais] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('cx');
  const [minimo, setMinimo] = useState('');
  const [fornecedor, setFornecedor] = useState('');

  const carregarDados = () => {
    setLoading(true);
    fetch('/api/estoque?categoria=ALMOXARIFADO')
      .then(res => res.json())
      .then(data => {
        setMateriais(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const cadastrarMaterial = async () => {
    if (!nome || !quantidade) {
      alert('Preencha ao menos Nome e Quantidade.');
      return;
    }

    try {
      const res = await fetch('/api/estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria: 'ALMOXARIFADO',
          nome,
          quantidade,
          unidade,
          minimo,
          fornecedor
        })
      });

      if (res.ok) {
        setNome(''); setQuantidade(''); setMinimo(''); setFornecedor('');
        carregarDados();
      } else {
        alert('Erro ao cadastrar material.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    }
  };

  const checarAlerta = (item: EstoqueItem) => {
    if (item.quantidade <= item.minimo) {
      return <span className="status-badge bg-red-100 text-red-800"><i className="las la-exclamation-triangle"></i> Reposição Urgente</span>;
    }
    return <span className="status-badge bg-green-100 text-green-800">Estoque Normal</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="header-left">
          <h2><i className="las la-boxes"></i> Almoxarifado</h2>
          <p>Controle de insumos, materiais hospitalares e limpeza</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Entrada de Material</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Descrição do Material</label>
              <input type="text" className="input-field" placeholder="Ex: Luvas Cirúrgicas M" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Quantidade</label>
                <input type="number" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Und.</label>
                <select className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                  <option value="cx">cx</option>
                  <option value="un">un</option>
                  <option value="pct">pct</option>
                  <option value="l">litros</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Alerta de Estoque Mínimo</label>
              <input type="number" className="input-field" placeholder="Avisar quando chegar em..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={minimo} onChange={(e) => setMinimo(e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>Fornecedor</label>
              <input type="text" className="input-field" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
            </div>

            <button className="btn-primary" style={{ justifyContent: 'center', padding: '12px', marginTop: '10px' }} onClick={cadastrarMaterial}>
              <i className="las la-truck-loading"></i> Registrar Entrada
            </button>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', color: '#1e293b' }}>Inventário Ativo</h3>
          
          {loading ? (
            <p>Carregando almoxarifado...</p>
          ) : materiais.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="las la-clipboard-list" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
              <p>Nenhum material em estoque.</p>
            </div>
          ) : (
            <div className="tabela-wrapper">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Material / Fornecedor</th>
                    <th>Em Estoque</th>
                    <th>Status</th>
                    <th>Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {materiais.map(mat => (
                    <tr key={mat.id}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>
                        {mat.nome}
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Fornecedor: {mat.fornecedor || 'N/I'}</div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '16px', color: mat.quantidade <= mat.minimo ? '#dc2626' : '#16a34a' }}>
                          {mat.quantidade}
                        </span> <span style={{ fontSize: '12px', color: '#64748b' }}>{mat.unidade}</span>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Mínimo: {mat.minimo} {mat.unidade}</div>
                      </td>
                      <td>{checarAlerta(mat)}</td>
                      <td>
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', background: '#3b82f6' }}>
                          <i className="las la-dolly"></i> Retirar
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
    </div>
  );
}
